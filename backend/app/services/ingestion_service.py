from app.models.entities import Material
from app.services.normalization_service import normalize
from app.services.extraction_service import extract_attributes
from app.services.fingerprint_service import fingerprint


def add_material(db, cpse, data: dict, source_file=None):
    code = str(data.get("legacy_material_code", data.get("material_code", ""))).strip()
    desc = str(data.get("original_description", data.get("description", ""))).strip()
    if not code or not desc: raise ValueError("legacy_material_code and original_description are required")
    norm = normalize(desc); attrs = extract_attributes(desc)
    row = Material(cpse_id=cpse.id, legacy_material_code=code, original_description=desc,
                   normalized_description=norm, category=data.get("category") or attrs.get("category"),
                   material=data.get("material") or attrs.get("material"), grade=data.get("grade") or attrs.get("grade"),
                   dimensions={k:v for k,v in attrs.items() if k in ("dimensions", "diameter", "length")},
                   unit=data.get("unit", "EA"), manufacturer=data.get("manufacturer"), brand=data.get("brand"),
                   model=data.get("model") or attrs.get("model"), specification=data.get("specification"),
                   plant=data.get("plant"), fingerprint=fingerprint(desc, data.get("unit", "EA")), source_file=source_file)
    db.add(row); db.flush(); return row
