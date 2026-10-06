import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Bell, Search, Filter, AlertCircle, 
  RefreshCw, CheckCircle, Clock, CheckCircle2,
  X, ExternalLink, ArrowLeft, Mail, MailOpen, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [readFilter, setReadFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Actions state
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Modal
  const [selectedNotification, setSelectedNotification] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/notifications');
      
      const data = Array.isArray(response.data?.data || response.data) 
        ? (response.data?.data || response.data) 
        : [];
      
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Data Normalization
  const normalizedNotifications = notifications.map(n => {
    const isImportant = n.priority?.toLowerCase() === 'high' || n.priority === 'urgent' || n.isImportant === true;
    
    return {
      id: n._id || n.id,
      title: n.title || n.subject || 'Notification',
      message: n.message || n.content || n.body || 'No message provided.',
      type: n.type || n.category || 'General',
      priority: n.priority || (n.isImportant ? 'High' : 'Normal'),
      isImportant,
      date: new Date(n.date || n.createdAt || n.timestamp || Date.now()),
      isRead: n.isRead || n.read || false,
      link: n.link || n.url || n.relatedUrl || null,
      raw: n
    };
  });

  const uniqueTypes = [...new Set(normalizedNotifications.map(n => n.type))];
  const uniquePriorities = [...new Set(normalizedNotifications.map(n => n.priority))];

  // Filtering & Sorting
  const filteredNotifications = normalizedNotifications.filter(n => {
    const searchMatch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = typeFilter === 'All' || n.type === typeFilter;
    const priorityMatch = priorityFilter === 'All' || n.priority === priorityFilter;
    
    let readMatch = true;
    if (readFilter === 'Unread') readMatch = !n.isRead;
    else if (readFilter === 'Read') readMatch = n.isRead;
    
    return searchMatch && typeMatch && priorityMatch && readMatch;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.date - a.date;
    if (sortBy === 'oldest') return a.date - b.date;
    return 0;
  });

  // Summary Stats
  const totalCount = normalizedNotifications.length;
  const unreadCount = normalizedNotifications.filter(n => !n.isRead).length;
  const readCount = totalCount - unreadCount;
  const importantCount = normalizedNotifications.filter(n => n.isImportant).length;

  const supportsReadStatus = unreadCount > 0 || readCount > 0 || notifications.some(n => 'isRead' in n || 'read' in n);

  // Handlers
  const handleOpenNotification = async (notification) => {
    setSelectedNotification(notification);
    
    if (supportsReadStatus && !notification.isRead) {
      try {
        // Attempt multiple standard endpoints silently
        await api.patch(`/api/notifications/${notification.id}/read`).catch(() => {
          return api.put(`/api/notifications/${notification.id}`, { isRead: true, read: true });
        });
        
        // Optimistic UI update
        setNotifications(prev => prev.map(n => 
          (n._id === notification.id || n.id === notification.id) 
            ? { ...n, isRead: true, read: true } 
            : n
        ));
      } catch (err) {
        console.warn("Mark as read is not supported or failed", err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!supportsReadStatus || unreadCount === 0) return;
    
    setIsMarkingAll(true);
    try {
      await api.post('/api/notifications/mark-all-read').catch(() => {
        return api.patch('/api/notifications/read-all');
      });
      toast.success("All notifications marked as read");
      
      // Optimistic UI update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
    } catch (err) {
      console.warn("Mark all as read failed", err);
      toast.error("Operation not supported by backend.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getPriorityBadge = (isImportant, priority) => {
    if (isImportant) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <Zap size={10} className="mr-1 text-red-600" />
          {priority}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
        {priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchNotifications} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Link to="/student" className="text-gray-500 hover:text-blue-600 md:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
        </div>
        
        {supportsReadStatus && unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition shadow-sm font-medium disabled:opacity-50"
          >
            <CheckCircle2 size={18} className="mr-2" />
            {isMarkingAll ? 'Processing...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalCount}</span>
            <Bell className="text-gray-400" size={24} />
          </div>
        </div>

        {supportsReadStatus && (
          <>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Unread</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold text-gray-800">{unreadCount}</span>
                <Mail className="text-blue-500" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-green-500">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Read</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold text-gray-800">{readCount}</span>
                <MailOpen className="text-green-500" size={24} />
              </div>
            </div>
          </>
        )}

        <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500 ${!supportsReadStatus ? 'col-span-2 md:col-span-1' : ''}`}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Important</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{importantCount}</span>
            <AlertCircle className="text-red-500" size={24} />
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
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[120px]">
            <select
              className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              {uniqueTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          {supportsReadStatus && (
            <div className="relative flex-1 min-w-[120px]">
              <select
                className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Unread">Unread</option>
                <option value="Read">Read</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Filter size={14} />
              </div>
            </div>
          )}

          {uniquePriorities.length > 0 && (
            <div className="relative flex-1 min-w-[120px]">
              <select
                className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
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

          <div className="relative flex-1 min-w-[140px]">
            <select
              className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
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

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
            <Bell size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Notifications Found</h2>
            <p className="text-gray-500">You're all caught up with your updates.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`bg-white rounded-lg shadow-sm border transition-shadow cursor-pointer p-4 md:p-5 flex gap-4 ${
                notif.isImportant ? 'border-red-200' : 'border-gray-100'
              } ${supportsReadStatus && !notif.isRead ? 'bg-blue-50/20 border-l-4 border-l-blue-500' : 'hover:shadow-md'}`}
              onClick={() => handleOpenNotification(notif)}
            >
              {/* Icon Status */}
              <div className="hidden sm:flex flex-shrink-0 mt-1">
                {supportsReadStatus && !notif.isRead ? (
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Mail size={20} />
                  </div>
                ) : (
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${notif.isImportant ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                    {notif.isImportant ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {getPriorityBadge(notif.isImportant, notif.priority)}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {notif.type}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto flex items-center whitespace-nowrap">
                    <Clock size={12} className="mr-1" />
                    {notif.date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <h3 className={`font-semibold text-base md:text-lg mb-1 line-clamp-1 ${supportsReadStatus && !notif.isRead ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                  {notif.title}
                </h3>
                
                <p className={`text-sm line-clamp-2 ${supportsReadStatus && !notif.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                  {notif.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedNotification(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              
              <div className={`px-4 pt-5 pb-4 sm:p-6 border-b ${selectedNotification.isImportant ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      {getPriorityBadge(selectedNotification.isImportant, selectedNotification.priority)}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {selectedNotification.type}
                      </span>
                    </div>
                    <h3 className={`text-xl sm:text-2xl leading-tight font-bold ${selectedNotification.isImportant ? 'text-red-900' : 'text-gray-900'}`} id="modal-title">
                      {selectedNotification.title}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedNotification(null)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white/50 rounded-full p-1">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="px-4 py-5 sm:p-6 bg-white space-y-6">
                
                <div className="flex items-center text-sm text-gray-500 border-b border-gray-100 pb-4">
                  <Clock className="mr-2 text-gray-400" size={16} />
                  <span className="font-medium mr-1">Received:</span> 
                  {selectedNotification.date.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="prose prose-sm sm:prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </div>

                {selectedNotification.link && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <a 
                      href={selectedNotification.link}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="inline-flex items-center justify-center px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium w-full sm:w-auto"
                    >
                      View Related Information
                      <ExternalLink size={16} className="ml-2" />
                    </a>
                  </div>
                )}
                
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setSelectedNotification(null)}
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

export default Notifications;
