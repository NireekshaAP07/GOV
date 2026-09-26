from pydantic import BaseModel, ConfigDict


class MaterialInput(BaseModel):
    legacy_material_code: str
    original_description: str
    unit: str = "EA"
    category: str | None = None
    material: str | None = None
    grade: str | None = None
    manufacturer: str | None = None
    specification: str | None = None


class MaterialOut(BaseModel):
    id: int
    cpse_id: int
    legacy_material_code: str
    original_description: str
    normalized_description: str
    fingerprint: dict
    model_config = ConfigDict(from_attributes=True)
