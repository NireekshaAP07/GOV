from app.services.extraction_service import extract_attributes

def extract(text: str) -> dict:
    return extract_attributes(text)
