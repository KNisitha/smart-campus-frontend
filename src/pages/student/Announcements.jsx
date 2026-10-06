import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Megaphone, Search, Filter, AlertCircle, 
  RefreshCw, Eye, Calendar, User, Tag, 
  ArrowLeft, X, ExternalLink, Bell, Zap 
} from 'lucide-react';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/announcements');
      
      const data = Array.isArray(response.data?.data || response.data) 
        ? (response.data?.data || response.data) 
        : [];
      
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Data Normalization
  const normalizedAnnouncements = announcements.map(a => {
    const isImportant = a.priority?.toLowerCase() === 'high' || a.priority === 'important' || a.isImportant === true;
    
    return {
      id: a._id || a.id,
      title: a.title || a.subject || 'Untitled Announcement',
      content: a.content || a.description || a.body || 'No content provided.',
      category: a.category || a.type || 'General',
      priority: a.priority || (a.isImportant ? 'High' : 'Normal'),
      isImportant,
      date: new Date(a.date || a.publishedAt || a.createdAt || Date.now()),
      author: a.author?.name || a.authorName || a.publisher || 'Admin',
      attachment: a.attachment || a.link || a.url || null,
      isRead: a.isRead || false, // Fallback safe false if unsupported
      raw: a
    };
  });

  const uniqueCategories = [...new Set(normalizedAnnouncements.map(a => a.category))];
  const uniquePriorities = [...new Set(normalizedAnnouncements.map(a => a.priority))];

  // Filtering & Sorting
  const filteredAnnouncements = normalizedAnnouncements.filter(a => {
    const searchMatch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const categoryMatch = categoryFilter === 'All' || a.category === categoryFilter;
    const priorityMatch = priorityFilter === 'All' || a.priority === priorityFilter;
    
    return searchMatch && categoryMatch && priorityMatch;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.date - a.date;
    if (sortBy === 'oldest') return a.date - b.date;
    return 0;
  });

  // Summary Stats
  const totalCount = normalizedAnnouncements.length;
  const importantCount = normalizedAnnouncements.filter(a => a.isImportant).length;
  
  // Calculate recent (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCount = normalizedAnnouncements.filter(a => a.date >= sevenDaysAgo).length;

  // Unread count if supported (only count if explicitly present in the data structure)
  const supportsReadStatus = announcements.some(a => 'isRead' in a);
  const unreadCount = supportsReadStatus ? normalizedAnnouncements.filter(a => !a.isRead).length : 0;

  // Handlers
  const handleOpenAnnouncement = async (announcement) => {
    setSelectedAnnouncement(announcement);
    
    // If backend supports read receipts and it's currently unread, try to mark it read
    if (supportsReadStatus && !announcement.isRead) {
      try {
        // Attempt a standard read receipt endpoint
        await api.patch(`/api/announcements/${announcement.id}/read`).catch(() => {
          return api.put(`/api/announcements/${announcement.id}`, { isRead: true });
        });
        
        // Optimistically update UI
        setAnnouncements(prev => prev.map(a => 
          (a._id === announcement.id || a.id === announcement.id) ? { ...a, isRead: true } : a
        ));
      } catch (err) {
        // Silently fail as this is an opportunistic read receipt attempt
        console.warn("Could not mark as read", err);
      }
    }
  };

  const getPriorityBadge = (isImportant, priority) => {
    if (isImportant) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <Zap size={12} className="mr-1 text-red-600" />
          {priority}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
        {priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading announcements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchAnnouncements} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Link to="/student" className="text-gray-500 hover:text-blue-600 md:hidden"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Updates</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalCount}</span>
            <Megaphone className="text-blue-400" size={24} />
          </div>
        </div>

        {supportsReadStatus && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-400">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Unread</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-bold text-gray-800">{unreadCount}</span>
              <Bell className="text-blue-400" size={24} />
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Important</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{importantCount}</span>
            <AlertCircle className="text-red-500" size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Recent (7 Days)</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{recentCount}</span>
            <RefreshCw className="text-green-400" size={24} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 sm:text-sm"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {uniqueCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          {uniquePriorities.length > 0 && (
            <div className="relative">
              <select
                className="appearance-none w-full sm:w-32 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="All">All Priorities</option>
                {uniquePriorities.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Filter size={14} />
              </div>
            </div>
          )}

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-40 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
            <Megaphone size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Announcements Found</h2>
            <p className="text-gray-500">There are no announcements matching your current filters.</p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`bg-white rounded-lg shadow-sm border transition-shadow cursor-pointer overflow-hidden ${
                announcement.isImportant ? 'border-red-200 hover:shadow-md' : 'border-gray-100 hover:shadow-md'
              } ${supportsReadStatus && !announcement.isRead ? 'bg-blue-50/20' : ''}`}
              onClick={() => handleOpenAnnouncement(announcement)}
            >
              <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {getPriorityBadge(announcement.isImportant, announcement.priority)}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {announcement.category}
                    </span>
                    {supportsReadStatus && !announcement.isRead && (
                       <span className="inline-block w-2 h-2 rounded-full bg-blue-600 ml-1"></span>
                    )}
                  </div>
                  
                  <h3 className={`font-bold text-lg mb-1 ${announcement.isImportant ? 'text-red-900' : 'text-gray-800'}`}>
                    {announcement.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {announcement.content}
                  </p>
                </div>

                <div className="flex flex-row md:flex-col justify-between items-center md:items-end text-xs text-gray-500 border-t md:border-t-0 pt-3 md:pt-0 mt-3 md:mt-0 min-w-[120px]">
                  <span className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    {announcement.date.toLocaleDateString()}
                  </span>
                  <span className="flex items-center md:mt-2 text-blue-600 font-medium hover:underline">
                    Read More <Eye size={14} className="ml-1" />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedAnnouncement(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              
              {/* Modal Header */}
              <div className={`px-4 pt-5 pb-4 sm:p-6 border-b ${selectedAnnouncement.isImportant ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      {getPriorityBadge(selectedAnnouncement.isImportant, selectedAnnouncement.priority)}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {selectedAnnouncement.category}
                      </span>
                    </div>
                    <h3 className={`text-xl sm:text-2xl leading-tight font-bold ${selectedAnnouncement.isImportant ? 'text-red-900' : 'text-gray-900'}`} id="modal-title">
                      {selectedAnnouncement.title}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedAnnouncement(null)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white/50 rounded-full p-1">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-4 py-5 sm:p-6 bg-white space-y-6">
                
                <div className="flex flex-wrap gap-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="mr-2 text-gray-400" size={16} />
                    <span className="font-medium mr-1">Published:</span> 
                    {selectedAnnouncement.date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="mr-2 text-gray-400" size={16} />
                    <span className="font-medium mr-1">Author:</span> 
                    {selectedAnnouncement.author}
                  </div>
                </div>

                <div className="prose prose-sm sm:prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </div>

                {selectedAnnouncement.attachment && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <a 
                      href={selectedAnnouncement.attachment}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="inline-flex items-center px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      View Attachment / Link
                    </a>
                  </div>
                )}
                
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
