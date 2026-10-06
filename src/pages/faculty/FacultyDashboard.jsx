import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  Users, BookOpen, CalendarCheck, ClipboardList, 
  AlertCircle, RefreshCw, ChevronRight, FileText,
  Calendar, Megaphone, PlusCircle, CheckCircle, Clock
} from 'lucide-react';

const FacultyDashboard = () => {
  const { user } = useContext(AuthContext);

  const [dashboardData, setDashboardData] = useState({
    facultyInfo: null,
    students: [],
    attendance: [],
    assignments: [],
    submissions: [],
    events: [],
    announcements: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Promise.allSettled to ensure dashboard loads even if some APIs fail or return 403
      const results = await Promise.allSettled([
        api.get('/api/faculty/me').catch(() => api.get('/api/users/me')), // 0
        api.get('/api/students'), // 1
        api.get('/api/attendance'), // 2
        api.get('/api/assignments'), // 3
        api.get('/api/submissions'), // 4
        api.get('/api/events'), // 5
        api.get('/api/announcements') // 6
      ]);

      const safeExtract = (res) => {
        if (res.status === 'fulfilled') {
          return Array.isArray(res.value.data?.data || res.value.data) 
            ? (res.value.data?.data || res.value.data) 
            : [];
        }
        return [];
      };

      const safeExtractObject = (res) => {
        if (res.status === 'fulfilled') {
          const data = res.value.data?.data || res.value.data;
          return Array.isArray(data) ? data[0] : data;
        }
        return null;
      };

      setDashboardData({
        facultyInfo: safeExtractObject(results[0]),
        students: safeExtract(results[1]),
        attendance: safeExtract(results[2]),
        assignments: safeExtract(results[3]),
        submissions: safeExtract(results[4]),
        events: safeExtract(results[5]),
        announcements: safeExtract(results[6])
      });
    } catch (err) {
      console.error("Critical failure loading faculty dashboard", err);
      setError("Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500">Compiling faculty overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Dashboard Error</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchDashboardData} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
          <RefreshCw size={16} className="mr-2" /> Retry
        </button>
      </div>
    );
  }

  const { facultyInfo, students, attendance, assignments, submissions, events, announcements } = dashboardData;

  // Header Info
  const fName = facultyInfo?.name || facultyInfo?.firstName || user?.name || 'Faculty Member';
  const fDept = facultyInfo?.department || 'Department Not Set';
  const fDesig = facultyInfo?.designation || facultyInfo?.title || 'Instructor';
  const currentDate = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Stats Derived
  const totalStudents = students.length;
  const totalAssignments = assignments.length;
  const pendingSubmissions = submissions.filter(s => s.status?.toLowerCase() === 'pending' || !s.graded).length;
  const upcomingEventsCount = events.filter(e => new Date(e.date || e.eventDate || e.createdAt) >= new Date(new Date().setHours(0,0,0,0))).length;
  
  // Attendance math (assuming an array of records)
  const today = new Date().toLocaleDateString();
  const todayAttendanceRecords = attendance.filter(a => new Date(a.date || a.createdAt).toLocaleDateString() === today);
  const presentCount = todayAttendanceRecords.filter(a => a.status?.toLowerCase() === 'present').length;
  const totalMarked = todayAttendanceRecords.length;
  const attendancePercentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  // Sorting
  const recentAssignments = [...assignments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const recentSubmissions = [...submissions].sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)).slice(0, 3);
  const recentAnnouncements = [...announcements].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 2);

  // Quick Actions Config
  const quickActions = [
    { label: "Take Attendance", icon: <CalendarCheck size={20} />, path: "/faculty/attendance", color: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" },
    { label: "Create Assignment", icon: <PlusCircle size={20} />, path: "/faculty/assignments", color: "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100" },
    { label: "View Submissions", icon: <ClipboardList size={20} />, path: "/faculty/submissions", color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" },
    { label: "Enter Marks", icon: <CheckCircle size={20} />, path: "/faculty/marks", color: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100" },
    { label: "Manage Events", icon: <Calendar size={20} />, path: "/faculty/events", color: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100" },
    { label: "Post Announcement", icon: <Megaphone size={20} />, path: "/faculty/announcements", color: "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" }
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-4 -translate-y-4">
          <BookOpen size={180} />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {fName}!</h1>
          <p className="text-gray-600 mt-1">{fDesig} • {fDept}</p>
          <div className="mt-4 flex items-center text-sm text-gray-500 font-medium">
            <Calendar size={16} className="mr-2 text-indigo-500" />
            {currentDate}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Students</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalStudents}</h3>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-500">
              <Users size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Attendance</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{attendancePercentage}%</h3>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-500">
              <CalendarCheck size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{totalMarked > 0 ? `${presentCount} present out of ${totalMarked}` : 'No attendance marked today'}</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Assignments</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalAssignments}</h3>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg text-amber-500">
              <ClipboardList size={20} />
            </div>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-2">{pendingSubmissions} submissions pending review</p>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming Events</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{upcomingEventsCount}</h3>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg text-purple-500">
              <Calendar size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <Link 
              key={i} 
              to={action.path}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${action.color}`}
            >
              <div className="mb-2">{action.icon}</div>
              <span className="text-xs font-semibold text-center leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Split Grid for Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Assignments Column */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-base font-bold text-gray-800 flex items-center">
              <ClipboardList size={18} className="text-indigo-500 mr-2" /> Recent Assignments
            </h2>
            <Link to="/faculty/assignments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center">
              View All <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="p-0">
            {recentAssignments.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {recentAssignments.map((a, i) => (
                  <li key={i} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between">
                      <div className="font-semibold text-gray-800">{a.title || a.name || 'Untitled Assignment'}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {a.subject || a.course || 'General'}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <Clock size={12} className="mr-1" /> Due: {new Date(a.dueDate || a.deadline || Date.now()).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                No recent assignments found.
              </div>
            )}
          </div>
        </div>

        {/* Recent Submissions Column */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-base font-bold text-gray-800 flex items-center">
              <CheckCircle size={18} className="text-emerald-500 mr-2" /> Recent Submissions
            </h2>
            <Link to="/faculty/submissions" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center">
              Review All <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="p-0">
            {recentSubmissions.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {recentSubmissions.map((s, i) => (
                  <li key={i} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{s.student?.name || s.studentName || 'Student Name'}</div>
                      <div className="text-xs text-gray-500 mt-1">Assignment: {s.assignment?.title || s.assignmentName || 'Unknown Assignment'}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s.graded ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {s.graded ? 'Graded' : 'Needs Review'}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-end">
                         {new Date(s.submittedAt || s.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                <CheckCircle size={32} className="mx-auto text-gray-300 mb-3" />
                No pending submissions right now.
              </div>
            )}
          </div>
        </div>

        {/* Announcements Preview */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-base font-bold text-gray-800 flex items-center">
              <Megaphone size={18} className="text-rose-500 mr-2" /> Institutional Announcements
            </h2>
            <Link to="/faculty/announcements" className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center">
              View All <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="p-0">
            {recentAnnouncements.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {recentAnnouncements.map((a, i) => {
                  const isImportant = a.priority?.toLowerCase() === 'high' || a.isImportant;
                  return (
                    <li key={i} className={`p-5 hover:bg-gray-50 transition-colors ${isImportant ? 'border-l-4 border-l-red-500' : ''}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <h4 className={`font-bold ${isImportant ? 'text-red-800' : 'text-gray-800'}`}>
                            {a.title || a.subject || 'Notice'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{a.content || a.description}</p>
                        </div>
                        <div className="mt-2 md:mt-0 text-xs text-gray-500 min-w-max md:pl-4">
                          {new Date(a.date || a.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                <Megaphone size={32} className="mx-auto text-gray-300 mb-3" />
                No new announcements.
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default FacultyDashboard;
