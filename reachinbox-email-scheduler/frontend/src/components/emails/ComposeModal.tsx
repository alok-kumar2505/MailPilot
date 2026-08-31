import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileType, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { api } from '../../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayMs, setDelayMs] = useState(1000);
  const [hourlyLimit, setHourlyLimit] = useState(500);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = (file: File) => {
    Papa.parse(file, {
      complete: (results) => {
        const emails = new Set<string>();
        let invalidCount = 0;

        results.data.forEach((row: any) => {
          // Assume the first column or any cell might contain the email
          const cells = Array.isArray(row) ? row : Object.values(row);
          cells.forEach(cell => {
            if (typeof cell === 'string') {
              const cleaned = cell.trim();
              if (cleaned.includes('@')) {
                // Extremely basic regex for rapid validation, backend handles strict rules
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
      error: () => {
        toast.error('Failed to parse CSV file');
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body || !startTime) {
      return toast.error('Please fill in all required fields');
    }
    if (recipients.length === 0) {
      return toast.error('Please upload a CSV with at least one recipient');
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/emails', {
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delayBetweenMs: delayMs,
        hourlyLimit,
        recipients,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Compose Email Sequence">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div 
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            isDragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          {recipients.length > 0 ? (
            <div className="flex flex-col items-center text-[var(--color-success)]">
              <CheckCircle2 className="h-10 w-10 mb-2" />
              <p className="font-medium">{recipients.length} recipients loaded</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Click or drag to replace file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-[var(--color-text-muted)] cursor-pointer">
              <Upload className="h-10 w-10 mb-2" />
              <p className="font-medium">Drag & drop CSV or TXT file here</p>
              <p className="text-sm mt-1">or click to browse</p>
            </div>
          )}
        </div>

        <Input 
          label="Subject" 
          placeholder="Enter email subject..." 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-sm font-medium text-[var(--color-text-muted)]">Body (HTML supported)</label>
          <textarea 
            className="flex min-h-[120px] w-full rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm text-white border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            placeholder="Type your email body here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Start Time" 
            type="datetime-local" 
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input 
            label="Delay (ms)" 
            type="number" 
            min="1000"
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            required
          />
        </div>

        <Input 
          label="Hourly Limit" 
          type="number" 
          min="1"
          value={hourlyLimit}
          onChange={(e) => setHourlyLimit(Number(e.target.value))}
          required
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Schedule Sequence</Button>
        </div>
      </form>
    </Modal>
  );
}
