"""Add refresh_token and password_reset_token tables."""
from alembic import op
from app.core.database import Base
from app import models  # noqa: F401

revision = "0003_refresh_and_reset_tokens"
down_revision = "0002_users_and_history"
branch_labels = None
depends_on = None


def upgrade():
    Base.metadata.create_all(bind=op.get_bind())


def downgrade():
    bind = op.get_bind()
    models.PasswordResetToken.__table__.drop(bind, checkfirst=True)
    models.RefreshToken.__table__.drop(bind, checkfirst=True)
