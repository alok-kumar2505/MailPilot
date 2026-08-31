import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LogOut, Search, RefreshCw, Clock, Send, Filter, ChevronDown } from 'lucide-react';
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

  const handleComposeSuccess = () => {
    setActiveTab('SCHEDULED');
    setSearchQuery('');
    setIsSearching(false);
    fetchEmails();
  };

  return (
    <div className="min-h-screen bg-white flex text-[#222]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col pt-6 px-4">
        {/* Logo */}
        <div className="mb-8 pl-2">
          <h1 className="text-3xl font-extrabold tracking-tighter uppercase font-mono">
            ONB
          </h1>
        </div>

        {/* User Profile */}
        <div className="bg-[#f7f8f9] rounded-xl p-3 flex items-center justify-between mb-6 border border-[#eee]">
          <div className="flex items-center gap-3 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-500 flex-shrink-0">
                {user?.name.charAt(0)}
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold truncate">{user?.name}</span>
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
            </div>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600 transition-colors" title="Logout">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Compose Button */}
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="w-full bg-white border border-[#00A14B] text-[#00A14B] hover:bg-[#f3fbf6] font-medium rounded-full py-2.5 transition-colors mb-8"
        >
          Compose
        </button>

        {/* Navigation */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-2">Core</p>
          
          <button
            onClick={() => { setActiveTab('SCHEDULED'); setSearchQuery(''); }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'SCHEDULED' && !isSearching
                ? 'bg-[#eef8f2] text-[#00A14B]'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4" />
              <span>Scheduled</span>
            </div>
            {/* Mocked counts based on screenshots */}
            <span className="text-xs opacity-70">12</span>
          </button>

          <button
            onClick={() => { setActiveTab('SENT'); setSearchQuery(''); }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'SENT' && !isSearching
                ? 'bg-[#eef8f2] text-[#00A14B]'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="h-4 w-4" />
              <span>Sent</span>
            </div>
            <span className="text-xs opacity-70">785</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col border-l border-[#eaeaea]">
        {/* Top bar */}
        <header className="h-16 flex items-center px-6 gap-4 border-b border-[#eaeaea] bg-white">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-[#f4f5f7] border-none rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A14B]/30 transition-shadow"
            />
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Filter className="h-4 w-4" />
            </button>
            <button onClick={() => fetchEmails()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin text-[#00A14B]' : ''}`} />
            </button>
          </div>
        </header>

        {/* List Content */}
        <div className="flex-1 overflow-auto bg-white">
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
