# Data model

- `CPSE` identifies a source organization.
- `Material` stores the immutable-source identity pair (CPSE, legacy code), original text, normalized text, extracted fields, fingerprint and import provenance.
- `MaterialMatch` records pair scores, decision class, explanation and conflicts.
- `Review` records reviewer action against a match.
- `NationalMaterial` owns a persistent sequential `NMC-########` identity, standard description, attributes and version.
- `MaterialMapping` links each original CPSE code to an approved NMC and retains its original description and approval details.
- `AuditLog` records authoritative decisions.
- `ProcurementRecord` stores synthetic or imported quantity, price, supplier and date for an original material.

Foreign keys and uniqueness constraints protect source identity, NMC identity and mappings. Database schema is in the initial Alembic revision.
