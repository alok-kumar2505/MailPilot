import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { ArrowLeft, Paperclip, Clock, Bold, Italic, Underline, List, ListOrdered, Link, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySec, setDelaySec] = useState(1);
  const [hourlyLimit, setHourlyLimit] = useState(500);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [singleRecipient, setSingleRecipient] = useState('');
  const [isRecipientsExpanded, setIsRecipientsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      setBody(editorRef.current.innerHTML);
    }
  };

  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      let hasOversized = false;

      newFiles.forEach(file => {
        if (file.size > 300 * 1024) {
          hasOversized = true;
        } else {
          validFiles.push(file);
        }
      });

      if (hasOversized) {
        toast.error('Only attachments up to 300KB are allowed');
      }

      if (validFiles.length > 0) {
        setAttachments([...attachments, ...validFiles]);
      }
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Send Later panel state
  const [showSendLater, setShowSendLater] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  const processEmails = (input: string, currentRecipients: string[]) => {
    const tokens = input.split(/[\s,]+/).filter(Boolean);
    const newRecipients = [...currentRecipients];
    let hasInvalid = false;
    let addedCount = 0;
    
    for (const token of tokens) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token)) {
        if (!newRecipients.includes(token)) {
          newRecipients.push(token);
          addedCount++;
        }
      } else {
        hasInvalid = true;
      }
    }
    return { newRecipients, hasInvalid, addedCount };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault();
      const val = singleRecipient.trim();
      const { newRecipients, hasInvalid, addedCount } = processEmails(val, recipients);
      
      if (addedCount > 0) {
        setRecipients(newRecipients);
        setSingleRecipient('');
      } else if (hasInvalid) {
        toast.error('Invalid email address');
      } else if (val) {
        // Was a duplicate
        setSingleRecipient('');
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const { newRecipients, hasInvalid, addedCount } = processEmails(pastedText, recipients);
    
    if (addedCount > 0) {
      setRecipients(newRecipients);
    }
    
    if (hasInvalid && addedCount === 0) {
       toast.error('No valid emails found in pasted text');
    } else if (hasInvalid) {
       toast.error(`Added ${addedCount} emails, some were invalid`);
    }
  };

  const removeRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter(email => email !== emailToRemove));
  };

  if (!isOpen) return null;

  const parseFile = (file: File) => {
    Papa.parse(file, {
      complete: (results) => {
        const emails = new Set<string>();
        let invalidCount = 0;

        results.data.forEach((row: any) => {
          const cells = Array.isArray(row) ? row : Object.values(row);
          cells.forEach(cell => {
            if (typeof cell === 'string') {
              const cleaned = cell.trim();
              if (cleaned.includes('@')) {
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
                  emails.add(cleaned);
                } else {
                  invalidCount++;
                }
              }
            }
          });
        });

        const finalEmails = Array.from(emails);
        setRecipients(finalEmails);

        if (finalEmails.length > 0) {
          toast.success(`Found ${finalEmails.length} valid email(s)`);
        } else {
          toast.error('No valid emails found in file');
        }

        if (invalidCount > 0) {
          toast.error(`${invalidCount} invalid emails were skipped`);
        }
      },
      error: () => toast.error('Failed to parse CSV file')
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!subject || !body) {
      return toast.error('Please provide a subject and body');
    }
    if (recipients.length === 0 && !singleRecipient) {
      return toast.error('Please enter a recipient or upload a CSV');
    }
    
    // Combine single recipient with any CSV uploaded
    const allRecipients = [...recipients];
    if (singleRecipient) {
      allRecipients.push(singleRecipient);
    }
    if (!selectedTime) {
      setShowSendLater(true);
      return toast.error('Please select a Send Later time');
    }

    try {
      setIsSubmitting(true);
      
      const parsedAttachments = await Promise.all(
        attachments.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({
              filename: file.name,
              content: (reader.result as string).split(',')[1],
              contentType: file.type || 'application/octet-stream',
              size: file.size
            });
            reader.onerror = error => reject(error);
          });
        })
      );

      await api.post('/api/emails', {
        subject,
        body,
        startTime: selectedTime.toISOString(),
        delayBetweenMs: delaySec * 1000,
        hourlyLimit,
        recipients: allRecipients,
        attachments: parsedAttachments
      });
      toast.success('Emails scheduled successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule emails');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <style>{`
        [contenteditable=true]:empty:before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
          display: block;
        }
      `}</style>
      
      {/* Top Navigation */}
      <header className="h-16 border-b border-[#eaeaea] flex items-center justify-between px-6 bg-white relative">
        <button onClick={onClose} className="flex items-center text-[#333] hover:text-black font-semibold text-lg transition-colors">
          <ArrowLeft className="h-5 w-5 mr-3" />
          Compose New Email
        </button>

        <div className="flex items-center gap-4">
          <input type="file" multiple className="hidden" ref={attachmentInputRef} onChange={handleAttachmentChange} />
          <button 
            onClick={() => attachmentInputRef.current?.click()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setShowSendLater(!showSendLater)}
            className={`text-gray-400 hover:text-[#00A14B] transition-colors ${showSendLater ? 'text-[#00A14B]' : ''}`}
          >
            <Clock className="h-5 w-5" />
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="border border-[#00A14B] text-[#00A14B] hover:bg-[#f3fbf6] px-6 py-1.5 rounded-full font-medium transition-colors"
          >
            {isSubmitting ? 'Sending...' : 'Send Later'}
          </button>
        </div>

        {/* Send Later Panel Popup */}
        {showSendLater && (
          <div className="absolute top-16 right-6 w-[280px] bg-white border border-[#eaeaea] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-0 z-50">
            <div className="p-4 pb-2">
              <h3 className="font-semibold text-[15px] text-[#333]">Send Later</h3>
            </div>
            
            <div className="px-4 py-2 border-b border-[#eaeaea]">
              <div className="relative">
                <input 
                  type="datetime-local"
                  className="w-full text-sm text-gray-500 placeholder-gray-400 bg-transparent py-2 focus:outline-none"
                  value={selectedTime ? format(selectedTime, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setSelectedTime(e.target.value ? new Date(e.target.value) : null)}
                  placeholder="Pick date & time"
                />
              </div>
            </div>

            <div className="py-2 flex flex-col">
              {[
                { label: 'Tomorrow', h: 9 },
                { label: 'Tomorrow, 10:00 AM', h: 10 },
                { label: 'Tomorrow, 11:00 AM', h: 11 },
                { label: 'Tomorrow, 3:00 PM', h: 15 }
              ].map(opt => (
                <button 
                  key={opt.label}
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(opt.h, 0, 0, 0);
                    setSelectedTime(d);
                  }}
                  className="text-left px-4 py-2.5 text-sm text-[#4b5563] hover:bg-gray-50 hover:text-black transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-[#eaeaea] flex justify-end gap-3 items-center">
              <button onClick={() => setShowSendLater(false)} className="text-[13px] font-semibold text-[#333] hover:text-black px-2 py-1">Cancel</button>
              <button onClick={() => setShowSendLater(false)} className="text-[13px] font-semibold border border-[#00A14B] text-[#00A14B] px-5 py-1.5 rounded-full hover:bg-[#eef8f2]">Done</button>
            </div>
          </div>
        )}
      </header>

      {/* Compose Form */}
      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-5xl mx-auto w-full">
        
        {/* Fields */}
        <div className="flex flex-col gap-0 border-b border-[#eaeaea] pb-6 mb-6">
          <div className="flex items-center py-3 border-b border-[#eaeaea]/50">
            <span className="w-20 text-sm font-semibold text-gray-500">From</span>
            <div className="bg-gray-100 px-3 py-1 rounded-md text-sm font-medium text-gray-800 flex items-center">
              {user?.email || 'user@example.com'}
              <span className="ml-2 text-gray-400 text-xs">▼</span>
            </div>
          </div>
          
          <div className="flex items-center py-3 border-b border-[#eaeaea]/50 pr-4">
            <span className="w-20 flex-shrink-0 text-sm font-semibold text-gray-500">To</span>
            
            <div className="flex-1 flex flex-wrap gap-2 items-center">
              {(isRecipientsExpanded ? recipients : recipients.slice(0, 5)).map((email) => (
                <div key={email} className="bg-[#e8f7ec] border border-[#00A14B] px-3 py-1 rounded-full text-xs font-medium text-[#333] flex items-center gap-1 shadow-sm">
                  {email}
                  <button onClick={() => removeRecipient(email)} className="text-gray-500 hover:text-red-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {!isRecipientsExpanded && recipients.length > 5 && (
                <button 
                  onClick={() => setIsRecipientsExpanded(true)}
                  className="bg-[#e8f7ec] border border-[#00A14B] px-3 py-1 rounded-full text-xs font-medium text-[#333] hover:bg-[#d1ecd8] transition-colors shadow-sm"
                >
                  +{recipients.length - 5} more
                </button>
              )}
              <input 
                type="text"
                placeholder={recipients.length === 0 ? "recipient@example.com (press Enter)" : ""}
                className="flex-1 min-w-[200px] text-sm font-medium text-gray-800 placeholder-gray-300 focus:outline-none bg-transparent"
                value={singleRecipient}
                onChange={(e) => setSingleRecipient(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />
            </div>
            
            <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium flex items-center text-[#00A14B] hover:text-[#008f42] transition-colors flex-shrink-0 ml-4"
            >
              <Upload className="w-4 h-4 mr-1.5 mb-0.5" /> Upload List
            </button>
          </div>

          <div className="flex items-center py-3 border-b border-[#eaeaea]/50">
            <span className="w-20 text-sm font-semibold text-gray-500">Subject</span>
            <input 
              type="text" 
              placeholder="Enter subject" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-sm font-medium text-gray-800 placeholder-gray-300 focus:outline-none"
            />
          </div>

          {attachments.length > 0 && (
            <div className="flex items-start py-3 border-b border-[#eaeaea]/50">
              <span className="w-20 text-sm font-semibold text-gray-500 mt-1.5">Attached</span>
              <div className="flex-1 flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-md text-sm border border-gray-200">
                    <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-700 max-w-[200px] truncate">{file.name}</span>
                    <button onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500 ml-1">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center py-4 gap-8">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-500">Delay between 2 emails</span>
              <input 
                type="number" 
                value={delaySec}
                onChange={(e) => setDelaySec(Number(e.target.value))}
                className="w-20 border border-gray-200 rounded-md px-3 py-1 text-sm text-center focus:outline-none focus:border-[#00A14B]"
              />
              <span className="text-xs text-gray-400">sec</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-500">Hourly Limit</span>
              <input 
                type="number" 
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-20 border border-gray-200 rounded-md px-3 py-1 text-sm text-center focus:outline-none focus:border-[#00A14B]"
              />
            </div>
          </div>
        </div>

        {/* Rich Text Editor Mock */}
        <div className="flex flex-col bg-[#fafafa] rounded-xl border border-[#eaeaea] overflow-hidden min-h-[400px]">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-[#eaeaea] p-2 bg-white text-gray-400">
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"><ArrowLeft className="w-4 h-4 rotate-180" /></button>
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"><ArrowLeft className="w-4 h-4" /></button>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors font-serif font-bold text-sm">Tt</button>
            <button onClick={() => handleFormat('bold')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600"><Bold className="w-4 h-4" /></button>
            <button onClick={() => handleFormat('italic')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600"><Italic className="w-4 h-4" /></button>
            <button onClick={() => handleFormat('underline')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600"><Underline className="w-4 h-4" /></button>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600"><List className="w-4 h-4" /></button>
            <button onClick={() => handleFormat('insertOrderedList')} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600"><ListOrdered className="w-4 h-4" /></button>
            <button onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) handleFormat('createLink', url);
            }} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600"><Link className="w-4 h-4" /></button>
          </div>
          
          <div 
            ref={editorRef}
            contentEditable
            className="flex-1 w-full bg-transparent p-6 text-sm text-gray-800 focus:outline-none overflow-y-auto"
            onInput={(e) => setBody(e.currentTarget.innerHTML)}
            style={{ minHeight: '300px' }}
            data-placeholder="Type Your Reply..."
          />
        </div>

      </div>
    </div>
  );
}
