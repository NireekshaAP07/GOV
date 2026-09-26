from app.services.extraction_service import extract_attributes


def fingerprint(description: str, unit: str | None = None) -> dict:
    result = extract_attributes(description)
    result["unit"] = (unit or "EA").upper()
    return result
