# AI and matching

The current MVP is intentionally deterministic and offline. Normalization dictionaries and regular expressions canonicalize known abbreviations and dimensions. Rules extract grade, dimensions, electrical ratings and selected common values. RapidFuzz token similarity supplies a lexical semantic proxy; it is not represented as an embedding score.

The matcher combines description similarity, shared extracted attributes, technical specification agreement, category, and unit using configurable JSON weights. Candidate generation blocks known incompatible categories before pair scoring. A known critical attribute conflict caps the score below the recommendation threshold and returns `NON_MATCH`, even where descriptions are similar. The explanation and matched/conflicting feature dictionaries are stored with each recommendation.

Thresholds and weights live in `.env` (`MATCHING_WEIGHTS`, `CONFIDENCE_THRESHOLDS`). The optional `EMBEDDING_MODEL` setting is reserved for a future local Sentence Transformers adapter. No external model download or paid API is required now. Current extraction does not cover every attribute requested in the full vision; add patterns and tests as domain terms are encountered.
