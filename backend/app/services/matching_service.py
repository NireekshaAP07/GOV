from itertools import combinations
from rapidfuzz import fuzz
from app.core.config import settings
from app.services.normalization_service import normalize

CRITICAL = ("grade", "diameter", "length", "voltage", "current", "power", "pressure_rating", "temperature_rating", "model", "standard")


def score_pair(a: dict, b: dict) -> dict:
    fa, fb = a.get("fingerprint", {}), b.get("fingerprint", {})
    da, db = normalize(a.get("normalized_description") or a.get("description", "")), normalize(b.get("normalized_description") or b.get("description", ""))
    semantic = fuzz.token_set_ratio(da, db) / 100
    common = set(fa) | set(fb)
    comparable = [k for k in common if k != "unit" and fa.get(k) is not None and fb.get(k) is not None]
    matched = [k for k in comparable if fa[k] == fb[k]]
    conflicts = {k: {"a": fa[k], "b": fb[k]} for k in CRITICAL if fa.get(k) and fb.get(k) and fa[k] != fb[k]}
    attributes = len(matched) / max(1, len(comparable))
    spec_keys = [k for k in CRITICAL if fa.get(k) is not None and fb.get(k) is not None]
    specification = sum(fa[k] == fb[k] for k in spec_keys) / max(1, len(spec_keys))
    category = float(fa.get("category") == fb.get("category") and bool(fa.get("category")))
    unit = float(fa.get("unit") == fb.get("unit"))
    weights = settings.matching_weights
    parts = {"semantic": semantic, "attributes": attributes, "specification": specification, "category": category, "unit": unit, "procurement": 0.0}
    final = sum(parts[k] * weights.get(k, 0) for k in parts) / max(.0001, sum(weights.get(k, 0) for k in parts))
    if da == db and not conflicts:
        final = 1.0
    thresholds=settings.confidence_thresholds
    if conflicts:
        final = min(final, thresholds.get("investigate", .60) - .01)
        classification = "NON_MATCH"
    elif final >= thresholds.get("strong", .95):
        classification = "EXACT_MATCH" if da == db else "FUNCTIONALLY_EQUIVALENT"
    elif final >= thresholds.get("review", .80): classification = "NEAR_DUPLICATE"
    elif final >= thresholds.get("investigate", .60): classification = "RELATED"
    else: classification = "NON_MATCH"
    matching = {k: [fa.get(k), fb.get(k)] for k in matched}
    return {"semantic_score": semantic, "attribute_score": attributes, "specification_score": specification, "category_score": category, "unit_score": unit, "procurement_score": 0.0, "final_score": round(final, 4), "classification": classification,
            "conflicting_features": conflicts, "matching_features": matching,
            "explanation": "Critical technical conflicts prevent automatic equivalence." if conflicts else f"Matched attributes: {', '.join(matched) or 'description tokens only'}. Similarity {final:.0%}."}


def candidates(materials: list[dict], per_material_limit: int = 8):
    # Inverted token blocking avoids an all-pairs scan. Keep technical tokens such
    # as grades, dimensions and ratings in the index so likely variants are compared.
    postings = {}
    normalized = {}
    for item in materials:
        text = normalize(item.get("normalized_description") or item.get("description", ""))
        normalized[item.get("id", id(item))] = text
        tokens = set(text.split())
        for token in tokens:
            if len(token) > 1:
                postings.setdefault(token, set()).add(item.get("id", id(item)))
    by_id = {item.get("id", id(item)): item for item in materials}
    pairs = set()
    for matching_ids in postings.values():
        ids = sorted(matching_ids)
        for i, left in enumerate(ids):
            for right in ids[i+1:]:
                a,b=by_id[left],by_id[right]
                fa,fb=a.get("fingerprint",{}),b.get("fingerprint",{})
                if fa.get("category") and fb.get("category") and fa["category"] != fb["category"]:
                    continue
                pairs.add((left,right))
    best = {}
    for left,right in pairs:
        a,b=by_id[left],by_id[right]
        result=score_pair(a,b)
        best.setdefault(left,[]).append((result["final_score"],right,a,b,result))
        best.setdefault(right,[]).append((result["final_score"],left,a,b,result))
    selected={}
    seen_conflict_signatures=set()
    for values in best.values():
        ranked=sorted(values,key=lambda value:(-value[0],value[1]))
        for _,__,a,b,result in {id(v): v for v in ranked[:per_material_limit]}.values():
            left,right=sorted((a.get("id",id(a)),b.get("id",id(b))))
            selected[(left,right)]=result
        # A genuine spec conflict (e.g. SS304 vs SS316) is by design scored
        # low, so it can be crowded out of the per-material top-K by many
        # higher-scoring true duplicates once the corpus is large -- exactly
        # the failure mode a reviewer must never hit. We always keep at least
        # one representative pair per DISTINCT conflicting description
        # combination (not every raw id pair), so a genuine conflict category
        # is never silently dropped without also flooding the review queue
        # with thousands of near-identical repeats of the same conflict.
        for _,__,a,b,result in ranked:
            if not result["conflicting_features"]: continue
            left,right=sorted((a.get("id",id(a)),b.get("id",id(b))))
            signature=tuple(sorted((normalized[left],normalized[right])))
            if signature in seen_conflict_signatures: continue
            seen_conflict_signatures.add(signature)
            selected[(left,right)]=result
    for (left,right),result in sorted(selected.items()):
        yield by_id[left],by_id[right],result
