import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  CheckSquare, XSquare, BookOpen, Calendar as CalendarIcon,
  Filter, AlertTriangle, CheckCircle, XCircle, RefreshCw, AlertCircle, ArrowLeft
} from 'lucide-react';

const Attendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/attendance');
      // Ensure it's an array even if response is deeply nested
      const data = response.data?.data || response.data || [];
      setAttendanceRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      setError(err.response?.data?.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Normalizing the records so they have consistent field names
  const normalizedRecords = attendanceRecords.map(record => ({
    date: record.date || record.createdAt || Date.now(),
    subject: record.subject?.name || record.subjectName || record.subject || 'Unknown Subject',
    subjectCode: record.subject?.code || record.subjectCode || 'N/A',
    status: record.status || (record.present ? 'Present' : 'Absent'),
    faculty: record.faculty?.name || record.facultyName || record.faculty || 'Unknown',
  }));

  // Filtering logic
  const filteredRecords = normalizedRecords.filter(record => {
    const matchSubject = subjectFilter === 'All' || record.subject === subjectFilter;
    const matchStatus = statusFilter === 'All' || record.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSubject && matchStatus;
  });

  // Unique Subjects for Dropdown
  const uniqueSubjects = [...new Set(normalizedRecords.map(r => r.subject))];

  // Derived Stats
  const totalClasses = normalizedRecords.length;
  const presentCount = normalizedRecords.filter(r => r.status.toLowerCase() === 'present').length;
  const absentCount = totalClasses - presentCount;
  const overallPercentage = totalClasses === 0 ? 0 : Math.round((presentCount / totalClasses) * 100);

  // Group by Subject
  const subjectStats = uniqueSubjects.map(subj => {
    const records = normalizedRecords.filter(r => r.subject === subj);
    const code = records[0]?.subjectCode || 'N/A';
    const total = records.length;
    const present = records.filter(r => r.status.toLowerCase() === 'present').length;
    const absent = total - present;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    
    let status = 'Good';
    let statusColor = 'text-green-600';
    if (percentage < 65) {
      status = 'Critical';
      statusColor = 'text-red-600';
    } else if (percentage < 75) {
      status = 'Warning';
      statusColor = 'text-orange-600';
    }

    return { subject: subj, code, total, present, absent, percentage, status, statusColor };
  });

  const getOverallStatusColor = (pct) => {
    if (pct < 65) return 'text-red-600 bg-red-100';
    if (pct < 75) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (pct) => {
    if (pct < 65) return <XCircle className="text-red-600" size={24} />;
    if (pct < 75) return <AlertTriangle className="text-orange-600" size={24} />;
    return <CheckCircle className="text-green-600" size={24} />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading attendance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Attendance</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchAttendance}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to="/student" className="text-gray-500 hover:text-blue-600 md:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-800">Attendance Overview</h1>
        </div>
      </div>

      {totalClasses === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
          <CheckSquare size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Attendance Records</h2>
          <p className="text-gray-500">You don't have any attendance records logged yet.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Overall Percentage</p>
                <div className="flex items-end mt-1">
                  <span className="text-3xl font-bold text-gray-800">{overallPercentage}%</span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${getOverallStatusColor(overallPercentage)}`}>
                {getStatusIcon(overallPercentage)}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Classes</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{totalClasses}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <BookOpen size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Present Days</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{presentCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full text-green-600">
                <CheckSquare size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Absent Days</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{absentCount}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <XSquare size={24} />
              </div>
            </div>
          </div>

          {/* Subject-wise Attendance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Subject-wise Attendance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b text-sm text-gray-500">
                    <th className="p-4 font-medium">Subject</th>
                    <th className="p-4 font-medium text-center">Total Classes</th>
                    <th className="p-4 font-medium text-center">Present</th>
                    <th className="p-4 font-medium text-center">Absent</th>
                    <th className="p-4 font-medium">Percentage</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subjectStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{stat.subject}</div>
                        <div className="text-xs text-gray-500">{stat.code}</div>
                      </td>
                      <td className="p-4 text-center">{stat.total}</td>
                      <td className="p-4 text-center text-green-600 font-medium">{stat.present}</td>
                      <td className="p-4 text-center text-red-600 font-medium">{stat.absent}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{stat.percentage}%</span>
                          <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2 hidden sm:block">
                            <div 
                              className={`h-2 rounded-full ${stat.percentage >= 75 ? 'bg-green-500' : stat.percentage >= 65 ? 'bg-orange-500' : 'bg-red-500'}`} 
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-opacity-10 ${stat.statusColor} bg-current`}>
                          {stat.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Records Log */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-800">Attendance Log</h2>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <div className="relative">
                  <select 
                    className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
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
                    className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <Filter size={14} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-sm text-gray-500">
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Subject</th>
                    <th className="p-4 font-medium">Faculty</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 flex items-center">
                          <CalendarIcon size={16} className="text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">
                            {new Date(record.date).toLocaleDateString(undefined, { 
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                            })}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-gray-800">{record.subject}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-600">{record.faculty}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status.toLowerCase() === 'present' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                        No records match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;
