import re

ALIASES = {
    r"\bSTAINLESS\s*STEEL\b": "STAINLESS_STEEL",
    r"\bS\.?\s*S\.?\s*(304|316)\b": r"STAINLESS_STEEL_\1",
    r"\bS\.?\s*S\.?\b": "STAINLESS_STEEL",
    r"\bSS\s*(304|316)\b": r"STAINLESS_STEEL_\1",
    r"\bSTAINLESS_STEEL\s+(304|316)\b": r"STAINLESS_STEEL_\1",
    r"\bHEXAGONAL\s+HEAD\b": "HEX HEAD",
    r"\bHEX\s+BOLT\b": "HEX HEAD BOLT",
    r"\bHEXAGON\s+HEAD\b": "HEX HEAD",
    r"\bBOLT\b": "BOLT",
}


def normalize(text: str) -> str:
    value = (text or "").upper().replace("×", "X")
    value = re.sub(r"(?<=\d)\s*[*,]\s*(?=\d)", " X ", value)
    value = re.sub(r"(?<=\d)\s*X\s*(?=\d)", " X ", value)
    value = re.sub(r"\b(M\d+)\s+(\d+(?:\.\d+)?)\s*MM\b", r"\1 X \2MM", value)
    value = re.sub(r"\b(M\d+)\s*X\s*(\d+(?:\.\d+)?)\s*MM?\b", r"\1 X \2MM", value)
    value = re.sub(r"\b(M\d+)\s*X\s*(\d+(?:\.\d+)?)(?!\s*MM)\b", r"\1 X \2MM", value)
    for pattern, replacement in ALIASES.items():
        value = re.sub(pattern, replacement, value)
    value = re.sub(r"[^A-Z0-9_.]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value
