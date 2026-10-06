import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Calendar, CalendarOff, CheckCircle, XCircle, 
  Clock, Plus, X, Search, Filter, RefreshCw, 
  AlertCircle, ArrowLeft, ChevronRight, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const LeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sort
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('appliedDesc');

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    leaveType: 'Sick Leave',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/leave-requests');
      
      const data = Array.isArray(response.data?.data || response.data) 
        ? (response.data?.data || response.data) 
        : [];
      
      setLeaveRequests(data);
    } catch (err) {
      console.error("Failed to fetch leave requests:", err);
      setError(err.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  // Data Normalization
  const normalizedRequests = leaveRequests.map(req => {
    const fromDate = new Date(req.fromDate || req.startDate || req.date || Date.now());
    const toDate = new Date(req.toDate || req.endDate || req.date || Date.now());
    const appliedDate = new Date(req.appliedDate || req.createdAt || Date.now());
    
    // Calculate days difference (inclusive)
    const diffTime = Math.abs(toDate - fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return {
      id: req._id || req.id,
      leaveType: req.leaveType || req.type || 'General Leave',
      fromDate,
      toDate,
      days: req.days || diffDays,
      reason: req.reason || 'No reason provided',
      status: req.status || 'Pending',
      appliedDate,
      remarks: req.remarks || req.rejectionReason || req.adminRemarks || null,
      raw: req
    };
  });

  // Unique Leave Types
  const uniqueTypes = [...new Set(normalizedRequests.map(r => r.leaveType))];

  // Filters
  const filteredRequests = normalizedRequests.filter(req => {
    const matchStatus = statusFilter === 'All' || req.status.toLowerCase() === statusFilter.toLowerCase();
    const matchType = typeFilter === 'All' || req.leaveType === typeFilter;
    return matchStatus && matchType;
  }).sort((a, b) => {
    if (sortBy === 'appliedDesc') return b.appliedDate - a.appliedDate;
    if (sortBy === 'appliedAsc') return a.appliedDate - b.appliedDate;
    if (sortBy === 'fromDesc') return b.fromDate - a.fromDate;
    return 0;
  });

  // Stats
  const totalRequests = normalizedRequests.length;
  const pendingRequests = normalizedRequests.filter(r => r.status.toLowerCase() === 'pending').length;
  const approvedRequests = normalizedRequests.filter(r => r.status.toLowerCase() === 'approved').length;
  const rejectedRequests = normalizedRequests.filter(r => r.status.toLowerCase() === 'rejected').length;

  // Handlers
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    
    if (!formData.leaveType || !formData.fromDate || !formData.toDate || !formData.reason.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      toast.error("'From Date' cannot be after 'To Date'.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        leaveType: formData.leaveType,
        type: formData.leaveType,
        fromDate: formData.fromDate,
        startDate: formData.fromDate,
        toDate: formData.toDate,
        endDate: formData.toDate,
        reason: formData.reason
      };

      await api.post('/api/leave-requests', payload);
      toast.success("Leave request submitted successfully.");
      
      setFormData({ leaveType: 'Sick Leave', fromDate: '', toDate: '', reason: '' });
      setIsApplyModalOpen(false);
      fetchLeaveRequests(); // Refresh data
    } catch (err) {
      console.error("Failed to submit leave request:", err);
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1"/> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} className="mr-1"/> Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><Clock size={12} className="mr-1"/> Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading leave requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchLeaveRequests} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
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
          <h1 className="text-2xl font-bold text-gray-800">Leave Requests</h1>
        </div>
        <button 
          onClick={() => setIsApplyModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" />
          Apply Leave
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total Requests</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalRequests}</span>
            <FileText className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Pending</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{pendingRequests}</span>
            <Clock className="text-orange-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Approved</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{approvedRequests}</span>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Rejected</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{rejectedRequests}</span>
            <XCircle className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <h2 className="text-lg font-semibold text-gray-800 hidden md:block">Your Request History</h2>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
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
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
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
              <option value="appliedDesc">Recently Applied</option>
              <option value="appliedAsc">Oldest Applied</option>
              <option value="fromDesc">Latest Leave Date</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CalendarOff size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Leave Requests Found</h2>
            <p className="text-gray-500">You haven't made any leave requests that match these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                  <th className="p-4 font-medium">Leave Type</th>
                  <th className="p-4 font-medium">Duration</th>
                  <th className="p-4 font-medium hidden md:table-cell">Reason</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-right hidden sm:table-cell">Applied On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map((req) => (
                  <tr 
                    key={req.id} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{req.leaveType}</div>
                      <div className="text-xs text-gray-500">{req.days} Day{req.days !== 1 && 's'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-800">
                        {req.fromDate.toLocaleDateString()} 
                        <span className="text-gray-400 mx-1">-</span> 
                        {req.toDate.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell max-w-[200px]">
                      <div className="text-sm text-gray-600 truncate">{req.reason}</div>
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="p-4 text-right hidden sm:table-cell">
                      <span className="text-sm text-gray-500">{req.appliedDate.toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsApplyModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                  Apply for Leave
                </h3>
                <button onClick={() => setIsApplyModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleApplyLeave} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    name="leaveType"
                    required
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Medical">Medical</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      name="fromDate"
                      required
                      value={formData.fromDate}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      name="toDate"
                      required
                      value={formData.toDate}
                      onChange={handleInputChange}
                      min={formData.fromDate} // Native validation
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave</label>
                  <textarea
                    name="reason"
                    rows="3"
                    required
                    placeholder="Briefly explain the reason for your leave..."
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedRequest(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-1" id="modal-title">
                    Leave Details
                  </h3>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-500">
                  <X size={24} />
                </button>
              </div>

              <div className="px-4 py-5 sm:p-6 bg-gray-50 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Leave Type</p>
                    <p className="text-base font-semibold text-gray-800">{selectedRequest.leaveType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Days</p>
                    <p className="text-base font-semibold text-gray-800">{selectedRequest.days} Days</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Duration</p>
                    <p className="text-base font-medium text-gray-800 flex items-center">
                      <Calendar size={16} className="mr-2 text-blue-500" />
                      {selectedRequest.fromDate.toLocaleDateString()} 
                      <span className="mx-2 text-gray-400">to</span> 
                      {selectedRequest.toDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Reason for Leave</p>
                  <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedRequest.reason}
                  </div>
                </div>

                {selectedRequest.remarks && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      {selectedRequest.status.toLowerCase() === 'rejected' ? 'Rejection Remarks' : 'Admin Remarks'}
                    </p>
                    <div className={`p-3 rounded border text-sm whitespace-pre-wrap ${
                      selectedRequest.status.toLowerCase() === 'rejected' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      {selectedRequest.remarks}
                    </div>
                  </div>
                )}
                
                <div className="pt-2 text-xs text-gray-400 flex items-center justify-between">
                  <span>Applied On: {selectedRequest.appliedDate.toLocaleDateString()}</span>
                </div>

              </div>
              
              <div className="bg-white px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedRequest(null)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
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

export default LeaveRequests;
