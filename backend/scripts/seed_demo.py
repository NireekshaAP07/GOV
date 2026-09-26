"""Seed 500 synthetic material rows and matching/review recommendations."""
from datetime import datetime, timezone
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.database import Base, SessionLocal, engine
from app.models.entities import CPSE, Material, MaterialMatch, ProcurementRecord, Review
from app.services.ingestion_service import add_material
from app.services.matching_service import candidates

Base.metadata.create_all(engine)
db=SessionLocal()
try:
    org_specs=[("BHEL","Bharat Heavy Electricals"),("NTPC","NTPC Limited"),("SAIL","Steel Authority of India"),("ONGC","Oil and Natural Gas Corporation"),("GAIL","GAIL India")]
    orgs=[]
    for code,name in org_specs:
        cpse=db.query(CPSE).filter_by(code=code).first()
        if not cpse: cpse=CPSE(code=code,name=name);db.add(cpse);db.flush()
        orgs.append(cpse)
    examples=[("BOLT-10021","HEX BOLT M16X50 SS304"),("MAT-98231","HEXAGONAL HEAD BOLT M16 x 50 STAINLESS STEEL 304"),("772819","SS304 HEX HEAD BOLT M16 50MM"),
      ("BOLT-316","HEX BOLT M16X50 SS316"),("BOLT-100","HEX BOLT M16X100 SS304"),("MOTOR-415","INDUCTION MOTOR 415V 5KW"),("MOTOR-230","INDUCTION MOTOR 230V 5KW"),
      ("BRG-6205","DEEP GROOVE BALL BEARING 6205"),("VALVE-150","GATE VALVE 150MM CLASS 150"),("CABLE-4C","COPPER CABLE 4 CORE 2.5 SQMM")]
    for idx,cpse in enumerate(orgs):
        for i in range(100):
            code,description=examples[(i+idx*2)%len(examples)]
            # Required same bolt represented in three source systems.
            if i==0 and idx<3: code,description=examples[idx]
            legacy=code if i==0 and idx<3 else f"{code}-{idx}-{i}"
            material=db.query(Material).filter_by(cpse_id=cpse.id,legacy_material_code=legacy).first()
            if not material:
                material=add_material(db,cpse,{"legacy_material_code":legacy,"original_description":description,"unit":"EA"})
                db.add(ProcurementRecord(material_id=material.id,quantity=float(100+(i%5)*100),unit_price=float(1000+(i%7)*50),supplier=f"Supplier {(i%4)+1}",procurement_date=datetime(2025,1,1,tzinfo=timezone.utc)))
    db.commit()
    items=[{"id":m.id,"fingerprint":m.fingerprint,"normalized_description":m.normalized_description} for m in db.query(Material).all()]
    rows=0
    for a,b,result in candidates(items):
        if result["final_score"] < .8: continue
        left,right=sorted((a["id"],b["id"]))
        if db.query(MaterialMatch).filter_by(material_a_id=left,material_b_id=right).first(): continue
        match=MaterialMatch(material_a_id=left,material_b_id=right,semantic_score=result["semantic_score"],attribute_score=result["attribute_score"],
            specification_score=result["specification_score"],category_score=result["category_score"],unit_score=result["unit_score"],procurement_score=result["procurement_score"],
            final_score=result["final_score"],classification=result["classification"],explanation=result["explanation"],matching_features=result["matching_features"],
            conflicting_features=result["conflicting_features"],status="PENDING")
        db.add(match);db.flush();db.add(Review(match_id=match.id,decision="PENDING"));rows+=1
    db.commit()
    print(f"Seeded {len(items)} materials across 5 CPSEs; created {rows} pending match reviews.")
finally: db.close()
