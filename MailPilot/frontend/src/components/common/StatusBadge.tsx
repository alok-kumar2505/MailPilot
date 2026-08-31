import { cn } from './Button';

interface StatusBadgeProps {
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    SCHEDULED: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20',
    PROCESSING: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20',
    SENT: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
    FAILED: 'bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20',
  };

  const labels = {
    SCHEDULED: 'Scheduled',
    PROCESSING: 'Processing',
    SENT: 'Sent',
    FAILED: 'Failed',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      styles[status],
      className
    )}>
      {labels[status]}
    </span>
  );
}
