import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Search, RefreshCw, Clock, Send, Filter, ChevronDown } from 'lucide-react';
import type { SlackStatus, EmailJob, PaginatedResponse, SearchResponse } from '../types';
import toast from 'react-hot-toast';
import { ComposeModal } from '../components/emails/ComposeModal';
import { EmailTable } from '../components/emails/EmailTable';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'SENT'>('SCHEDULED');
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showFavourites, setShowFavourites] = useState(false);

  // Refs for click outside
  const filterRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stats state
  const [stats, setStats] = useState({ scheduled: 0, sent: 0 });

  const checkSlackStatus = useCallback(async () => {
    try {
      const response = await api.get<SlackStatus>('/api/slack/status');
      setSlackStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Slack status');
    }
  }, []);

  const fetchEmails = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      const endpoint = activeTab === 'SCHEDULED' ? '/api/emails/scheduled' : '/api/emails/sent';
      const query = `?page=${currentPage}&limit=20${showFavourites ? '&favourite=true' : ''}`;
      const response = await api.get<PaginatedResponse<EmailJob>>(`${endpoint}${query}`);
      setEmails(response.data.data);
      setTotalPages(Math.ceil(response.data.pagination.total / 20) || 1);
      
      // Fetch stats
      const statsResponse = await api.get('/api/emails/stats');
      setStats(statsResponse.data);
    } catch (error) {
      toast.error('Failed to load emails');
    } finally {
      setIsLoadingEmails(false);
    }
  }, [activeTab, showFavourites, currentPage]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSearching(false);
      fetchEmails();
      return;
    }
    
    setIsSearching(true);
    setIsLoadingEmails(true);
    try {
      const response = await api.get<SearchResponse>(`/api/emails/search?q=${encodeURIComponent(query)}&page=${currentPage}&limit=20`);
      setEmails(response.data.data);
      setTotalPages(Math.ceil(response.data.pagination.total / 20) || 1);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsLoadingEmails(false);
    }
  }, [fetchEmails, currentPage]);

  useEffect(() => {
    checkSlackStatus();
  }, [checkSlackStatus]);

  useEffect(() => {
    if (!isSearching) {
      fetchEmails();
    }
  }, [fetchEmails, isSearching, showFavourites, currentPage]);

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
    setCurrentPage(1);
    setIsSearching(false);
    fetchEmails();
  };

  const displayedEmails = useMemo(() => {
    let result = [...emails];
    // Backend returns oldest first (asc). Reverse for newest first.
    if (sortOrder === 'newest') {
      result.reverse();
    }
    return result;
  }, [emails, sortOrder]);

  return (
    <div className="min-h-screen bg-white flex text-[#222]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col pt-6 px-4">
        {/* Logo */}
        <div className="mb-8 pl-2">
          <h1 className="text-3xl font-extrabold tracking-tighter uppercase font-mono text-[#00A14B]">
            MailPilot
          </h1>
        </div>

        {/* User Profile */}
        <div className="relative mb-6" ref={userDropdownRef}>
          <button 
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="w-full bg-[#f7f8f9] rounded-xl p-3 flex items-center justify-between border border-[#eee] hover:bg-[#f0f2f5] transition-colors"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#eaeaea] flex items-center justify-center font-medium text-gray-500 flex-shrink-0">
                  {user?.name.charAt(0)}
                </div>
              )}
              <div className="flex flex-col items-start truncate">
                <span className="text-sm font-bold truncate text-[#222]">{user?.name}</span>
                <span className="text-xs text-gray-500 truncate">{user?.email}</span>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isUserDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#eaeaea] rounded-xl shadow-sm overflow-hidden z-50">
              <button 
                onClick={() => window.location.href = `${api.defaults.baseURL}/api/slack/connect`}
                className="w-full text-left px-4 py-3 text-sm text-[#333] hover:bg-gray-50 transition-colors flex flex-col justify-center"
              >
                <div className="flex items-center justify-between w-full">
                  <span>Slack</span>
                  {slackStatus.connected && <span className="text-xs text-[#00A14B] font-medium">Connected</span>}
                </div>
                {slackStatus.connected && slackStatus.teamName && (
                  <span className="text-xs text-gray-500 mt-1 truncate">{slackStatus.teamName}</span>
                )}
              </button>
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-50 transition-colors"
              >
                Log out
              </button>
            </div>
          )}
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
            onClick={() => { setActiveTab('SCHEDULED'); setSearchQuery(''); setCurrentPage(1); }}
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
            <span className="text-xs opacity-70">{stats.scheduled}</span>
          </button>

          <button
            onClick={() => { setActiveTab('SENT'); setSearchQuery(''); setCurrentPage(1); }}
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
            <span className="text-xs opacity-70">{stats.sent}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col border-l border-[#eaeaea] min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center px-6 gap-4 border-b border-[#eaeaea] bg-white">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search"
              className="w-full bg-[#f4f5f7] border-none rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A14B]/30 transition-shadow"
            />
          </div>
          <div className="flex items-center gap-3 text-gray-400 relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-full transition-colors ${isFilterOpen ? 'bg-gray-100 text-[#00A14B]' : 'hover:bg-gray-100'}`}
            >
              <Filter className="h-4 w-4" />
            </button>
            
            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute top-12 right-10 w-48 bg-white border border-[#eaeaea] rounded-xl shadow-lg p-3 z-50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sort By Date</h3>
                <div className="flex flex-col gap-1 mb-3">
                  <button 
                    onClick={() => { setSortOrder('newest'); setIsFilterOpen(false); }}
                    className={`text-left px-3 py-2 text-sm rounded-md transition-colors ${sortOrder === 'newest' ? 'bg-[#eef8f2] text-[#00A14B] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Newest First
                  </button>
                  <button 
                    onClick={() => { setSortOrder('oldest'); setIsFilterOpen(false); }}
                    className={`text-left px-3 py-2 text-sm rounded-md transition-colors ${sortOrder === 'oldest' ? 'bg-[#eef8f2] text-[#00A14B] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Oldest First
                  </button>
                </div>
                
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pt-2 border-t border-[#eaeaea]">Filter</h3>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mr-2 accent-[#00A14B]"
                      checked={showFavourites}
                      onChange={(e) => { setShowFavourites(e.target.checked); setCurrentPage(1); }}
                    />
                    Starred Only
                  </label>
                </div>
              </div>
            )}

            <button onClick={() => fetchEmails()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin text-[#00A14B]' : ''}`} />
            </button>
          </div>
        </header>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          <EmailTable 
            emails={displayedEmails} 
            isLoading={isLoadingEmails} 
            type={isSearching ? 'SEARCH' : activeTab} 
            onUpdate={fetchEmails}
          />
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="h-14 border-t border-[#eaeaea] bg-white flex items-center justify-between px-6">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-md transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        onSuccess={handleComposeSuccess}
      />
    </div>
  );
}
