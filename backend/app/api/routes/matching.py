from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import require_role
from app.models.entities import Material, MaterialMatch, Review, User
from app.schemas.matching import MatchInput
from app.services.matching_service import candidates, score_pair

router=APIRouter(prefix="/materials",tags=["matching"])


def to_dict(m): return {"fingerprint":m.fingerprint,"normalized_description":m.normalized_description}


@router.post("/match")
def match_pair(body:MatchInput,db:Session=Depends(get_db)):
    a,b=db.get(Material,body.material_a_id),db.get(Material,body.material_b_id)
    if not a or not b: raise HTTPException(404,"Material not found")
    result=score_pair(to_dict(a),to_dict(b)); return {"material_a":a.id,"material_b":b.id,**result}


@router.post("/recommend")
def recommend(db:Session=Depends(get_db), _user: User | None = Depends(require_role("ADMIN", "REVIEWER"))):
    items=[to_dict(m)|{"id":m.id} for m in db.scalars(select(Material)).all()]
    recommendations=[]
    for a,b,result in candidates(items):
        if result["final_score"]>=settings.confidence_thresholds.get("investigate",.60) or result["conflicting_features"]:
            pair=sorted((a["id"],b["id"]))
            existing=db.scalar(select(MaterialMatch).where(MaterialMatch.material_a_id==pair[0],MaterialMatch.material_b_id==pair[1]))
            if not existing:
                row=MaterialMatch(material_a_id=pair[0],material_b_id=pair[1],classification=result["classification"],status="PENDING",
                    explanation=result["explanation"],matching_features=result["matching_features"],conflicting_features=result["conflicting_features"],
                    final_score=result["final_score"],**{k:result[k] for k in ("semantic_score","attribute_score","specification_score","category_score","unit_score","procurement_score")})
                db.add(row); db.flush(); existing=row
                db.add(Review(match_id=row.id, decision="PENDING"))
            recommendations.append({"match_id":existing.id,"material_a":a["id"],"material_b":b["id"],**result})
    db.commit(); return {"count":len(recommendations),"recommendations":recommendations}
