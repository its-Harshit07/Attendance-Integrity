"""initial_operational_schema

Revision ID: 34095ae1f844
Revises: 
Create Date: 2026-10-06 21:07:18.051086

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34095ae1f844'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create initial operational tables."""
    # 1. Create anomalies table
    op.create_table(
        'anomalies',
        sa.Column('anomaly_id', sa.String(), nullable=False),
        sa.Column('record_id', sa.String(), nullable=False),
        sa.Column('student_id', sa.String(), nullable=False),
        sa.Column('student_name', sa.String(), nullable=True),
        sa.Column('class_id', sa.String(), nullable=False),
        sa.Column('date', sa.String(), nullable=False),
        sa.Column('attendance_status', sa.String(), nullable=True),
        sa.Column('raw_status', sa.String(), nullable=True),
        sa.Column('anomaly_category', sa.String(), nullable=False),
        sa.Column('detection_source', sa.String(), nullable=False),
        sa.Column('risk_tier', sa.String(), nullable=False),
        sa.Column('anomaly_score', sa.Float(), nullable=False),
        sa.Column('review_status', sa.String(), nullable=False, server_default='UNREVIEWED'),
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('updated_at', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('anomaly_id'),
        sa.UniqueConstraint('record_id')
    )
    op.create_index(op.f('ix_anomalies_anomaly_category'), 'anomalies', ['anomaly_category'], unique=False)
    op.create_index(op.f('ix_anomalies_date'), 'anomalies', ['date'], unique=False)
    op.create_index(op.f('ix_anomalies_detection_source'), 'anomalies', ['detection_source'], unique=False)
    op.create_index(op.f('ix_anomalies_review_status'), 'anomalies', ['review_status'], unique=False)
    op.create_index(op.f('ix_anomalies_risk_tier'), 'anomalies', ['risk_tier'], unique=False)
    op.create_index(op.f('ix_anomalies_student_id'), 'anomalies', ['student_id'], unique=False)

    # 2. Create evidence table
    op.create_table(
        'evidence',
        sa.Column('evidence_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('anomaly_id', sa.String(), nullable=False),
        sa.Column('rule_id', sa.String(), nullable=False),
        sa.Column('rule_name', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('observed_value', sa.String(), nullable=True),
        sa.Column('threshold_value', sa.String(), nullable=True),
        sa.Column('expected_value', sa.String(), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['anomaly_id'], ['anomalies.anomaly_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('evidence_id')
    )
    op.create_index(op.f('ix_evidence_anomaly_id'), 'evidence', ['anomaly_id'], unique=False)

    # 3. Create reviews table
    op.create_table(
        'reviews',
        sa.Column('review_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('anomaly_id', sa.String(), nullable=False),
        sa.Column('reviewer', sa.String(), nullable=False),
        sa.Column('previous_status', sa.String(), nullable=False),
        sa.Column('new_status', sa.String(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['anomaly_id'], ['anomalies.anomaly_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('review_id')
    )
    op.create_index(op.f('ix_reviews_anomaly_id'), 'reviews', ['anomaly_id'], unique=False)

    # 4. Create audit_log table
    op.create_table(
        'audit_log',
        sa.Column('audit_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('anomaly_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('previous_status', sa.String(), nullable=True),
        sa.Column('new_status', sa.String(), nullable=True),
        sa.Column('reviewer', sa.String(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('audit_id')
    )
    op.create_index(op.f('ix_audit_log_anomaly_id'), 'audit_log', ['anomaly_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Drop operational tables."""
    op.drop_index(op.f('ix_audit_log_anomaly_id'), table_name='audit_log')
    op.drop_table('audit_log')

    op.drop_index(op.f('ix_reviews_anomaly_id'), table_name='reviews')
    op.drop_table('reviews')

    op.drop_index(op.f('ix_evidence_anomaly_id'), table_name='evidence')
    op.drop_table('evidence')

    op.drop_index(op.f('ix_anomalies_student_id'), table_name='anomalies')
    op.drop_index(op.f('ix_anomalies_risk_tier'), table_name='anomalies')
    op.drop_index(op.f('ix_anomalies_review_status'), table_name='anomalies')
    op.drop_index(op.f('ix_anomalies_detection_source'), table_name='anomalies')
    op.drop_index(op.f('ix_anomalies_date'), table_name='anomalies')
    op.drop_index(op.f('ix_anomalies_anomaly_category'), table_name='anomalies')
    op.drop_table('anomalies')
