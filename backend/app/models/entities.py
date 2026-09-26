from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def now(): return datetime.now(timezone.utc)


class CPSE(Base):
    __tablename__ = "cpse"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    materials: Mapped[list["Material"]] = relationship(back_populates="cpse")


class Material(Base):
    __tablename__ = "material"
    __table_args__ = (UniqueConstraint("cpse_id", "legacy_material_code", name="uq_material_cpse_legacy"), Index("ix_material_fingerprint", "fingerprint"))
    id: Mapped[int] = mapped_column(primary_key=True)
    cpse_id: Mapped[int] = mapped_column(ForeignKey("cpse.id"), index=True, nullable=False)
    legacy_material_code: Mapped[str] = mapped_column(String(120), nullable=False)
    original_description: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    material_group: Mapped[str | None] = mapped_column(String(120))
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(120))
    material: Mapped[str | None] = mapped_column(String(120), index=True)
    grade: Mapped[str | None] = mapped_column(String(80), index=True)
    dimensions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(40))
    manufacturer: Mapped[str | None] = mapped_column(String(200))
    brand: Mapped[str | None] = mapped_column(String(120))
    model: Mapped[str | None] = mapped_column(String(120))
    specification: Mapped[str | None] = mapped_column(Text)
    plant: Mapped[str | None] = mapped_column(String(120))
    fingerprint: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    source_file: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)
    cpse: Mapped[CPSE] = relationship(back_populates="materials")


class NationalMaterial(Base):
    __tablename__ = "national_material"
    id: Mapped[int] = mapped_column(primary_key=True)
    national_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    standard_description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(120))
    material: Mapped[str | None] = mapped_column(String(120))
    grade: Mapped[str | None] = mapped_column(String(80))
    technical_attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class MaterialMapping(Base):
    __tablename__ = "material_mapping"
    __table_args__ = (UniqueConstraint("cpse_id", "legacy_material_code", name="uq_mapping_cpse_legacy"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    cpse_id: Mapped[int] = mapped_column(ForeignKey("cpse.id"), index=True, nullable=False)
    legacy_material_code: Mapped[str] = mapped_column(String(120), nullable=False)
    national_material_id: Mapped[int] = mapped_column(ForeignKey("national_material.id"), index=True, nullable=False)
    original_description: Mapped[str] = mapped_column(Text, nullable=False)
    standard_description: Mapped[str] = mapped_column(Text, nullable=False)
    mapping_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    mapping_status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(120))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class MaterialMatch(Base):
    __tablename__ = "material_match"
    __table_args__ = (UniqueConstraint("material_a_id", "material_b_id", name="uq_material_match_pair"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    material_a_id: Mapped[int] = mapped_column(ForeignKey("material.id"), index=True, nullable=False)
    material_b_id: Mapped[int] = mapped_column(ForeignKey("material.id"), index=True, nullable=False)
    semantic_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    attribute_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    specification_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    category_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    unit_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    procurement_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    final_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    classification: Mapped[str] = mapped_column(String(40), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    matching_features: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    conflicting_features: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)


class Review(Base):
    __tablename__ = "review"
    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("material_match.id"), index=True, nullable=False)
    reviewer: Mapped[str | None] = mapped_column(String(120))
    decision: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    comments: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    user: Mapped[str | None] = mapped_column(String(120))
    details: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)


class ProcurementRecord(Base):
    __tablename__ = "procurement_record"
    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("material.id"), index=True, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    supplier: Mapped[str | None] = mapped_column(String(200))
    procurement_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
