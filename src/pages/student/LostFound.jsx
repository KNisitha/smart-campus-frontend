import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  Search, Filter, MapPin, Calendar, Clock, 
  PackageSearch, Eye, Plus, X, AlertCircle, 
  RefreshCw, CheckCircle, Package, Archive,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const LostFound = () => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reportType, setReportType] = useState('Lost'); // 'Lost' or 'Found'

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electronics',
    description: '',
    location: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/lost-found');
      
      const data = Array.isArray(response.data?.data || response.data) 
        ? (response.data?.data || response.data) 
        : [];
      
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch lost/found items:", err);
      setError(err.response?.data?.message || 'Failed to load Lost & Found items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Data Normalization
  const normalizedItems = items.map(item => ({
    id: item._id || item.id,
    title: item.title || item.itemName || item.name || 'Unknown Item',
    type: item.type || item.reportType || 'Lost', // 'Lost' or 'Found'
    category: item.category || 'General',
    description: item.description || 'No description provided.',
    location: item.location || 'Campus',
    date: new Date(item.date || item.lostDate || item.foundDate || Date.now()),
    status: item.status || 'Active', // Active, Resolved, Claimed
    postedDate: new Date(item.createdAt || item.postedDate || Date.now()),
    reporter: item.reporter?.name || item.reporterName || item.user?.name || 'Anonymous',
    reporterId: item.reporter?._id || item.reporter?.id || item.userId || null,
    raw: item
  }));

  // Extracted dynamically
  const uniqueCategories = [...new Set(normalizedItems.map(i => i.category))];
  const formCategories = [...new Set([...uniqueCategories, 'Electronics', 'Documents', 'Keys', 'Clothing', 'Wallet', 'Other'])];

  // Filtering & Sorting
  const filteredItems = normalizedItems.filter(item => {
    const searchMatch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = typeFilter === 'All' || item.type.toLowerCase() === typeFilter.toLowerCase();
    const catMatch = categoryFilter === 'All' || item.category === categoryFilter;
    const statusMatch = statusFilter === 'All' || item.status.toLowerCase() === statusFilter.toLowerCase();
    
    return searchMatch && typeMatch && catMatch && statusMatch;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.postedDate - a.postedDate;
    if (sortBy === 'oldest') return a.postedDate - b.postedDate;
    if (sortBy === 'dateDesc') return b.date - a.date; // Date of loss/find
    return 0;
  });

  // Derived Stats
  const totalItems = normalizedItems.length;
  const totalLost = normalizedItems.filter(i => i.type.toLowerCase() === 'lost').length;
  const totalFound = normalizedItems.filter(i => i.type.toLowerCase() === 'found').length;
  const totalResolved = normalizedItems.filter(i => i.status.toLowerCase() === 'resolved' || i.status.toLowerCase() === 'claimed').length;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openReportModal = (type) => {
    setReportType(type);
    setFormData({
      title: '',
      category: 'Electronics',
      description: '',
      location: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsReportModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim() || !formData.date) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        name: formData.title,
        itemName: formData.title,
        type: reportType,
        reportType: reportType,
        category: formData.category,
        description: formData.description,
        location: formData.location,
        date: formData.date,
        lostDate: reportType === 'Lost' ? formData.date : undefined,
        foundDate: reportType === 'Found' ? formData.date : undefined,
        status: 'Active'
      };

      await api.post('/api/lost-found', payload);
      toast.success(`${reportType} item reported successfully.`);
      setIsReportModalOpen(false);
      fetchItems();
    } catch (err) {
      console.error("Failed to submit item:", err);
      toast.error(err.response?.data?.message || `Failed to report ${reportType.toLowerCase()} item`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimResolve = async (actionType) => {
    if (!selectedItem) return;
    
    // Safety confirm
    if (!window.confirm(`Are you sure you want to mark this item as ${actionType}?`)) return;

    setIsClaiming(true);
    try {
      // Attempt standard PUT/PATCH endpoint safely.
      const payload = { status: actionType };
      await api.put(`/api/lost-found/${selectedItem.id}`, payload).catch(async () => {
         // Fallback to PATCH if PUT isn't supported
         await api.patch(`/api/lost-found/${selectedItem.id}`, payload);
      });
      
      toast.success(`Item successfully marked as ${actionType}.`);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      console.error("Failed to update item status:", err);
      toast.error(err.response?.data?.message || 'Failed to update item. Action might not be supported.');
    } finally {
      setIsClaiming(false);
    }
  };

  const getTypeBadge = (type) => {
    return type.toLowerCase() === 'lost' 
      ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">Lost Item</span>
      : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">Found Item</span>;
  };

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'claimed') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Archive size={12} className="mr-1"/> {status}</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><RefreshCw size={12} className="mr-1"/> Active</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading lost and found items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchItems} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
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
          <h1 className="text-2xl font-bold text-gray-800">Lost & Found</h1>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => openReportModal('Lost')}
            className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition shadow-sm font-medium"
          >
            <Plus size={18} className="mr-2 hidden sm:block" />
            Report Lost
          </button>
          <button 
            onClick={() => openReportModal('Found')}
            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition shadow-sm font-medium"
          >
            <Plus size={18} className="mr-2 hidden sm:block" />
            Report Found
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Items</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalItems}</span>
            <PackageSearch className="text-gray-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Lost Reports</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalLost}</span>
            <Package className="text-red-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-green-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Found Reports</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalFound}</span>
            <Package className="text-green-400" size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-gray-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Resolved</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalResolved}</span>
            <Archive className="text-gray-400" size={20} />
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
            placeholder="Search items by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-28 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

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

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-32 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Resolved">Resolved</option>
              <option value="Claimed">Claimed</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-44 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Recently Posted</option>
              <option value="oldest">Oldest Posted</option>
              <option value="dateDesc">Date of Incident</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Items List Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-100 text-center">
          <PackageSearch size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Items Found</h2>
          <p className="text-gray-500">There are no items matching your current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col overflow-hidden"
              onClick={() => setSelectedItem(item)}
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  {getTypeBadge(item.type)}
                  {getStatusBadge(item.status)}
                </div>
                
                <h3 className="font-semibold text-lg text-gray-800 line-clamp-1 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 font-medium mb-3">{item.category}</p>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {item.description}
                </p>
                
                <div className="space-y-2 mt-auto text-sm text-gray-500">
                  <div className="flex items-center">
                    <MapPin size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{item.type} on {item.date.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock size={12} className="mr-1" />
                  Posted {item.postedDate.toLocaleDateString()}
                </span>
                <span className="text-sm text-blue-600 font-medium flex items-center">
                  <Eye size={14} className="mr-1" /> View
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsReportModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center">
                  <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                    Report a {reportType} Item
                  </h3>
                </div>
                <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name / Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="E.g., Blue Backpack, iPhone 12"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                    <select
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      {formCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Incident <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="date"
                      required
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="location"
                    required
                    placeholder="Where was it lost/found?"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    name="description"
                    rows="3"
                    required
                    placeholder="Color, brand, distinguishing marks, etc."
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${reportType === 'Lost' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} focus:outline-none disabled:opacity-50`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedItem(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeBadge(selectedItem.type)}
                    {getStatusBadge(selectedItem.status)}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {selectedItem.category}
                    </span>
                  </div>
                  <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                    {selectedItem.title}
                  </h3>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-500">
                  <X size={24} />
                </button>
              </div>

              <div className="px-4 py-5 sm:p-6 bg-gray-50 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-200 pb-5">
                  <div className="flex items-start text-sm">
                    <MapPin className="text-blue-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-500 font-medium">Location</p>
                      <p className="text-gray-800 font-semibold">{selectedItem.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start text-sm">
                    <Calendar className="text-orange-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-500 font-medium">Date {selectedItem.type}</p>
                      <p className="text-gray-800 font-semibold">{selectedItem.date.toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                  <div className="bg-white p-4 rounded-md border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedItem.description}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between text-xs text-gray-500">
                  <span>Reported by: <span className="font-medium text-gray-700">{selectedItem.reporter}</span></span>
                  <span>Posted on: <span className="font-medium text-gray-700">{selectedItem.postedDate.toLocaleString()}</span></span>
                </div>
              </div>
              
              <div className="bg-white px-4 py-3 sm:px-6 sm:flex items-center justify-between border-t border-gray-100">
                <div className="w-full sm:w-auto mb-3 sm:mb-0">
                  {/* Claim/Resolve button logic - Only show if it's Active and reported by someone else (for claim) or self (for resolve) */}
                  {selectedItem.status.toLowerCase() === 'active' && (
                    <button
                      onClick={() => handleClaimResolve(selectedItem.type === 'Found' ? 'Claimed' : 'Resolved')}
                      disabled={isClaiming}
                      className="w-full sm:w-auto inline-flex justify-center items-center rounded-md shadow-sm px-4 py-2 bg-blue-50 text-blue-700 font-medium border border-blue-200 hover:bg-blue-100 focus:outline-none transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      {selectedItem.type === 'Found' ? 'Mark as Claimed' : 'Mark as Resolved'}
                    </button>
                  )}
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setSelectedItem(null)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
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

export default LostFound;
