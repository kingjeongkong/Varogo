"""rename accounts to oauth_accounts

Revision ID: 9b1392052eab
Revises:
Create Date: 2026-06-15 15:46:43.483768

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '9b1392052eab'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  """Rename accounts table to oauth_accounts."""
  op.rename_table('accounts', 'oauth_accounts')

  # Rename primary key index
  op.execute('ALTER INDEX accounts_pkey RENAME TO oauth_accounts_pkey')

  # Rename unique index on (provider, provider_id)
  op.execute(
    'ALTER INDEX accounts_provider_provider_id_key '
    'RENAME TO oauth_accounts_provider_provider_id_key'
  )

  # Rename foreign key constraint on user_id
  op.execute(
    'ALTER TABLE oauth_accounts RENAME CONSTRAINT '
    'accounts_user_id_fkey TO oauth_accounts_user_id_fkey'
  )


def downgrade() -> None:
  """Rename oauth_accounts table back to accounts."""
  # Rename foreign key constraint back
  op.execute(
    'ALTER TABLE oauth_accounts RENAME CONSTRAINT '
    'oauth_accounts_user_id_fkey TO accounts_user_id_fkey'
  )

  # Rename unique index back
  op.execute(
    'ALTER INDEX oauth_accounts_provider_provider_id_key '
    'RENAME TO accounts_provider_provider_id_key'
  )

  # Rename primary key index back
  op.execute('ALTER INDEX oauth_accounts_pkey RENAME TO accounts_pkey')

  op.rename_table('oauth_accounts', 'accounts')
