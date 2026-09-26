from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Material, MaterialMatch, Review, AuditLog, CPSE, MaterialMapping, NationalMaterial, ProcurementRecord
from app.schemas.review import ReviewDecision
from app.services.national_code_service import create_national_material

router=APIRouter(prefix="/reviews",tags=["reviews"])


@router.get("/pending")
def pending(db:Session=Depends(get_db)):
    rows=db.execute(select(Review,MaterialMatch).join(MaterialMatch,Review.match_id==MaterialMatch.id).where(Review.decision=="PENDING",MaterialMatch.status=="PENDING")).all()
    result=[]
    for review,match in rows:
        a,b=db.get(Material,match.material_a_id),db.get(Material,match.material_b_id)
        result.append({"review_id":review.id,"match":match,"material_a":a,"material_b":b,"recommendation":match.classification,
                       "procurement_context":{"material_a_records":db.query(ProcurementRecord).filter_by(material_id=a.id).count(),
                                               "material_b_records":db.query(ProcurementRecord).filter_by(material_id=b.id).count()}})
    return result


def decide(review_id:int, decision:str, body:ReviewDecision, db:Session):
    review=db.get(Review,review_id)
    if not review: raise HTTPException(404,"Review not found")
    match=db.get(MaterialMatch,review.match_id)
    if not match or match.status!="PENDING": raise HTTPException(409,"Match is not pending review")
    review.decision=decision; review.reviewer=body.reviewer; review.comments=body.comments
    match.status="APPROVE" if decision in ("APPROVE","MODIFY") else decision
    a,b=db.get(Material,match.material_a_id),db.get(Material,match.material_b_id)
    if decision in ("APPROVE","MODIFY"):
        existing_mapping=next((db.scalar(select(MaterialMapping).where(MaterialMapping.cpse_id==m.cpse_id,MaterialMapping.legacy_material_code==m.legacy_material_code)) for m in (a,b) if db.scalar(select(MaterialMapping).where(MaterialMapping.cpse_id==m.cpse_id,MaterialMapping.legacy_material_code==m.legacy_material_code))),None)
        nm=db.get(NationalMaterial,existing_mapping.national_material_id) if existing_mapping else None
        if nm is None: nm=next((x for x in db.scalars(select(NationalMaterial)).all() if x.technical_attributes==a.fingerprint),None)
        if nm is None: nm=create_national_material(db,a,a.fingerprint)
        if decision=="MODIFY" and body.standard_description:
            nm.standard_description=body.standard_description; nm.version+=1
        for material in (a,b):
            cpse=db.get(CPSE,material.cpse_id)
            mapping=db.scalar(select(MaterialMapping).where(MaterialMapping.cpse_id==cpse.id,MaterialMapping.legacy_material_code==material.legacy_material_code))
            if mapping:
                mapping.national_material_id=nm.id; mapping.mapping_status="APPROVED"; mapping.version+=1; mapping.approved_by=body.reviewer; mapping.approved_at=datetime.now(timezone.utc)
            else:
                db.add(MaterialMapping(cpse_id=cpse.id,legacy_material_code=material.legacy_material_code,national_material_id=nm.id,
                    original_description=material.original_description,standard_description=body.standard_description or nm.standard_description,
                    mapping_confidence=match.final_score,mapping_status="APPROVED",approved_by=body.reviewer,approved_at=datetime.now(timezone.utc)))
    db.add(AuditLog(entity_type="MaterialMatch",entity_id=str(match.id),action=decision,user=body.reviewer,details={"comments":body.comments,"material_ids":[a.id,b.id]}))
    db.commit(); return {"review_id":review.id,"decision":decision,"national_code":nm.national_code if decision in ("APPROVE","MODIFY") else None}


@router.post("/{review_id}/approve")
def approve(review_id:int,body:ReviewDecision,db:Session=Depends(get_db)): return decide(review_id,"APPROVE",body,db)


@router.post("/{review_id}/reject")
def reject(review_id:int,body:ReviewDecision,db:Session=Depends(get_db)): return decide(review_id,"REJECT",body,db)


@router.post("/{review_id}/modify")
def modify(review_id:int,body:ReviewDecision,db:Session=Depends(get_db)):
    # A modification remains a human decision and applies through the same audited approval path.
    if not body.standard_description: raise HTTPException(422,"standard_description is required")
    return decide(review_id,"MODIFY",body,db)


@router.post("/{review_id}/escalate")
def escalate(review_id:int,body:ReviewDecision,db:Session=Depends(get_db)):
    review=db.get(Review,review_id)
    if not review: raise HTTPException(404,"Review not found")
    review.decision="ESCALATE"; review.reviewer=body.reviewer; review.comments=body.comments
    db.add(AuditLog(entity_type="Review",entity_id=str(review.id),action="ESCALATE",user=body.reviewer,details={"comments":body.comments})); db.commit()
    return {"review_id":review.id,"decision":"ESCALATE"}
