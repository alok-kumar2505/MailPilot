import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { api } from '../services/api';
import { LogOut, Plus, Hash, Search, RefreshCw } from 'lucide-react';
import type { SlackStatus, EmailJob, PaginatedResponse, SearchResponse } from '../types';
import toast from 'react-hot-toast';
import { ComposeModal } from '../components/emails/ComposeModal';
import { EmailTable } from '../components/emails/EmailTable';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'SENT'>('SCHEDULED');
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [isCheckingSlack, setIsCheckingSlack] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const checkSlackStatus = useCallback(async () => {
    try {
      const response = await api.get<SlackStatus>('/api/slack/status');
      setSlackStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Slack status');
    } finally {
      setIsCheckingSlack(false);
    }
  }, []);

  const fetchEmails = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      const endpoint = activeTab === 'SCHEDULED' ? '/api/emails/scheduled' : '/api/emails/sent';
      const response = await api.get<PaginatedResponse<EmailJob>>(endpoint);
      setEmails(response.data.data);
    } catch (error) {
      toast.error('Failed to load emails');
    } finally {
      setIsLoadingEmails(false);
    }
  }, [activeTab]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSearching(false);
      fetchEmails();
      return;
    }
    
    setIsSearching(true);
    setIsLoadingEmails(true);
    try {
      const response = await api.get<SearchResponse>(`/api/emails/search?q=${encodeURIComponent(query)}`);
      setEmails(response.data.results);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsLoadingEmails(false);
    }
  }, [fetchEmails]);

  useEffect(() => {
    checkSlackStatus();
  }, [checkSlackStatus]);

  useEffect(() => {
    if (!isSearching) {
      fetchEmails();
    }
  }, [fetchEmails, isSearching]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        handleSearch(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleSlackConnect = () => {
    window.location.href = `${api.defaults.baseURL}/api/slack/connect`;
  };

  const handleSlackDisconnect = async () => {
    try {
      await api.delete('/api/slack/disconnect');
      setSlackStatus({ connected: false });
      toast.success('Slack disconnected successfully');
    } catch (error) {
      toast.error('Failed to disconnect Slack');
    }
  };

  const handleComposeSuccess = () => {
    setActiveTab('SCHEDULED');
    setSearchQuery('');
    setIsSearching(false);
    fetchEmails();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center border border-[var(--color-primary)]/30">
              <span className="text-[var(--color-primary)] font-bold">R</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">ReachInbox</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full ring-2 ring-[var(--color-border)]" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--color-border)] flex items-center justify-center text-white font-medium">
                  {user?.name.charAt(0)}
                </div>
              )}
              <div className="flex flex-col hidden sm:flex">
                <span className="text-sm font-medium text-white">{user?.name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{user?.email}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10">
              <LogOut className="h-4 w-4 mr-2 hidden sm:inline-block" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex rounded-lg bg-[var(--color-surface)] p-1 border border-[var(--color-border)]">
            <button
              onClick={() => {
                setActiveTab('SCHEDULED');
                setSearchQuery('');
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'SCHEDULED' && !isSearching
                  ? 'bg-[var(--color-primary)] text-white shadow-md' 
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Scheduled Emails
            </button>
            <button
              onClick={() => {
                setActiveTab('SENT');
                setSearchQuery('');
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'SENT' && !isSearching
                  ? 'bg-[var(--color-primary)] text-white shadow-md' 
                  : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Sent Emails
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isCheckingSlack && (
              slackStatus.connected ? (
                <Button variant="secondary" onClick={handleSlackDisconnect} className="gap-2 text-[var(--color-text-muted)]">
                  <Hash className="h-4 w-4 text-[var(--color-success)]" />
                  <span className="hidden sm:inline">Slack Connected</span>
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleSlackConnect} className="gap-2">
                  <Hash className="h-4 w-4" />
                  Connect Slack
                </Button>
              )
            )}
            <Button onClick={() => setIsComposeOpen(true)} className="gap-2 w-full sm:w-auto shadow-lg shadow-[var(--color-primary)]/20">
              <Plus className="h-4 w-4" />
              Compose Email
            </Button>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search across all emails (Elasticsearch powered)..."
            className="w-full h-12 pl-10 pr-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
          />
          <button 
            onClick={() => fetchEmails()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-border)] transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
          </button>
        </div>

        {/* Email Table */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm min-h-[400px]">
          <EmailTable 
            emails={emails} 
            isLoading={isLoadingEmails} 
            type={isSearching ? 'SEARCH' : activeTab} 
          />
        </div>
      </main>

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        onSuccess={handleComposeSuccess}
      />
    </div>
  );
}
