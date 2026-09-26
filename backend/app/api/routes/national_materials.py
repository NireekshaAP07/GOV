from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import NationalMaterial

router=APIRouter(prefix="/national-materials",tags=["national materials"])


@router.get("/{material_id}")
def get_national(material_id:int,db:Session=Depends(get_db)):
    row=db.get(NationalMaterial,material_id)
    if not row: raise HTTPException(404,"National material not found")
    return row


@router.get("")
def list_national(db:Session=Depends(get_db)):
    return db.scalars(select(NationalMaterial).order_by(NationalMaterial.id)).all()
