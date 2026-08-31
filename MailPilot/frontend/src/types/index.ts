export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface EmailJob {
  id: string;
  batch_id: string;
  user_id: string;
  sender_id: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at: string | null;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  message_id: string | null;
  preview_url: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
  recipients: string[];
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
}

export interface SearchResponse {
  results: EmailJob[];
}
