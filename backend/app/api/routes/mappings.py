from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import MaterialMapping, NationalMaterial, CPSE

router=APIRouter(prefix="/mappings",tags=["mappings"])


@router.get("/{national_code}")
def mappings(national_code:str,db:Session=Depends(get_db)):
    nm=db.scalar(select(NationalMaterial).where(NationalMaterial.national_code==national_code))
    if not nm: return {"national_code":national_code,"mappings":[]}
    rows=db.execute(select(MaterialMapping,CPSE).join(CPSE,CPSE.id==MaterialMapping.cpse_id).where(MaterialMapping.national_material_id==nm.id)).all()
    return {"national_code":national_code,"mappings":[{"cpse_code":c.code,"cpse_name":c.name,"legacy_material_code":m.legacy_material_code,"original_description":m.original_description,"confidence":m.mapping_confidence,"status":m.mapping_status} for m,c in rows]}
