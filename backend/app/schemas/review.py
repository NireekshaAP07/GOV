from pydantic import BaseModel


class ReviewDecision(BaseModel):
    reviewer: str = "reviewer"
    comments: str | None = None
    standard_description: str | None = None
