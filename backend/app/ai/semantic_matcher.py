from app.services.matching_service import score_pair

def semantic_match(a: dict, b: dict) -> dict:
    """Replaceable boundary; current offline adapter uses hybrid deterministic scoring."""
    return score_pair(a,b)
