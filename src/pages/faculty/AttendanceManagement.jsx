import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Users, CheckCircle, XCircle, Search, Filter, 
  AlertCircle, RefreshCw, Calendar as CalendarIcon, 
  UserCheck, UserX, ArrowLeft, Save, Plus,
  ClipboardCheck, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const AttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search for Viewing Attendance
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // "Take Attendance" Mode State
  const [isTakeMode, setIsTakeMode] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: ''
  });
  const [markingData, setMarkingData] = useState({}); // { studentId: 'Present' | 'Absent' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [attRes, stdRes] = await Promise.allSettled([
        api.get('/api/attendance'),
        api.get('/api/students')
      ]);

      if (attRes.status === 'fulfilled') {
        const attData = Array.isArray(attRes.value.data?.data || attRes.value.data) 
          ? (attRes.value.data?.data || attRes.value.data) : [];
        setAttendanceRecords(attData);
      }

      if (stdRes.status === 'fulfilled') {
        const stdData = Array.isArray(stdRes.value.data?.data || stdRes.value.data)
          ? (stdRes.value.data?.data || stdRes.value.data) : [];
        setStudentsList(stdData);
      }

    } catch (err) {
      console.error("Failed to load attendance management data:", err);
      setError("Failed to fetch necessary data from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Data Normalization
  const normalizedRecords = attendanceRecords.map(a => ({
    id: a._id || a.id,
    studentId: a.student?._id || a.student?.id || a.studentId,
    studentName: a.student?.name || a.studentName || 'Unknown Student',
    rollNo: a.student?.rollNo || a.student?.registerNumber || a.rollNo || a.registerNumber || '-',
    department: a.student?.department || a.department || 'General',
    subject: a.subject || a.course || 'General',
    date: new Date(a.date || a.createdAt || Date.now()),
    status: a.status || 'Absent',
    raw: a
  }));

  const normalizedStudents = studentsList.map(s => ({
    id: s._id || s.id,
    name: s.name || s.firstName || 'Unknown Student',
    rollNo: s.rollNo || s.registerNumber || s.studentId || '-',
    department: s.department || s.course || 'General',
    raw: s
  }));

  const uniqueSubjects = [...new Set(normalizedRecords.map(r => r.subject))];

  // Filters for View Mode
  const filteredRecords = normalizedRecords.filter(r => {
    const searchMatch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const subjectMatch = subjectFilter === 'All' || r.subject === subjectFilter;
    const statusMatch = statusFilter === 'All' || r.status.toLowerCase() === statusFilter.toLowerCase();
    
    // Convert Dates to YYYY-MM-DD for comparison
    const recordDateString = r.date.toISOString().split('T')[0];
    const dateMatch = !dateFilter || recordDateString === dateFilter;

    return searchMatch && subjectMatch && statusMatch && dateMatch;
  }).sort((a, b) => b.date - a.date);

  // Stats (Based on current filtered view)
  const totalStudents = filteredRecords.length;
  const presentCount = filteredRecords.filter(r => r.status.toLowerCase() === 'present').length;
  const absentCount = totalStudents - presentCount;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // Handlers for "Take Attendance" Mode
  const handleMarkAll = (status) => {
    const newMarkingData = {};
    normalizedStudents.forEach(s => {
      newMarkingData[s.id] = status;
    });
    setMarkingData(newMarkingData);
  };

  const handleStudentMark = (studentId, status) => {
    setMarkingData({ ...markingData, [studentId]: status });
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!attendanceForm.date || !attendanceForm.subject.trim()) {
      toast.error("Please enter Subject and Date.");
      return;
    }

    const markedIds = Object.keys(markingData);
    if (markedIds.length === 0) {
      toast.error("No attendance marked. Please mark at least one student.");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Create payload array
      const payloads = markedIds.map(studentId => ({
        studentId,
        student: studentId, // Flat vs Nested safe payload
        subject: attendanceForm.subject,
        date: attendanceForm.date,
        status: markingData[studentId]
      }));

      // Some APIs support bulk array post, some require looping
      try {
        await api.post('/api/attendance/bulk', { records: payloads }).catch(async () => {
           // Fallback to array directly
           await api.post('/api/attendance', payloads);
        });
        toast.success("Bulk attendance saved successfully!");
        successCount = payloads.length;
      } catch (bulkErr) {
        // Fallback: Loop individual posts if bulk is unsupported
        console.warn("Bulk endpoint failed, trying individual posts...");
        for (const payload of payloads) {
          try {
            await api.post('/api/attendance', payload);
            successCount++;
          } catch (individualErr) {
            console.error("Failed for student", payload.studentId);
            failCount++;
          }
        }
        
        if (successCount > 0) {
          toast.success(`Saved ${successCount} records. ${failCount > 0 ? `${failCount} failed.` : ''}`);
        } else {
          toast.error("Failed to save attendance.");
        }
      }

      if (successCount > 0) {
        setIsTakeMode(false);
        setMarkingData({});
        fetchData(); // Refresh history
      }
    } catch (err) {
      console.error("Failed to save attendance:", err);
      toast.error("Failed to process attendance submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle View
  if (isTakeMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsTakeMode(false)} className="text-gray-500 hover:text-indigo-600">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Take Attendance</h1>
          </div>
          <button 
            onClick={handleAttendanceSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? (
              <><RefreshCw size={18} className="mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save size={18} className="mr-2" /> Save Attendance</>
            )}
          </button>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={attendanceForm.date}
              onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})}
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject / Course <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. Data Structures"
              value={attendanceForm.subject}
              onChange={(e) => setAttendanceForm({...attendanceForm, subject: e.target.value})}
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => handleMarkAll('Present')}
              className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition text-sm font-medium"
            >
              <CheckCircle size={16} className="mr-2" /> Mark All Present
            </button>
            <button 
              onClick={() => handleMarkAll('Absent')}
              className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition text-sm font-medium"
            >
              <XCircle size={16} className="mr-2" /> Mark All Absent
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {normalizedStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p>No students found in the database. Ensure students are enrolled first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                    <th className="p-4 font-medium">Student Name</th>
                    <th className="p-4 font-medium">Roll No</th>
                    <th className="p-4 font-medium hidden md:table-cell">Department</th>
                    <th className="p-4 font-medium text-right">Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {normalizedStudents.map(student => {
                    const currentStatus = markingData[student.id];
                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-800">{student.name}</td>
                        <td className="p-4 text-sm text-gray-600">{student.rollNo}</td>
                        <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{student.department}</td>
                        <td className="p-4 text-right">
                          <div className="inline-flex rounded-md shadow-sm" role="group">
                            <button
                              type="button"
                              onClick={() => handleStudentMark(student.id, 'Present')}
                              className={`px-4 py-1.5 text-sm font-medium rounded-l-lg border ${
                                currentStatus === 'Present' 
                                  ? 'bg-emerald-500 text-white border-emerald-500' 
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentMark(student.id, 'Absent')}
                              className={`px-4 py-1.5 text-sm font-medium rounded-r-lg border-t border-b border-r ${
                                currentStatus === 'Absent' 
                                  ? 'bg-red-500 text-white border-red-500' 
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Normal View Mode ---
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Log</h1>
        <button 
          onClick={() => setIsTakeMode(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm font-medium"
        >
          <Plus size={18} className="mr-2" /> Take Attendance
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Records</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{totalStudents}</span>
            <ClipboardCheck className="text-indigo-400" size={24} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Present</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{presentCount}</span>
            <UserCheck className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Absent</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{absentCount}</span>
            <UserX className="text-red-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Filtered Average</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-bold text-gray-800">{attendancePercentage}%</span>
            <Clock className="text-amber-400" size={24} />
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
            placeholder="Search student or roll no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-36 bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
          />

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
              className="appearance-none w-full sm:w-32 bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded focus:outline-none focus:bg-white focus:border-indigo-500 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
           <div className="flex flex-col items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-gray-500">Loading records...</p>
          </div>
        ) : error ? (
           <div className="p-12 text-center text-red-500">
             <AlertCircle size={32} className="mx-auto mb-2" />
             <p>{error}</p>
           </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CalendarIcon size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Records Found</h2>
            <p className="text-gray-500">No attendance records match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                  <th className="p-4 font-medium">Student Name</th>
                  <th className="p-4 font-medium">Subject</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{record.studentName}</div>
                      <div className="text-xs text-gray-500">{record.rollNo}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {record.subject}
                    </td>
                    <td className="p-4 text-center">
                      {record.status.toLowerCase() === 'present' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle size={12} className="mr-1" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle size={12} className="mr-1" /> Absent
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500 text-right">
                      {record.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AttendanceManagement;
