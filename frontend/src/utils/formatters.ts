export function getRiskBadgeClass(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'CRITICAL':
      return 'badge badge-critical';
    case 'HIGH':
      return 'badge badge-high';
    case 'MEDIUM':
      return 'badge badge-medium';
    default:
      return 'badge badge-low';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'UNREVIEWED':
      return 'badge status-unreviewed';
    case 'UNDER_REVIEW':
      return 'badge status-under_review';
    case 'VALIDATED':
      return 'badge status-validated';
    case 'REJECTED':
      return 'badge status-rejected';
    case 'INVESTIGATE':
      return 'badge status-investigate';
    default:
      return 'badge status-rejected';
  }
}

export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

