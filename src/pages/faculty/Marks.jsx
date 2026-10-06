import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  CheckCircle, Search, Filter, Plus, X, AlertCircle, 
  RefreshCw, Trash2, Edit3, Award, Activity,
  TrendingUp, TrendingDown, ArrowLeft, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const Marks = () => {
  const [marksRecords, setMarksRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [examTypeFilter, setExamTypeFilter] = useState('All');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsMode, setIsDetailsMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    subject: '',
    examType: 'Internal 1',
    marksObtained: '',
    maxMarks: '100',
    date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [marksRes, studentsRes] = await Promise.allSettled([
        api.get('/api/marks'),
        api.get('/api/students')
      ]);

      if (marksRes.status === 'fulfilled') {
        const data = Array.isArray(marksRes.value.data?.data || marksRes.value.data) 
          ? (marksRes.value.data?.data || marksRes.value.data) : [];
        setMarksRecords(data);
      }

      if (studentsRes.status === 'fulfilled') {
        const data = Array.isArray(studentsRes.value.data?.data || studentsRes.value.data)
          ? (studentsRes.value.data?.data || studentsRes.value.data) : [];
        setStudents(data);
      }

    } catch (err) {
      console.error("Failed to load marks:", err);
      setError("Failed to load marks records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Data Normalization
  const normalizedRecords = marksRecords.map(m => {
    const marksObt = Number(m.marksObtained || m.marks || m.score || 0);
    const maxMarks = Number(m.maxMarks || m.totalMarks || 100);
    const percentage = maxMarks > 0 ? (marksObt / maxMarks) * 100 : 0;
    
    // Performance Indicator logic
    let performance = 'Needs Improvement';
    if (percentage >= 75) performance = 'Excellent';
    else if (percentage >= 60) performance = 'Good';
    else if (percentage >= 50) performance = 'Average';

    return {
      id: m._id || m.id,
      studentId: m.student?._id || m.student?.id || m.studentId,
      studentName: m.student?.name || m.studentName || 'Unknown Student',
      rollNo: m.student?.rollNo || m.student?.registerNumber || m.rollNo || '-',
      subject: m.subject || m.course || 'General',
      examType: m.examType || m.type || 'Exam',
      marksObtained: marksObt,
      maxMarks: maxMarks,
      percentage: percentage.toFixed(1),
      performance,
      date: new Date(m.date || m.createdAt || Date.now()),
      raw: m
    };
  });

  const normalizedStudents = students.map(s => ({
    id: s._id || s.id,
    name: s.name || s.firstName || 'Unknown Student',
    rollNo: s.rollNo || s.registerNumber || s.studentId || '-'
  }));

  const uniqueSubjects = [...new Set(normalizedRecords.map(m => m.subject))];
  const uniqueExamTypes = [...new Set(normalizedRecords.map(m => m.examType))];

  // Apply Filters
  const filteredRecords = normalizedRecords.filter(m => {
    const matchSearch = m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        m.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = subjectFilter === 'All' || m.subject === subjectFilter;
    const matchExamType = examTypeFilter === 'All' || m.examType === examTypeFilter;
    return matchSearch && matchSubject && matchExamType;
  }).sort((a, b) => b.date - a.date);

  // Calculate Aggregates for View
  const totalRecords = filteredRecords.length;
  const overallAvg = totalRecords > 0 
    ? (filteredRecords.reduce((acc, curr) => acc + Number(curr.percentage), 0) / totalRecords).toFixed(1)
    : 0;
    
  const highestMarkObj = filteredRecords.reduce((prev, current) => {
    return (prev.percentage > current.percentage) ? prev : current;
  }, { percentage: 0 });
  const lowestMarkObj = filteredRecords.reduce((prev, current) => {
    if (!prev.percentage) return current;
    return (prev.percentage < current.percentage) ? prev : current;
  }, { percentage: 100 });

  // Handlers
  const openCreateModal = () => {
    setFormData({
      studentId: '',
      subject: '',
      examType: 'Internal 1',
      marksObtained: '',
      maxMarks: '100',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedRecord(null);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setFormData({
      studentId: record.studentId,
      subject: record.subject,
      examType: record.examType,
      marksObtained: record.marksObtained,
      maxMarks: record.maxMarks,
      date: record.date.toISOString().split('T')[0]
    });
    setSelectedRecord(record);
    setIsDetailsMode(false);
    setIsModalOpen(true);
  };

  const openDetailsModal = (record) => {
    setSelectedRecord(record);
    setIsDetailsMode(true);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { studentId, subject, examType, marksObtained, maxMarks, date } = formData;
    
    if (!studentId || !subject.trim() || !examType.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    const marksNum = Number(marksObtained);
    const maxNum = Number(maxMarks);

    if (marksNum < 0) {
      toast.error("Marks cannot be negative."); return;
    }
    if (maxNum <= 0) {
      toast.error("Maximum marks must be greater than zero."); return;
    }
    if (marksNum > maxNum) {
      toast.error(`Marks cannot exceed the maximum (${maxNum}).`); return;
    }

    setIsSubmitting(true);
    
    // Create nested & flat safe payload
    const payload = {
      student: studentId,
      studentId: studentId,
      subject,
      course: subject,
      examType,
      type: examType,
      marksObtained: marksNum,
      marks: marksNum,
      score: marksNum,
      maxMarks: maxNum,
      totalMarks: maxNum,
      date
    };

    try {
      if (selectedRecord && selectedRecord.id) {
        // Edit Mode
        await api.put(`/api/marks/${selectedRecord.id}`, payload).catch(() => {
          return api.patch(`/api/marks/${selectedRecord.id}`, payload);
        });
        toast.success("Marks updated successfully");
      } else {
        // Create Mode
        await api.post('/api/marks', payload);
        toast.success("Marks recorded successfully");
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
    if (!window.confirm("Are you sure you want to delete this mark record?")) return;
    try {
      await api.delete(`/api/marks/${id}`);
      toast.success("Record deleted");
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
        <p className="text-gray-500">Loading marks data...</p>
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
          <h1 className="text-2xl font-bold text-gray-800">Marks Management</h1>
        </div>
        <button 
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" /> Enter Marks
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Records</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalRecords}</span>
            <CheckCircle className="text-indigo-400" size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Class Average</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{overallAvg}%</span>
            <Activity className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Highest Marks</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalRecords > 0 ? `${highestMarkObj.percentage}%` : 'N/A'}</span>
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Lowest Marks</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalRecords > 0 ? `${lowestMarkObj.percentage}%` : 'N/A'}</span>
            <TrendingDown className="text-amber-500" size={24} />
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
            placeholder="Search by student name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {uniqueSubjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>

          <div className="relative">
            <select
              className="appearance-none w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={examTypeFilter}
              onChange={(e) => setExamTypeFilter(e.target.value)}
            >
              <option value="All">All Exam Types</option>
              {uniqueExamTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Marks List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Award size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Marks Found</h2>
            <p className="text-gray-500">There are no academic records matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                  <th className="p-4 font-medium">Student</th>
                  <th className="p-4 font-medium">Subject / Exam</th>
                  <th className="p-4 font-medium">Marks</th>
                  <th className="p-4 font-medium">Performance</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.map((record) => {
                  
                  // Badge logic
                  let badgeClass = 'bg-red-100 text-red-800 border-red-200'; // Needs Improvement
                  if (record.performance === 'Excellent') badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  else if (record.performance === 'Good') badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                  else if (record.performance === 'Average') badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';

                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{record.studentName}</div>
                        <div className="text-xs text-gray-500">{record.rollNo}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-700">{record.subject}</div>
                        <div className="text-xs text-gray-500">{record.examType}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800">{record.marksObtained} <span className="text-gray-400 font-normal text-xs">/ {record.maxMarks}</span></span>
                          <span className="text-xs font-semibold text-indigo-600 mt-1">{record.percentage}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeClass}`}>
                          {record.performance}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => openDetailsModal(record)} className="p-1.5 text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-200 rounded transition shadow-sm" title="View Details">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => openEditModal(record)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-white border border-gray-200 hover:border-blue-200 rounded transition shadow-sm" title="Edit">
                            <Edit3 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Create/Edit/Details */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-bold text-gray-900 flex items-center" id="modal-title">
                  <Award className="mr-2 text-indigo-500" size={20} />
                  {isDetailsMode ? 'Mark Details' : selectedRecord ? 'Edit Marks' : 'Enter New Marks'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {!isDetailsMode ? (
                // FORM (Create / Edit)
                <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-4 bg-gray-50">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student <span className="text-red-500">*</span></label>
                    <select
                      name="studentId"
                      required
                      value={formData.studentId}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                    >
                      <option value="">Select a student...</option>
                      {normalizedStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.rollNo})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="subject"
                        required
                        placeholder="e.g. Mathematics"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type <span className="text-red-500">*</span></label>
                      <select
                        name="examType"
                        required
                        value={formData.examType}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                      >
                        <option value="Internal 1">Internal 1</option>
                        <option value="Internal 2">Internal 2</option>
                        <option value="Model">Model</option>
                        <option value="Semester">Semester</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Practical">Practical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 pt-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marks Obtained <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        name="marksObtained"
                        required
                        min="0"
                        step="0.5"
                        value={formData.marksObtained}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-semibold text-indigo-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Marks <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        name="maxMarks"
                        required
                        min="1"
                        value={formData.maxMarks}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
                    />
                  </div>

                  <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-4">
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
                      {isSubmitting ? 'Saving...' : 'Save Marks'}
                    </button>
                  </div>
                </form>
              ) : (
                // DETAILS VIEW
                <div className="bg-gray-50 px-4 py-5 sm:p-6 space-y-6">
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
                    <div className="text-4xl font-black text-gray-800 mt-2">
                      {selectedRecord.marksObtained} <span className="text-xl text-gray-400 font-medium">/ {selectedRecord.maxMarks}</span>
                    </div>
                    <div className="text-sm font-bold text-indigo-600 mt-1">{selectedRecord.percentage}%</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Student</p>
                      <p className="font-semibold text-gray-800">{selectedRecord.studentName}</p>
                      <p className="text-xs text-gray-500">{selectedRecord.rollNo}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Subject</p>
                      <p className="font-semibold text-gray-800">{selectedRecord.subject}</p>
                      <p className="text-xs text-gray-500">{selectedRecord.examType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Performance</p>
                      <p className="font-semibold text-gray-800">{selectedRecord.performance}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Date Recorded</p>
                      <p className="font-semibold text-gray-800">{selectedRecord.date.toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="bg-white px-4 py-3 sm:flex sm:flex-row-reverse border-t border-gray-200 mt-6 -mx-6 -mb-6 rounded-b-lg">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm sm:ml-3"
                    >
                      Close
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDelete(selectedRecord.id)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete Record
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

export default Marks;
