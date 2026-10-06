import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Megaphone, Search, Filter, Plus, X, 
  AlertCircle, RefreshCw, Trash2, Edit3, 
  Calendar, Eye, ArrowLeft, Zap, CheckCircle, 
  Clock, Flag
} from 'lucide-react';
import toast from 'react-hot-toast';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsMode, setIsDetailsMode] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    priority: 'Normal',
    audience: 'All'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
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
    fetchData();
  }, []);

  // Normalization
  const normalizedAnnouncements = announcements.map(a => {
    const isImportant = a.priority?.toLowerCase() === 'high' || a.priority === 'urgent' || a.isImportant === true;
    const createdAt = new Date(a.date || a.publishedAt || a.createdAt || Date.now());
    
    // Calculate if it's considered "Recent" (within last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const isRecent = createdAt >= fourteenDaysAgo;

    let status = 'Active';
    // If backend provides an expiry date, calculate if it's expired
    if (a.expiryDate || a.expiresAt || a.validUntil) {
      const expiry = new Date(a.expiryDate || a.expiresAt || a.validUntil);
      if (expiry < new Date()) status = 'Expired';
    }

    return {
      id: a._id || a.id,
      title: a.title || a.subject || 'Untitled Announcement',
      content: a.content || a.description || a.body || 'No content provided.',
      category: a.category || a.type || 'General',
      priority: a.priority || (a.isImportant ? 'High' : 'Normal'),
      audience: a.targetAudience || a.audience || 'All',
      isImportant,
      isRecent,
      date: createdAt,
      status: a.status || status,
      author: a.author?.name || a.authorName || a.publisher || 'Admin / Faculty',
      raw: a
    };
  });

  const uniqueCategories = [...new Set(normalizedAnnouncements.map(a => a.category))];
  const uniquePriorities = [...new Set(normalizedAnnouncements.map(a => a.priority))];

  // Filtering & Sorting
  const filteredAnnouncements = normalizedAnnouncements.filter(a => {
    const searchMatch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.author.toLowerCase().includes(searchQuery.toLowerCase());
    const categoryMatch = categoryFilter === 'All' || a.category === categoryFilter;
    const priorityMatch = priorityFilter === 'All' || a.priority === priorityFilter;
    const statusMatch = statusFilter === 'All' || a.status === statusFilter;
    
    return searchMatch && categoryMatch && priorityMatch && statusMatch;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.date - a.date;
    if (sortBy === 'oldest') return a.date - b.date;
    return 0;
  });

  // Stats
  const totalCount = normalizedAnnouncements.length;
  const recentCount = normalizedAnnouncements.filter(a => a.isRecent).length;
  const importantCount = normalizedAnnouncements.filter(a => a.isImportant).length;
  const expiredCount = normalizedAnnouncements.filter(a => a.status === 'Expired').length;

  // Handlers
  const openCreateModal = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      priority: 'Normal',
      audience: 'All'
    });
    setSelectedAnnouncement(null);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      priority: announcement.priority,
      audience: announcement.audience
    });
    setSelectedAnnouncement(announcement);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const openDetailsModal = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDetailsMode(true);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in Title and Content.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        subject: formData.title,
        content: formData.content,
        description: formData.content,
        body: formData.content,
        category: formData.category,
        type: formData.category,
        priority: formData.priority,
        isImportant: formData.priority === 'High' || formData.priority === 'Urgent',
        audience: formData.audience,
        targetAudience: formData.audience
      };

      if (selectedAnnouncement && selectedAnnouncement.id) {
        await api.put(`/api/announcements/${selectedAnnouncement.id}`, payload).catch(() => {
          return api.patch(`/api/announcements/${selectedAnnouncement.id}`, payload);
        });
        toast.success("Announcement updated successfully");
      } else {
        await api.post('/api/announcements', payload);
        toast.success("Announcement created successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Operation failed:", err);
      toast.error(err.response?.data?.message || "Operation failed. Backend might not support this action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/api/announcements/${id}`);
      toast.success("Announcement deleted");
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
          <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        </div>
        <button 
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" /> Publish Announcement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Notices</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalCount}</span>
            <Megaphone className="text-gray-400" size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Recent (14 Days)</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{recentCount}</span>
            <Clock className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Important</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{importantCount}</span>
            <Zap className="text-red-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-gray-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Expired</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{expiredCount}</span>
            <CheckCircle className="text-gray-500" size={24} />
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
            placeholder="Search by title, content, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[120px]">
            <select
              className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
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

          <div className="relative flex-1 min-w-[120px]">
            <select
              className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
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

          <div className="relative flex-1 min-w-[120px]">
            <select
              className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative flex-1 min-w-[140px]">
            <select
              className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
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

      {/* Grid */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <Megaphone size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Announcements Found</h2>
          <p className="text-gray-500">There are no notices matching your current criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`bg-white rounded-lg shadow-sm border transition-shadow flex flex-col md:flex-row overflow-hidden ${
                announcement.isImportant ? 'border-red-200 hover:shadow-md' : 'border-gray-100 hover:shadow-md'
              }`}
            >
              <div className="p-5 flex-1 cursor-pointer" onClick={() => openDetailsModal(announcement)}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {announcement.isImportant && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                      <Zap size={12} className="mr-1 text-red-600" />
                      {announcement.priority}
                    </span>
                  )}
                  {!announcement.isImportant && announcement.priority && announcement.priority !== 'Normal' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {announcement.priority}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {announcement.category}
                  </span>
                  {announcement.status === 'Expired' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600 border border-gray-300">
                      Expired
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto hidden md:flex items-center">
                    <Calendar size={12} className="mr-1" />
                    {announcement.date.toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className={`font-bold text-lg line-clamp-1 mb-1 ${announcement.isImportant ? 'text-red-900' : 'text-gray-800'}`}>
                  {announcement.title}
                </h3>
                
                <p className="text-sm text-gray-600 line-clamp-2">
                  {announcement.content}
                </p>
                
                <div className="md:hidden mt-3 text-xs text-gray-400 flex items-center border-t border-gray-50 pt-2">
                  <Calendar size={12} className="mr-1" />
                  {announcement.date.toLocaleDateString()}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 md:py-5 border-t md:border-t-0 md:border-l border-gray-100 flex flex-row md:flex-col items-center justify-end space-x-2 md:space-x-0 md:space-y-2 min-w-[120px]">
                <button onClick={() => openDetailsModal(announcement)} className="w-full justify-center flex items-center px-3 py-1.5 text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-200 rounded transition shadow-sm text-sm font-medium" title="View Details">
                  <Eye size={14} className="mr-1.5" /> View
                </button>
                <button onClick={() => openEditModal(announcement)} className="w-full justify-center flex items-center px-3 py-1.5 text-gray-600 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-200 rounded transition shadow-sm text-sm font-medium" title="Edit">
                  <Edit3 size={14} className="mr-1.5" /> Edit
                </button>
                <button onClick={() => handleDelete(announcement.id)} className="w-full justify-center flex items-center px-3 py-1.5 text-gray-600 hover:text-red-600 bg-white border border-gray-200 hover:border-red-200 rounded transition shadow-sm text-sm font-medium" title="Delete">
                  <Trash2 size={14} className="mr-1.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Create/Edit/Details */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${isDetailsMode ? 'sm:max-w-3xl' : 'sm:max-w-2xl'}`}>
              
              <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b flex justify-between items-start ${selectedAnnouncement?.isImportant ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                <div>
                  <h3 className={`text-xl leading-6 font-bold flex items-center ${selectedAnnouncement?.isImportant ? 'text-red-900' : 'text-gray-900'}`} id="modal-title">
                    {isDetailsMode ? selectedAnnouncement.title : selectedAnnouncement ? 'Edit Announcement' : 'Publish Announcement'}
                  </h3>
                  {isDetailsMode && (
                    <div className="flex items-center gap-2 mt-2">
                      {selectedAnnouncement.isImportant && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <Zap size={12} className="mr-1 text-red-600" /> High Priority
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {selectedAnnouncement.category}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors bg-white/50 rounded-full p-1">
                  <X size={24} />
                </button>
              </div>

              {!isDetailsMode ? (
                // FORM (Create / Edit)
                <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50 max-h-[70vh] overflow-y-auto">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Campus Placement Drive"
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
                        name="category"
                        placeholder="e.g. Notice, Placement, Exam"
                        value={formData.category}
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
                        <option value="High">High (Important)</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                      <input
                        type="text"
                        name="audience"
                        placeholder="e.g. All Students, CS Dept"
                        value={formData.audience}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Content <span className="text-red-500">*</span></label>
                    <textarea
                      name="content"
                      required
                      rows="6"
                      placeholder="Provide full details here..."
                      value={formData.content}
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
                      {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </div>
                </form>
              ) : (
                // DETAILS VIEW
                <div className="bg-gray-50 p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-200 pb-4 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Published Date</p>
                      <p className="font-semibold text-gray-800">{selectedAnnouncement.date.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Author</p>
                      <p className="font-semibold text-gray-800">{selectedAnnouncement.author}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Audience</p>
                      <p className="font-semibold text-gray-800">{selectedAnnouncement.audience}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Status</p>
                      <p className={`font-semibold ${selectedAnnouncement.status === 'Expired' ? 'text-gray-400' : 'text-emerald-600'}`}>{selectedAnnouncement.status}</p>
                    </div>
                  </div>

                  <div>
                    <div className="bg-white p-5 rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                      {selectedAnnouncement.content}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-gray-200 mt-2">
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

export default Announcements;
