from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import CPSE, AuditLog, MaterialMapping, NationalMaterial, NationalMaterialVersion

router = APIRouter(tags=["directory"])


@router.get("/cpse")
def list_cpse(db: Session = Depends(get_db)):
    """Directory of known CPSE codes/names, so the frontend does not have to hardcode them."""
    rows = db.scalars(select(CPSE).order_by(CPSE.code)).all()
    return [{"code": c.code, "name": c.name, "created_at": c.created_at} for c in rows]


@router.get("/audit")
def list_audit(entity_type: str | None = None, entity_id: str | None = None,
              page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=500),
              db: Session = Depends(get_db)):
    """Read-only audit trail (who approved/rejected/modified/escalated what, and when)."""
    stmt = select(AuditLog)
    if entity_type: stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id: stmt = stmt.where(AuditLog.entity_id == entity_id)
    rows = db.scalars(stmt.order_by(AuditLog.timestamp.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"page": page, "page_size": page_size,
            "items": [{"id": r.id, "entity_type": r.entity_type, "entity_id": r.entity_id, "action": r.action,
                       "user": r.user, "details": r.details, "timestamp": r.timestamp} for r in rows]}


@router.get("/national-materials/{national_code}/history")
def national_material_history(national_code: str, db: Session = Depends(get_db)):
    """
    Real, append-only version history for a national material: every
    CREATE/APPROVE/MODIFY decision that touched it, in order, each with who
    made the change and when (NationalMaterialVersion, written from
    reviews.py). A national material approved before this table existed will
    have no snapshots; in that case we fall back to reporting its current
    state only, and say so explicitly via `full_version_history_available`.
    """
    nm = db.scalar(select(NationalMaterial).where(NationalMaterial.national_code == national_code))
    if not nm: raise HTTPException(404, "National material not found")
    mappings = db.scalars(select(MaterialMapping).where(MaterialMapping.national_material_id == nm.id)).all()
    versions = db.scalars(select(NationalMaterialVersion).where(NationalMaterialVersion.national_material_id == nm.id)
                          .order_by(NationalMaterialVersion.created_at)).all()
    return {
        "national_code": nm.national_code,
        "current_version": nm.version,
        "standard_description": nm.standard_description,
        "approval_status": nm.approval_status,
        "updated_at": nm.updated_at,
        "mappings": [{"cpse_id": m.cpse_id, "legacy_material_code": m.legacy_material_code, "version": m.version,
                      "mapping_status": m.mapping_status, "approved_by": m.approved_by, "approved_at": m.approved_at} for m in mappings],
        "version_history": [{"version": v.version, "standard_description": v.standard_description, "approval_status": v.approval_status,
                             "changed_by": v.changed_by, "change_reason": v.change_reason, "comments": v.comments, "created_at": v.created_at} for v in versions],
        "full_version_history_available": len(versions) > 0,
    }
