from collections import Counter
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.core.database import get_db
from app.models.entities import CPSE, Material, MaterialMapping, MaterialMatch, NationalMaterial, Review, ProcurementRecord
from app.services.clustering_service import clusters

router=APIRouter(prefix="/analytics",tags=["analytics"])


@router.get("/dashboard")
def dashboard(db:Session=Depends(get_db)):
    total=db.scalar(select(func.count(Material.id))) or 0; national=db.scalar(select(func.count(NationalMaterial.id))) or 0
    pending=db.scalar(select(func.count(MaterialMatch.id)).where(MaterialMatch.status=="PENDING")) or 0
    mapped=db.scalar(select(func.count(MaterialMapping.id))) or 0; matches=db.scalar(select(func.count(MaterialMatch.id)).where(MaterialMatch.final_score>=.8)) or 0
    cpse=db.execute(select(CPSE.code,func.count(Material.id)).join(Material,Material.cpse_id==CPSE.id).group_by(CPSE.code)).all()
    cats=db.execute(select(Material.category,func.count(Material.id)).group_by(Material.category)).all()
    scores=[x for x in db.scalars(select(MaterialMatch.final_score)).all()]
    return {"total_cpse_materials":total,"total_national_materials":national,"duplicates_detected":matches,"pending_reviews":pending,
            "approved_mappings":mapped,"unmapped_materials":max(0,total-mapped),"duplicate_rate":round(matches/total,4) if total else 0,
            "standardization_rate":round(mapped/total,4) if total else 0,"mapping_coverage":round(mapped/total,4) if total else 0,
            "materials_by_cpse":dict(cpse),"materials_by_category":{k or "UNCLASSIFIED":v for k,v in cats},
            "duplicate_clusters":len(cluster_view(db)),"confidence_distribution":{"strong":sum(x>=.95 for x in scores),"review":sum(.8<=x<.95 for x in scores),"investigate":sum(.6<=x<.8 for x in scores)}}


def cluster_view(db):
    ids=db.scalars(select(Material.id)).all()
    matches=db.scalars(select(MaterialMatch)).all()
    return clusters(ids,[{"material_a_id":m.material_a_id,"material_b_id":m.material_b_id,"status":m.status,"conflicting_features":m.conflicting_features} for m in matches])


@router.get("/clusters")
def list_clusters(db:Session=Depends(get_db)):
    result=[]
    for index,material_ids in enumerate(cluster_view(db),start=1):
        result.append({"cluster_id":index,"material_ids":material_ids})
    return {"clusters":result}


@router.get("/procurement-opportunities")
def procurement_opportunities(db:Session=Depends(get_db)):
    rows=db.execute(select(ProcurementRecord,Material,CPSE).join(Material,Material.id==ProcurementRecord.material_id).join(CPSE,CPSE.id==Material.cpse_id)).all()
    groups={}
    for record,material,cpse in rows:
        key=material.fingerprint.get("dimensions") or material.fingerprint.get("model") or material.normalized_description
        group=groups.setdefault(key,{"participating_cpse":{},"historical_spend":0.0,"combined_demand":0.0,"suppliers_by_cpse":{},"material_ids":set()})
        group["participating_cpse"][cpse.code]=group["participating_cpse"].get(cpse.code,0)+record.quantity
        group["combined_demand"]+=record.quantity; group["historical_spend"]+=record.quantity*record.unit_price
        if record.supplier: group["suppliers_by_cpse"].setdefault(cpse.code,set()).add(record.supplier)
        group["material_ids"].add(material.id)
    out=[]
    for key,g in groups.items():
        if len(g["participating_cpse"])>1:
            out.append({"material":key,"material_ids":sorted(g["material_ids"]),"participating_cpses":g["participating_cpse"],
                        "organization_count":len(g["participating_cpse"]),"combined_demand":g["combined_demand"],"historical_spend":g["historical_spend"],
                        "supplier_overlap":sorted(set.intersection(*g["suppliers_by_cpse"].values())) if g["suppliers_by_cpse"] else [],"opportunity_flag":"Potential Collaborative Procurement Opportunity"})
    return {"opportunities":out}
