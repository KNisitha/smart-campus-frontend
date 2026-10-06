import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, BookOpen, Building2, Calendar, 
  Megaphone, Bell, Activity, ShieldCheck,
  ChevronRight, AlertCircle, RefreshCw,
  Zap, Server, UserCheck, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    users: [],
    students: [],
    faculty: [],
    departments: [],
    subjects: [],
    events: [],
    announcements: [],
    notifications: [],
    isSystemOnline: false,
    systemDetails: null
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Defensively hit multiple endpoints using Promise.allSettled
      // so if one endpoint fails/404s/403s, the rest still load.
      const endpoints = [
        { key: 'users', promise: api.get('/api/users') },
        { key: 'students', promise: api.get('/api/students') },
        { key: 'faculty', promise: api.get('/api/faculty') },
        { key: 'departments', promise: api.get('/api/departments') },
        { key: 'subjects', promise: api.get('/api/subjects') },
        { key: 'events', promise: api.get('/api/events') },
        { key: 'announcements', promise: api.get('/api/announcements') },
        { key: 'notifications', promise: api.get('/api/notifications') },
        { key: 'health', promise: api.get('/api/health').catch(() => api.get('/health')) }
      ];

      const results = await Promise.allSettled(endpoints.map(e => e.promise));

      const extractArray = (res) => {
        if (res.status === 'fulfilled') {
          const val = res.value?.data?.data || res.value?.data;
          return Array.isArray(val) ? val : [];
        }
        return [];
      };

      const extractedData = {
        users: extractArray(results[0]),
        students: extractArray(results[1]),
        faculty: extractArray(results[2]),
        departments: extractArray(results[3]),
        subjects: extractArray(results[4]),
        events: extractArray(results[5]),
        announcements: extractArray(results[6]),
        notifications: extractArray(results[7]),
        isSystemOnline: results[8].status === 'fulfilled' || results[0].status === 'fulfilled',
        systemDetails: results[8].status === 'fulfilled' ? (results[8].value?.data?.status || 'API Connected') : 'Degraded Performance'
      };

      setData(extractedData);
      
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast.error("Some dashboard components failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Initializing Administrative Console...</p>
      </div>
    );
  }

  // Pre-calculations safely
  const totalUsers = data.users.length > 0 ? data.users.length : (data.students.length + data.faculty.length);
  const totalStudents = data.students.length;
  const totalFaculty = data.faculty.length;
  const adminCount = data.users.filter(u => u.role === 'admin' || u.role === 'Admin').length || 1; // Minimum 1 (self)
  
  const totalDepartments = data.departments.length;
  const totalSubjects = data.subjects.length;
  const totalEvents = data.events.length;
  const totalAnnouncements = data.announcements.length;
  
  const unreadNotifications = data.notifications.filter(n => !(n.isRead || n.read || n.status === 'Read')).length;
  const importantAnnouncements = data.announcements.filter(a => a.priority === 'High' || a.priority === 'Urgent' || a.isImportant).length;

  // Derive recent activity safely
  const recentEvents = [...data.events]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 3);
    
  const recentAnnouncements = [...data.announcements]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 3);
    
  const recentActivityLog = [
    ...data.events.map(e => ({ type: 'Event', title: e.title || e.name, date: new Date(e.createdAt || e.date), icon: Calendar, color: 'text-indigo-500' })),
    ...data.announcements.map(a => ({ type: 'Notice', title: a.title || a.subject, date: new Date(a.createdAt || a.date), icon: Megaphone, color: 'text-emerald-500' })),
    ...data.users.map(u => ({ type: 'New User', title: u.name || u.email, date: new Date(u.createdAt || Date.now()), icon: UserCheck, color: 'text-blue-500' }))
  ].sort((a, b) => b.date - a.date).slice(0, 5); // Latest 5 activities combined

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldCheck className="mr-2 text-indigo-600" size={28} />
            Administrator Console
          </h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name || 'Admin'}. Here is your system overview.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${data.isSystemOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <Server size={14} className="mr-1.5" />
            {data.isSystemOnline ? 'System Online' : 'System Offline'}
          </div>
          <button onClick={fetchDashboardData} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition" title="Refresh Dashboard">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Users size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-4">{totalUsers}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Students</p>
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><UserCheck size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-4">{totalStudents}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Faculty</p>
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><BookOpen size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-4">{totalFaculty}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-4 opacity-5"><Building2 size={64} /></div>
          <div className="flex items-center justify-between relative z-10">
            <p className="text-sm font-medium text-gray-500">Departments</p>
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Building2 size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-4 relative z-10">{totalDepartments}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Distribution & Quick Links (Left Column) */}
        <div className="space-y-6">
          {/* User Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Activity size={18} className="mr-2 text-indigo-600" /> User Distribution</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Students</span>
                  <span className="text-gray-500">{totalStudents} ({totalUsers > 0 ? Math.round((totalStudents/totalUsers)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${totalUsers > 0 ? (totalStudents/totalUsers)*100 : 0}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Faculty</span>
                  <span className="text-gray-500">{totalFaculty} ({totalUsers > 0 ? Math.round((totalFaculty/totalUsers)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${totalUsers > 0 ? (totalFaculty/totalUsers)*100 : 0}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Administrators</span>
                  <span className="text-gray-500">{adminCount} ({totalUsers > 0 ? Math.round((adminCount/totalUsers)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-gray-800 h-2 rounded-full" style={{ width: `${totalUsers > 0 ? (adminCount/totalUsers)*100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Matrix */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Quick Navigation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/admin/users" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition border border-transparent hover:border-indigo-100 group">
                <Users size={24} className="text-gray-400 group-hover:text-indigo-600 mb-2 transition" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-700">Users</span>
              </Link>
              <Link to="/admin/departments" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition border border-transparent hover:border-blue-100 group">
                <Building2 size={24} className="text-gray-400 group-hover:text-blue-600 mb-2 transition" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-700">Departments</span>
              </Link>
              <Link to="/admin/events" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition border border-transparent hover:border-emerald-100 group">
                <Calendar size={24} className="text-gray-400 group-hover:text-emerald-600 mb-2 transition" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-emerald-700">Events</span>
              </Link>
              <Link to="/admin/announcements" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-amber-50 hover:text-amber-700 transition border border-transparent hover:border-amber-100 group relative">
                {importantAnnouncements > 0 && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                <Megaphone size={24} className="text-gray-400 group-hover:text-amber-600 mb-2 transition" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-amber-700">Announcements</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Center & Right Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notifications & System Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Unread Notifications</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{unreadNotifications}</p>
                <Link to="/admin/notifications" className="text-sm text-indigo-600 hover:underline mt-2 inline-block font-medium">View Inbox &rarr;</Link>
              </div>
              <div className="p-3 bg-red-50 text-red-500 rounded-full"><Bell size={28} /></div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">System Status</p>
                <div className="flex items-center mt-1">
                  {data.isSystemOnline ? <CheckCircle size={24} className="text-emerald-500 mr-2" /> : <AlertCircle size={24} className="text-red-500 mr-2" />}
                  <p className="text-lg font-bold text-gray-800">{data.isSystemOnline ? 'Operational' : 'Degraded'}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">API: {data.systemDetails}</p>
              </div>
              <div className="p-3 bg-gray-50 text-gray-400 rounded-full"><Server size={28} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Events Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center"><Calendar size={16} className="mr-2 text-indigo-600" /> Recent Events</h3>
                <Link to="/admin/events" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center">View All <ChevronRight size={14} /></Link>
              </div>
              <div className="p-4 flex-1">
                {recentEvents.length > 0 ? (
                  <div className="space-y-4">
                    {recentEvents.map((evt, idx) => (
                      <div key={idx} className="flex items-start">
                        <div className="bg-indigo-50 text-indigo-700 rounded p-2 text-center min-w-[50px] mr-3">
                          <span className="block text-xs font-bold uppercase">{new Date(evt.date || evt.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="block text-lg font-black leading-none mt-0.5">{new Date(evt.date || evt.createdAt || Date.now()).getDate()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm line-clamp-1">{evt.title || evt.name || 'Event'}</p>
                          <p className="text-xs text-gray-500 mt-1">{evt.location || 'Location TBD'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No recent events found.</p>
                )}
              </div>
            </div>

            {/* Recent Announcements Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center"><Megaphone size={16} className="mr-2 text-emerald-600" /> Announcements</h3>
                <Link to="/admin/announcements" className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center">View All <ChevronRight size={14} /></Link>
              </div>
              <div className="p-4 flex-1">
                {recentAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {recentAnnouncements.map((ann, idx) => (
                      <div key={idx} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-semibold text-sm line-clamp-1 pr-2 ${ann.isImportant || ann.priority === 'High' ? 'text-red-700' : 'text-gray-800'}`}>
                            {ann.isImportant || ann.priority === 'High' ? <Zap size={12} className="inline mr-1 text-red-500" /> : null}
                            {ann.title || ann.subject}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(ann.createdAt || ann.date || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{ann.content || ann.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No recent announcements found.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* System Activity Log */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center"><Activity size={16} className="mr-2 text-blue-600" /> Combined Activity Log</h3>
             </div>
             <div className="p-4">
                {recentActivityLog.length > 0 ? (
                  <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                    {recentActivityLog.map((log, idx) => {
                      const Icon = log.icon;
                      return (
                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-2">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <Icon size={16} className={log.color} />
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-bold ${log.color}`}>{log.type}</span>
                              <span className="text-xs text-gray-400 font-medium">{log.date.toLocaleDateString()}</span>
                            </div>
                            <div className="text-gray-700 font-medium truncate">{log.title}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity tracked.</p>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
