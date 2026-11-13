"""phase1_security_auth_schema

Revision ID: 6f1a9b8c2d3e
Revises: 34095ae1f844
Create Date: 2026-11-12 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f1a9b8c2d3e'
down_revision: Union[str, Sequence[str], None] = '34095ae1f844'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create phase 1 security and authentication tables."""
    # 1. Create otp_challenges table
    op.create_table(
        'otp_challenges',
        sa.Column('challenge_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('otp_hash', sa.String(length=128), nullable=False),
        sa.Column('otp_encrypted', sa.Text(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('expires_at', sa.String(), nullable=False),
        sa.Column('consumed_at', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('challenge_id')
    )
    op.create_index(op.f('ix_otp_challenges_email'), 'otp_challenges', ['email'], unique=False)
    op.create_index(op.f('ix_otp_challenges_created_at'), 'otp_challenges', ['created_at'], unique=False)
    op.create_index(op.f('ix_otp_challenges_expires_at'), 'otp_challenges', ['expires_at'], unique=False)

    # 2. Create admin_sessions table
    op.create_table(
        'admin_sessions',
        sa.Column('session_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('token_hash', sa.String(length=128), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('csrf_token', sa.String(length=128), nullable=False),
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('expires_at', sa.String(), nullable=False),
        sa.Column('last_activity_at', sa.String(), nullable=False),
        sa.Column('revoked_at', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('session_id')
    )
    op.create_index(op.f('ix_admin_sessions_token_hash'), 'admin_sessions', ['token_hash'], unique=True)
    op.create_index(op.f('ix_admin_sessions_email'), 'admin_sessions', ['email'], unique=False)
    op.create_index(op.f('ix_admin_sessions_expires_at'), 'admin_sessions', ['expires_at'], unique=False)

    # 3. Create rate_limits table
    op.create_table(
        'rate_limits',
        sa.Column('record_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('key', sa.String(length=190), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('window_start', sa.String(), nullable=False),
        sa.Column('expires_at', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('record_id')
    )
    op.create_index(op.f('ix_rate_limits_key'), 'rate_limits', ['key'], unique=True)
    op.create_index(op.f('ix_rate_limits_expires_at'), 'rate_limits', ['expires_at'], unique=False)

    # 4. Create security_audit_log table
    op.create_table(
        'security_audit_log',
        sa.Column('event_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('event_id')
    )
    op.create_index(op.f('ix_security_audit_log_event_type'), 'security_audit_log', ['event_type'], unique=False)
    op.create_index(op.f('ix_security_audit_log_email'), 'security_audit_log', ['email'], unique=False)
    op.create_index(op.f('ix_security_audit_log_timestamp'), 'security_audit_log', ['timestamp'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Drop phase 1 security and authentication tables."""
    op.drop_table('security_audit_log')
    op.drop_table('rate_limits')
    op.drop_table('admin_sessions')
    op.drop_table('otp_challenges')

