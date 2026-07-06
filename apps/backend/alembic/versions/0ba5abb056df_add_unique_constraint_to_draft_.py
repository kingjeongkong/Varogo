"""add unique constraint to draft_generation_logs post_draft_id

Revision ID: 0ba5abb056df
Revises: 2cb97efd1a30
Create Date: 2026-07-06 16:37:20.650107

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0ba5abb056df'
down_revision: Union[str, Sequence[str], None] = '2cb97efd1a30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index('draft_generation_logs_post_draft_id_idx', table_name='draft_generation_logs')
    op.create_unique_constraint(
        'draft_generation_logs_post_draft_id_key', 'draft_generation_logs', ['post_draft_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'draft_generation_logs_post_draft_id_key', 'draft_generation_logs', type_='unique'
    )
    op.create_index(
        'draft_generation_logs_post_draft_id_idx', 'draft_generation_logs', ['post_draft_id'], unique=False
    )
