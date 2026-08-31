import type { EmailJob } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { format } from 'date-fns';
import { ExternalLink, Inbox } from 'lucide-react';

interface EmailTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  type: 'SCHEDULED' | 'SENT' | 'SEARCH';
}

export function EmailTable({ emails, isLoading, type }: EmailTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-[var(--color-text-muted)]">
        <Inbox className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No emails found</p>
        <p className="text-sm">
          {type === 'SCHEDULED' && "You don't have any emails scheduled."}
          {type === 'SENT' && "You haven't sent any emails yet."}
          {type === 'SEARCH' && "No results matched your search."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-sm font-medium text-[var(--color-text-muted)]">
            <th className="py-4 pl-6 pr-4 font-medium">Recipient</th>
            <th className="py-4 px-4 font-medium">Subject</th>
            <th className="py-4 px-4 font-medium">
              {type === 'SENT' ? 'Sent At' : 'Scheduled For'}
            </th>
            <th className="py-4 px-4 font-medium">Status</th>
            <th className="py-4 pr-6 pl-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-[var(--color-surface-hover)]/50 transition-colors group">
              <td className="py-4 pl-6 pr-4 text-sm text-white font-medium">
                {email.recipient}
              </td>
              <td className="py-4 px-4 text-sm text-[var(--color-text-muted)] truncate max-w-[200px] sm:max-w-[300px]">
                {email.subject}
              </td>
              <td className="py-4 px-4 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                {format(
                  new Date(type === 'SENT' && email.sent_at ? email.sent_at : email.scheduled_at),
                  'MMM d, yyyy h:mm a'
                )}
              </td>
              <td className="py-4 px-4 whitespace-nowrap">
                <StatusBadge status={email.status} />
              </td>
              <td className="py-4 pr-6 pl-4 text-right">
                {email.preview_url && (
                  <a 
                    href={email.preview_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                  >
                    Preview
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
                {email.status === 'FAILED' && email.last_error && (
                  <span className="text-xs text-[var(--color-error)]" title={email.last_error}>
                    Error Info
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
