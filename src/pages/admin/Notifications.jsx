import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Search, Plus, Edit2, Trash2, X, Eye, 
  Bell, RefreshCcw, AlertCircle, CheckCircle, Mail, MailOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [readFilter, setReadFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  const NOTIFICATION_TYPES = [
    'announcement', 'assignment', 'attendance', 
    'marks', 'leave', 'complaint', 'event', 'system'
  ];

  // Form
  const [formData, setFormData] = useState({
    userId: '',
    title: '',
    message: '',
    type: 'system'
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await Promise.allSettled([
        api.get('/api/notifications'),
        api.get('/api/users')
      ]);

      if (results[0].status === 'rejected') {
        throw new Error('Failed to fetch notifications');
      }

      setNotifications(results[0].value?.data?.data || []);
      setUsers(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || []) : []);

    } catch (err) {
      console.error('Fetch error', err);
      setError('Failed to fetch notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Enrich notifications with user details
  const enrichedNotifications = notifications.map(notif => {
    const user = users.find(u => u._id === notif.userId) || {};
    return {
      ...notif,
      recipient: user
    };
  });

  // Summaries
  const totalNotifications = enrichedNotifications.length;
  const unreadCount = enrichedNotifications.filter(n => !n.isRead).length;
  const readCount = enrichedNotifications.filter(n => n.isRead).length;

  // Filtering
  let filteredList = enrichedNotifications.filter(n => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = n.title?.toLowerCase().includes(searchLower);
    const msgMatch = n.message?.toLowerCase().includes(searchLower);
    const recipientMatch = n.recipient?.name?.toLowerCase().includes(searchLower) || n.recipient?.email?.toLowerCase().includes(searchLower);
    
    const matchesSearch = !searchTerm || titleMatch || msgMatch || recipientMatch;
    const matchesType = typeFilter === 'All' || n.type === typeFilter;
    
    let matchesRead = true;
    if (readFilter === 'Unread') matchesRead = !n.isRead;
    if (readFilter === 'Read') matchesRead = n.isRead;

    return matchesSearch && matchesType && matchesRead;
  });

  // Sorting
  filteredList.sort((a, b) => {
    if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return 0;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await api.delete(`/api/notifications/${id}`);
      toast.success('Notification deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete notification');
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}`, { isRead: true });
      toast.success('Marked as read');
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const openFormModal = (notification = null) => {
    if (notification) {
      setSelectedNotification(notification);
      setFormData({
        userId: notification.userId || '',
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'system'
      });
    } else {
      setSelectedNotification(null);
      setFormData({
        userId: users.length > 0 ? users[0]._id : '',
        title: '',
        message: '',
        type: 'system'
      });
    }
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...formData };
      
      if (selectedNotification) {
        await api.patch(`/api/notifications/${selectedNotification._id}`, payload);
        toast.success('Notification updated successfully');
      } else {
        await api.post('/api/notifications', payload);
        toast.success('Notification created successfully');
      }
      setIsFormModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setFormLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('All');
    setReadFilter('All');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse h-24"></div>)}
        </div>
        <div className="bg-white rounded-lg shadow p-4 animate-pulse h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{error}</h2>
        <button onClick={fetchData} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          <RefreshCcw size={18} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
        <button 
          onClick={() => openFormModal()}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Send Notification
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Notifications</p>
            <p className="text-3xl font-bold text-gray-800">{totalNotifications}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Bell size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Unread</p>
            <p className="text-3xl font-bold text-orange-600">{unreadCount}</p>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
            <Mail size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Read</p>
            <p className="text-3xl font-bold text-green-600">{readCount}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <MailOpen size={24} />
          </div>
        </div>
      </div>

      {/* Controls Container */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
          
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <input 
                type="text" 
                placeholder="Search titles, messages, recipients..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Clear Filters */}
            {(searchTerm || typeFilter !== 'All' || readFilter !== 'All') && (
              <button 
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800 font-medium whitespace-nowrap self-start lg:self-center"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm capitalize"
            >
              <option value="All">All Types</option>
              {NOTIFICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select 
              value={readFilter} 
              onChange={(e) => setReadFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="All">All Status</option>
              <option value="Unread">Unread Only</option>
              <option value="Read">Read Only</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ml-auto"
            >
              <option value="newest">Created (Newest First)</option>
              <option value="oldest">Created (Oldest First)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Bell size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No notifications found</p>
              <p className="text-sm mt-1">Adjust your search or send a new notification.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">

              <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-semibold text-sm">Status</th>
                  <th className="p-4 font-semibold text-sm">Notification Details</th>
                  <th className="p-4 font-semibold text-sm">Recipient</th>
                  <th className="p-4 font-semibold text-sm">Type</th>
                  <th className="p-4 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map(n => (
                  <tr key={n._id} className={`transition-colors ${n.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}`}>
                    <td className="p-4">
                      {n.isRead ? (
                        <MailOpen size={20} className="text-gray-400" />
                      ) : (
                        <Mail size={20} className="text-blue-600" />
                      )}
                    </td>
                    <td className="p-4">
                      <p className={`font-bold mb-1 ${n.isRead ? 'text-gray-800' : 'text-blue-900'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px] lg:max-w-[300px]">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="p-4">
                      {n.recipient?.name ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{n.recipient.name}</p>
                          <p className="text-xs text-gray-500">{n.recipient.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-400">User Not Found</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700">
                        {n.type}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {!n.isRead && (
                          <button 
                            onClick={() => markAsRead(n._id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Mark as Read"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedNotification(n); setIsViewModalOpen(true); }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => openFormModal(n)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit Notification"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(n._id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Notification"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Notification Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedNotification.isRead ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-800'}`}>
                    {selectedNotification.isRead ? 'Read' : 'Unread'}
                  </span>
                  <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    Type: {selectedNotification.type}
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-gray-900">{selectedNotification.title}</h4>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Message</h5>
                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg text-sm border border-gray-100 whitespace-pre-wrap leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recipient Details</h5>
                {selectedNotification.recipient?.name ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{selectedNotification.recipient.name}</p>
                    <p className="text-xs text-gray-600">{selectedNotification.recipient.email}</p>
                    <p className="text-xs text-gray-500 capitalize mt-1">Role: {selectedNotification.recipient.role}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">User not found (ID: {selectedNotification.userId})</p>
                )}
              </div>
              
              <div className="mt-8 text-xs text-gray-400 flex justify-between border-t pt-4">
                <span>Created: {new Date(selectedNotification.createdAt).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              {!selectedNotification.isRead && (
                <button 
                  onClick={() => { markAsRead(selectedNotification._id); setIsViewModalOpen(false); }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium mr-2 flex items-center gap-2"
                >
                  <CheckCircle size={16} /> Mark Read
                </button>
              )}
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create/Edit) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">
                {selectedNotification ? 'Edit Notification' : 'Send Notification'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="notificationForm" onSubmit={handleFormSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient *</label>
                  <select 
                    required
                    value={formData.userId}
                    onChange={e => setFormData({...formData, userId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>Select User</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email}) - {u.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type *</label>
                  <select 
                    required
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                  >
                    {NOTIFICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief notification title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea 
                    required 
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
                    placeholder="Full notification message..."
                  />
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 mt-auto">
              <button 
                type="button" 
                onClick={() => setIsFormModalOpen(false)} 
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="notificationForm"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {formLoading ? 'Saving...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Notifications;
