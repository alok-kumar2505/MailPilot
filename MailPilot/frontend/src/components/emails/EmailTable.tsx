import { useState, useRef } from 'react';
import type { EmailJob } from '../../types';
import { format } from 'date-fns';
import { Star, Inbox, ExternalLink, Edit2, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface EmailTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  type: 'SCHEDULED' | 'SENT' | 'SEARCH';
  onUpdate?: () => void;
}

export function EmailTable({ emails, isLoading, type, onUpdate }: EmailTableProps) {
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [selectedPreviewEmail, setSelectedPreviewEmail] = useState<EmailJob | null>(null);
  
  const toggleFavourite = async (email: EmailJob, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !email.is_favourited;
    try {
      await api.put(`/api/emails/${email.id}/favourite`, { is_favourited: newStatus });
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to update favourite');
    }
  };

  const submitReschedule = async (id: string) => {
    if (!newDate) return;
    try {
      await api.put(`/api/emails/${id}/reschedule`, { scheduled_at: new Date(newDate).toISOString() });
      toast.success('Email rescheduled');
      setReschedulingId(null);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reschedule');
    }
  };
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
            <div key={email.id} className="flex items-center px-6 py-4 hover:bg-[#fcfcfc] transition-colors group cursor-pointer" onClick={() => setSelectedPreviewEmail(email)}>
              
              {/* Recipient */}
              <div className="w-48 flex-shrink-0">
                <span className="font-semibold text-sm text-[#222]">To: {email.recipient.split('@')[0]}</span>
              </div>

              {/* Status Pill & Reschedule */}
              <div className="w-56 flex-shrink-0 flex items-center">
                {isScheduled ? (
                  reschedulingId === email.id ? (
                    <div className="flex items-center gap-1 bg-white border border-[#eaeaea] p-1 rounded-md shadow-sm z-10" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="datetime-local" 
                        className="text-[11px] p-1 border border-gray-200 rounded outline-none"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                      <button onClick={() => submitReschedule(email.id)} className="text-[#00A14B] hover:bg-[#eef8f2] p-1 rounded"><CheckCircle2 className="w-4 h-4"/></button>
                      <button onClick={() => setReschedulingId(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div className="flex items-center group/pill">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#fff0e5] text-[#f27a1a]">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {timeToDisplay}
                      </span>
                      <button 
                        className="opacity-0 group-hover/pill:opacity-100 ml-2 p-1 text-gray-400 hover:text-[#00A14B] transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReschedulingId(email.id);
                          setNewDate(format(new Date(email.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
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
              </div>

              {/* Action Star */}
              <div className="w-8 flex justify-end flex-shrink-0">
                <button 
                  onClick={(e) => toggleFavourite(email, e)}
                  className={`transition-colors ${email.is_favourited ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-300 hover:text-yellow-400'}`}
                >
                  <Star className="h-5 w-5" fill={email.is_favourited ? "currentColor" : "none"} />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {selectedPreviewEmail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedPreviewEmail(null)}>
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#eaeaea]">
              <h2 className="text-xl font-bold text-[#222] truncate pr-4">{selectedPreviewEmail.subject}</h2>
              <button onClick={() => setSelectedPreviewEmail(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="px-6 py-4 bg-[#f8f9fa] border-b border-[#eaeaea] flex flex-col gap-1.5">
              <div className="text-sm flex items-center">
                <span className="w-16 font-semibold text-gray-400 uppercase tracking-wider text-[11px]">To</span> 
                <span className="text-[#222] font-medium bg-white border border-[#eaeaea] px-2 py-0.5 rounded shadow-sm">{selectedPreviewEmail.recipient}</span>
              </div>
              <div className="text-sm flex items-center mt-1">
                <span className="w-16 font-semibold text-gray-400 uppercase tracking-wider text-[11px]">Date</span> 
                <span className="text-gray-600">{format(new Date(selectedPreviewEmail.sent_at || selectedPreviewEmail.scheduled_at), 'PPPPp')}</span>
              </div>
            </div>
            <div className="p-8 overflow-y-auto bg-white flex-1 min-h-[200px]">
              <div className="prose prose-sm max-w-none text-[#333] leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedPreviewEmail.body.replace(/\n/g, '<br/>') }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
