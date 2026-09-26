from pydantic import BaseModel


class MatchInput(BaseModel):
    material_a_id: int
    material_b_id: int
