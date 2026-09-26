import re
from app.services.normalization_service import normalize


def extract_attributes(description: str) -> dict:
    text = normalize(description)
    attrs: dict[str, str] = {}
    if "BOLT" in text: attrs["category"] = "FASTENER"
    if "HEX" in text: attrs["head_type"] = "HEX"
    if "STAINLESS_STEEL" in text: attrs["material"] = "STAINLESS_STEEL"
    m = re.search(r"STAINLESS_STEEL_?(304|316)\b", text)
    if m: attrs["grade"] = "SS" + m.group(1)
    m = re.search(r"\b(M\d+)\s*X\s*(\d+(?:\.\d+)?)", text)
    if m:
        attrs["diameter"] = m.group(1)
        attrs["length"] = f"{m.group(2)}MM"
        attrs["dimensions"] = f"{m.group(1)}X{m.group(2)}MM"
    for key, pattern in {
        "voltage": r"\b(\d+(?:\.\d+)?)\s*V\b", "current": r"\b(\d+(?:\.\d+)?)\s*A\b",
        "power": r"\b(\d+(?:\.\d+)?)\s*(KW|W)\b", "pressure_rating": r"\b(CLASS\s*\d+|PN\s*\d+)\b",
        "temperature_rating": r"\b(-?\d+)\s*(?:DEG|°)\s*C\b", "model": r"\bMODEL\s*([A-Z0-9-]+)\b",
        "standard": r"\b(ISO\s*\d+|DIN\s*\d+|ASTM\s*[A-Z0-9]+)\b",
    }.items():
        match = re.search(pattern, text)
        if match: attrs[key] = " ".join(match.groups()) if len(match.groups()) > 1 else match.group(1)
    return attrs
