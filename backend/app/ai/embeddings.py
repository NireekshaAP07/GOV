"""Optional Sentence Transformers adapter; import dependency lazily when configured."""

def embed(texts: list[str], model_name: str | None = None):
    if not model_name:
        return None
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise RuntimeError("Install sentence-transformers to enable embeddings") from exc
    return SentenceTransformer(model_name).encode(texts, normalize_embeddings=True)
