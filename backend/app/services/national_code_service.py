from uuid import uuid4
from app.models.entities import NationalMaterial


def create_national_material(db, material, attrs: dict):
    # Database sequence allocation remains unique under concurrent approvals.
    row = NationalMaterial(national_code=f"PENDING-{uuid4().hex}", standard_description=material.normalized_description,
                          category=attrs.get("category"), material=attrs.get("material"), grade=attrs.get("grade"),
                          technical_attributes=attrs, approval_status="APPROVED")
    db.add(row); db.flush()
    row.national_code = f"NMC-{row.id:08d}"
    db.flush()
    return row
