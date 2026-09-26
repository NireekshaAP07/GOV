from app.services.normalization_service import normalize
from app.services.extraction_service import extract_attributes
from app.services.fingerprint_service import fingerprint
from app.services.matching_service import score_pair

def test_normalization_bolt_aliases_and_dimensions():
    canonical=normalize("HEX BOLT M16X50 SS304")
    assert canonical == normalize("HEXAGONAL HEAD BOLT M16 x 50 STAINLESS STEEL 304")
    assert canonical.endswith("STAINLESS_STEEL_304")
    variant=normalize("S.S.304 HEX BOLT M16*50")
    assert "STAINLESS_STEEL_304" in variant and "M16 X 50MM" in variant

def test_extraction_and_fingerprint():
    attrs=extract_attributes("HEX BOLT M16X50 SS304")
    assert attrs["grade"] == "SS304" and attrs["diameter"] == "M16" and attrs["length"] == "50MM"
    assert fingerprint("HEX BOLT M16X50 SS304")["unit"] == "EA"

def test_equivalent_bolt_descriptions_score_high():
    a={"normalized_description":normalize("HEX BOLT M16X50 SS304"),"fingerprint":fingerprint("HEX BOLT M16X50 SS304")}
    b={"normalized_description":normalize("SS304 HEX HEAD BOLT M16 50MM"),"fingerprint":fingerprint("SS304 HEX HEAD BOLT M16 50MM")}
    result=score_pair(a,b)
    assert result["final_score"] >= .8 and not result["conflicting_features"]

def test_critical_technical_conflicts_block_merging():
    for left,right,key in [("BOLT M16X50 SS304","BOLT M16X50 SS316","grade"),("BOLT M16X50 SS304","BOLT M16X100 SS304","length"),("PUMP 415V","PUMP 230V","voltage")]:
        a={"normalized_description":normalize(left),"fingerprint":fingerprint(left)}
        b={"normalized_description":normalize(right),"fingerprint":fingerprint(right)}
        result=score_pair(a,b)
        assert key in result["conflicting_features"] and result["final_score"] < .6
