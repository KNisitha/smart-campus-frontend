import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Bell, Search, Filter, Plus, X, 
  AlertCircle, RefreshCw, Trash2, 
  CheckCircle2, BellRing, ArrowLeft,
  CheckCheck, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsMode, setIsDetailsMode] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  // Form State (For Creation)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'General',
    priority: 'Normal',
    audience: 'All'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
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
    fetchData();
  }, []);

  // Normalization
  const normalizedNotifications = notifications.map(n => {
    const isImportant = n.priority?.toLowerCase() === 'high' || n.priority === 'urgent' || n.isImportant === true;
    const isRead = n.isRead || n.read || n.status === 'Read' || false;
    const createdAt = new Date(n.createdAt || n.date || Date.now());

    return {
      id: n._id || n.id,
      title: n.title || n.subject || 'New Notification',
      message: n.message || n.content || n.body || 'No details provided.',
      type: n.type || n.category || 'General',
      priority: n.priority || (isImportant ? 'High' : 'Normal'),
      isImportant,
      isRead,
      date: createdAt,
      raw: n
    };
  });

  const uniqueTypes = [...new Set(normalizedNotifications.map(n => n.type))];

  // Filtering & Sorting
  const filteredNotifications = normalizedNotifications.filter(n => {
    const searchMatch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = typeFilter === 'All' || n.type === typeFilter;
    
    let statusMatch = true;
    if (statusFilter === 'Unread') statusMatch = !n.isRead;
    if (statusFilter === 'Read') statusMatch = n.isRead;
    
    return searchMatch && typeMatch && statusMatch;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.date - a.date;
    if (sortBy === 'oldest') return a.date - b.date;
    return 0;
  });

  // Stats
  const totalCount = normalizedNotifications.length;
  const unreadCount = normalizedNotifications.filter(n => !n.isRead).length;
  const readCount = totalCount - unreadCount;
  const importantCount = normalizedNotifications.filter(n => n.isImportant).length;

  // Handlers
  const openCreateModal = () => {
    setFormData({
      title: '',
      message: '',
      type: 'General',
      priority: 'Normal',
      audience: 'All'
    });
    setSelectedNotification(null);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const openDetailsModal = (notification) => {
    setSelectedNotification(notification);
    setIsDetailsMode(true);
    setIsModalOpen(true);
    
    // Auto-mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification.id, true);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Please fill in Title and Message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        subject: formData.title,
        message: formData.message,
        content: formData.message,
        body: formData.message,
        type: formData.type,
        category: formData.type,
        priority: formData.priority,
        isImportant: formData.priority === 'High' || formData.priority === 'Urgent',
        audience: formData.audience
      };

      await api.post('/api/notifications', payload);
      toast.success("Notification sent successfully");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Operation failed:", err);
      toast.error(err.response?.data?.message || "Sending notifications might not be supported.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsRead = async (id, silent = false) => {
    try {
      await api.patch(`/api/notifications/${id}/read`).catch(() => {
        return api.put(`/api/notifications/${id}/read`).catch(() => {
          return api.put(`/api/notifications/${id}`, { isRead: true, read: true, status: 'Read' });
        });
      });
      if (!silent) {
        toast.success("Marked as read");
        fetchData();
      } else {
        // Optimistic silent update for modal open
        setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: true, read: true } : n));
      }
    } catch (err) {
      console.error("Mark read failed:", err);
      if (!silent) toast.error("Action not supported by backend.");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.patch('/api/notifications/read-all').catch(() => {
         return api.post('/api/notifications/mark-all-read');
      });
      toast.success("All notifications marked as read");
      fetchData();
    } catch (err) {
      console.error("Bulk mark read failed, attempting individual loops:", err);
      // Fallback: loop through unread
      const unreads = normalizedNotifications.filter(n => !n.isRead);
      let success = 0;
      for (const n of unreads) {
        try {
          await api.put(`/api/notifications/${n.id}`, { isRead: true, read: true });
          success++;
        } catch (e) {}
      }
      if (success > 0) {
        toast.success(`Marked ${success} as read`);
        fetchData();
      } else {
        toast.error("Operation not supported by backend.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    try {
      await api.delete(`/api/notifications/${id}`);
      toast.success("Notification deleted");
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(err.response?.data?.message || "Delete operation not supported by backend.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
          <RefreshCw size={16} className="mr-2" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Link to="/faculty" className="text-gray-500 hover:text-indigo-600 md:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
        </div>
        <div className="flex space-x-3">
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition shadow-sm font-medium text-sm"
            >
              <CheckCheck size={16} className="mr-2 text-indigo-600" /> Mark All Read
            </button>
          )}
          <button 
            onClick={openCreateModal}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium text-sm"
          >
            <Plus size={16} className="mr-2" /> Send Notification
          </button>
        </div>
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
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Unread</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{unreadCount}</span>
            <BellRing className="text-amber-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Read</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{readCount}</span>
            <CheckCircle2 className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Important</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{importantCount}</span>
            <Zap className="text-red-500" size={24} />
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
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 sm:text-sm"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
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

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Unread">Unread Only</option>
              <option value="Read">Read Only</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
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

      {/* Grid / List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <Bell size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Notifications Found</h2>
          <p className="text-gray-500">You are completely caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`bg-white rounded-lg shadow-sm border transition-all flex flex-col sm:flex-row overflow-hidden group ${
                !notification.isRead ? 'border-l-4 border-l-indigo-500 border-gray-200' : 'border-gray-100 opacity-80'
              }`}
            >
              <div 
                className="p-4 flex-1 cursor-pointer flex items-start space-x-4" 
                onClick={() => openDetailsModal(notification)}
              >
                <div className={`p-2 rounded-full mt-1 flex-shrink-0 ${
                  notification.isImportant ? 'bg-red-100 text-red-600' : 
                  !notification.isRead ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {notification.isImportant ? <Zap size={20} /> : <Bell size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold text-base line-clamp-1 pr-4 ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
                      {notification.date.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className={`text-sm line-clamp-1 mb-2 ${!notification.isRead ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">
                      {notification.type}
                    </span>
                    {notification.isImportant && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 uppercase tracking-wider">
                        High Priority
                      </span>
                    )}
                    <span className="text-xs text-gray-400 sm:hidden ml-auto">
                      {notification.date.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:py-0 border-t sm:border-t-0 sm:border-l border-gray-100 flex flex-row sm:flex-col items-center justify-end sm:justify-center space-x-3 sm:space-x-0 sm:space-y-3 min-w-[100px]">
                {!notification.isRead && (
                  <button onClick={() => handleMarkAsRead(notification.id)} className="text-gray-400 hover:text-indigo-600 transition" title="Mark as Read">
                    <CheckCircle2 size={20} />
                  </button>
                )}
                <button onClick={() => handleDelete(notification.id)} className="text-gray-400 hover:text-red-600 transition" title="Delete Notification">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Create or Details */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${isDetailsMode ? 'sm:max-w-2xl' : 'sm:max-w-xl'}`}>
              
              <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b flex justify-between items-start ${selectedNotification?.isImportant ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                <div className="pr-4">
                  <h3 className={`text-xl leading-6 font-bold ${selectedNotification?.isImportant ? 'text-red-900' : 'text-gray-900'}`} id="modal-title">
                    {isDetailsMode ? selectedNotification.title : 'Send Notification'}
                  </h3>
                  {isDetailsMode && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {selectedNotification.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {selectedNotification.date.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors bg-white/50 rounded-full p-1 flex-shrink-0">
                  <X size={24} />
                </button>
              </div>

              {!isDetailsMode ? (
                // FORM (Create)
                <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50 max-h-[70vh] overflow-y-auto">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject / Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Schedule Update"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        name="type"
                        placeholder="e.g. Academic, Alert"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High / Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                      <input
                        type="text"
                        name="audience"
                        placeholder="e.g. All Students"
                        value={formData.audience}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message Content <span className="text-red-500">*</span></label>
                    <textarea
                      name="message"
                      required
                      rows="5"
                      placeholder="Type the notification message here..."
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    ></textarea>
                  </div>

                  <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Notification'}
                    </button>
                  </div>
                </form>
              ) : (
                // DETAILS VIEW
                <div className="bg-gray-50 p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
                  <div className="bg-white p-5 rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {selectedNotification.message}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        handleDelete(selectedNotification.id);
                      }}
                      className="inline-flex justify-center rounded-md border border-red-200 px-4 py-2 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none transition-colors"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
