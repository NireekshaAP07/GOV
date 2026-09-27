import hashlib
from io import BytesIO
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from rapidfuzz import fuzz
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_role
from app.models.entities import CPSE, Material, MaterialMapping, NationalMaterial, User
from app.schemas.material import MaterialInput, MaterialOut
from app.services.ingestion_service import add_material
from app.services.normalization_service import normalize

router = APIRouter(prefix="/materials", tags=["materials"])


@router.post("/import")
async def import_materials(file: UploadFile = File(...), cpse_code: str = Query(...), cpse_name: str | None = Query(None),
                           db: Session = Depends(get_db), _user: User | None = Depends(require_role("ADMIN", "REVIEWER"))):
    name = file.filename or ""
    if not name.lower().endswith((".csv", ".xlsx", ".xls")): raise HTTPException(415, "Upload a CSV or Excel file")
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_bytes // (1024*1024)} MB upload limit")
    if not content: raise HTTPException(422, "Uploaded file is empty")
    digest = hashlib.sha256(content).hexdigest()
    if db.scalar(select(Material.id).where(Material.source_file == f"{name}:{digest}")):
        raise HTTPException(409, "This file has already been imported")
    try:
        frame = pd.read_csv(BytesIO(content)) if name.lower().endswith(".csv") else pd.read_excel(BytesIO(content))
    except Exception as exc: raise HTTPException(422, f"Could not read file: {exc}")
    frame.columns = [str(c).strip().lower() for c in frame.columns]
    aliases = {"material_code":"legacy_material_code", "code":"legacy_material_code", "description":"original_description"}
    frame = frame.rename(columns=aliases)
    required = {"legacy_material_code", "original_description"}
    missing = required - set(frame.columns)
    if missing: raise HTTPException(422, {"message":"Missing required columns", "missing_columns":sorted(missing)})
    cpse = db.scalar(select(CPSE).where(CPSE.code == cpse_code))
    if not cpse:
        cpse = CPSE(code=cpse_code, name=cpse_name or cpse_code); db.add(cpse); db.flush()
    inserted, errors = [], []
    seen_codes=set()
    for index, row in frame.iterrows():
        data = row.where(pd.notna(row), None).to_dict()
        try:
            if not data.get("legacy_material_code") or not data.get("original_description"): raise ValueError("missing code or description")
            legacy=str(data["legacy_material_code"]).strip()
            if legacy in seen_codes: raise ValueError(f"duplicate legacy_material_code in upload: {legacy}")
            if db.scalar(select(Material.id).where(Material.cpse_id==cpse.id,Material.legacy_material_code==legacy)):
                raise ValueError(f"legacy_material_code already exists for CPSE: {legacy}")
            seen_codes.add(legacy)
            inserted.append(add_material(db, cpse, data, source_file=f"{name}:{digest}").id)
        except Exception as exc: errors.append({"row":int(index)+2, "error":str(exc)})
    db.commit()
    return {"cpse_code":cpse.code, "file":name, "file_sha256":digest, "imported":len(inserted), "material_ids":inserted, "errors":errors}


@router.post("", response_model=MaterialOut, status_code=201)
def create_material(body: MaterialInput, cpse_code: str = Query(...), cpse_name: str | None = Query(None),
                    db: Session = Depends(get_db), _user: User | None = Depends(require_role("ADMIN", "REVIEWER"))):
    cpse = db.scalar(select(CPSE).where(CPSE.code == cpse_code))
    if not cpse:
        cpse = CPSE(code=cpse_code, name=cpse_name or cpse_code); db.add(cpse); db.flush()
    if db.scalar(select(Material.id).where(Material.cpse_id == cpse.id, Material.legacy_material_code == body.legacy_material_code)):
        raise HTTPException(409, "Legacy material code already exists for this CPSE")
    result = add_material(db, cpse, body.model_dump()); db.commit(); db.refresh(result); return result


@router.get("")
def list_materials(cpse: str | None = None, category: str | None = None, material: str | None = None,
                   grade: str | None = None, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200),
                   db: Session = Depends(get_db)):
    """Paginated, filterable browse of the full source-material corpus (Material Explorer)."""
    stmt = select(Material, CPSE).join(CPSE)
    if cpse: stmt = stmt.where(CPSE.code == cpse)
    if category: stmt = stmt.where(Material.category == category)
    if material: stmt = stmt.where(Material.material == material)
    if grade: stmt = stmt.where(Material.grade == grade)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.execute(stmt.order_by(Material.id).offset((page - 1) * page_size).limit(page_size)).all()
    items = []
    for m, c in rows:
        mapping = db.scalar(select(MaterialMapping).where(MaterialMapping.cpse_id == c.id, MaterialMapping.legacy_material_code == m.legacy_material_code))
        nm = db.get(NationalMaterial, mapping.national_material_id) if mapping else None
        items.append({"material": MaterialOut.model_validate(m).model_dump(), "cpse": {"code": c.code, "name": c.name},
                     "national_material": ({"national_code": nm.national_code, "approval_status": nm.approval_status} if nm else None),
                     "mapping": ({"confidence": mapping.mapping_confidence, "status": mapping.mapping_status} if mapping else None)})
    return {"page": page, "page_size": page_size, "total": total, "total_pages": max(1, -(-total // page_size)), "items": items}


@router.get("/search")
def search(q: str, cpse: str | None = None, category: str | None = None, material: str | None = None,
          grade: str | None = None, unit: str | None = None, national_code: str | None = None,
          approval_status: str | None = None, confidence: float | None = None, db: Session = Depends(get_db)):
    stmt = select(Material, CPSE).join(CPSE)
    if cpse: stmt = stmt.where(CPSE.code == cpse)
    if category: stmt = stmt.where(Material.category == category)
    if material: stmt = stmt.where(Material.material == material)
    if grade: stmt = stmt.where(Material.grade == grade)
    if unit: stmt = stmt.where(Material.unit == unit)
    rows = db.execute(stmt).all(); query = normalize(q)
    scored = [(fuzz.token_set_ratio(query, normalize(m.normalized_description)), m, c) for m,c in rows]
    scored = sorted((x for x in scored if x[0] >= 35), reverse=True, key=lambda x:x[0])[:50]
    output=[]
    for score,m,c in scored:
        mapping = db.scalar(select(MaterialMapping).where(MaterialMapping.cpse_id==c.id, MaterialMapping.legacy_material_code==m.legacy_material_code))
        nm = db.get(NationalMaterial, mapping.national_material_id) if mapping else None
        if national_code and (not nm or nm.national_code != national_code): continue
        if approval_status and (not nm or nm.approval_status != approval_status): continue
        if confidence is not None and (not mapping or mapping.mapping_confidence < confidence): continue
        output.append({"material":MaterialOut.model_validate(m).model_dump(), "cpse":{"code":c.code,"name":c.name}, "similarity":round(score/100,4),
                       "national_material":({"national_code":nm.national_code,"standard_description":nm.standard_description,"approval_status":nm.approval_status} if nm else None),
                       "mapping":({"confidence":mapping.mapping_confidence,"status":mapping.mapping_status} if mapping else None)})
    return {"query":q,"results":output}


@router.get("/{material_id}", response_model=MaterialOut)
def get_material(material_id: int, db: Session = Depends(get_db)):
    row=db.get(Material,material_id)
    if not row: raise HTTPException(404,"Material not found")
    return row
