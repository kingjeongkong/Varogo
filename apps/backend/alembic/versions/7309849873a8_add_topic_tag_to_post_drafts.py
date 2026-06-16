"""add topic_tag to post_drafts

Revision ID: 7309849873a8
Revises: 9b1392052eab
Create Date: 2026-06-16 20:26:52.270731

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7309849873a8'
down_revision: Union[str, Sequence[str], None] = '9b1392052eab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('post_drafts', sa.Column('topic_tag', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('post_drafts', 'topic_tag')
