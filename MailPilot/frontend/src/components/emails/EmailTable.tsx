import type { EmailJob } from '../../types';
import { format } from 'date-fns';
import { Star, Inbox, ExternalLink } from 'lucide-react';

interface EmailTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  type: 'SCHEDULED' | 'SENT' | 'SEARCH';
}

export function EmailTable({ emails, isLoading, type }: EmailTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00A14B]"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
        <Inbox className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg font-medium text-gray-600">No emails found</p>
        <p className="text-sm">
          {type === 'SCHEDULED' && "You don't have any emails scheduled."}
          {type === 'SENT' && "You haven't sent any emails yet."}
          {type === 'SEARCH' && "No results matched your search."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="divide-y divide-[#eaeaea]">
        {emails.map((email) => {
          // Logic for pill styling based on status and time
          const isScheduled = email.status === 'SCHEDULED' || type === 'SCHEDULED';
          const timeToDisplay = format(
            new Date(isScheduled && email.scheduled_at ? email.scheduled_at : (email.sent_at || email.created_at)),
            'EEE h:mm:ss a'
          );

          return (
            <div key={email.id} className="flex items-center px-6 py-4 hover:bg-[#fcfcfc] transition-colors group cursor-pointer">
              
              {/* Recipient */}
              <div className="w-48 flex-shrink-0">
                <span className="font-semibold text-sm text-[#222]">To: {email.recipient.split('@')[0]}</span>
              </div>

              {/* Status Pill */}
              <div className="w-48 flex-shrink-0 flex items-center">
                {isScheduled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#fff0e5] text-[#f27a1a]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timeToDisplay}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#f1f3f5] text-[#495057]">
                    Sent
                  </span>
                )}
              </div>

              {/* Subject & Body Snippet */}
              <div className="flex-1 min-w-0 truncate pr-6 text-sm">
                <span className="font-bold text-[#333] mr-2">{email.subject}</span>
                <span className="text-gray-400 font-normal">
                  - {email.body.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                </span>
                {email.preview_url && type === 'SENT' && (
                   <a 
                     href={email.preview_url} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="ml-2 inline-flex items-center text-xs font-medium text-[#00A14B] hover:underline"
                     onClick={(e) => e.stopPropagation()}
                   >
                     Preview <ExternalLink className="ml-1 h-3 w-3" />
                   </a>
                )}
              </div>

              {/* Action Star */}
              <div className="w-8 flex justify-end flex-shrink-0">
                <button className="text-gray-300 hover:text-yellow-400 transition-colors">
                  <Star className="h-4 w-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
