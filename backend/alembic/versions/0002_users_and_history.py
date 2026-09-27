"""Add app_user and national_material_version tables (auth + real version history)."""
from alembic import op
from app.core.database import Base
from app import models  # noqa: F401 ensures models are registered on Base.metadata

revision = "0002_users_and_history"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    # create_all is check-first: on a fresh database this is a no-op beyond
    # what 0001_initial already created; on an existing database already at
    # 0001_initial it adds only the two new tables introduced here.
    Base.metadata.create_all(bind=op.get_bind())


def downgrade():
    bind = op.get_bind()
    models.NationalMaterialVersion.__table__.drop(bind, checkfirst=True)
    models.User.__table__.drop(bind, checkfirst=True)
