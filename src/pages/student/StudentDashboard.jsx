import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { 
  User, CheckSquare, FileText, Award, Calendar, 
  Bell, Megaphone, Clock, ChevronRight, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    profile: null,
    attendance: [],
    assignments: [],
    submissions: [],
    marks: [],
    events: [],
    notifications: [],
    announcements: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Using Promise.allSettled to ensure dashboard loads even if some APIs fail
        const results = await Promise.allSettled([
          api.get('/api/attendance'),
          api.get('/api/assignments'),
          api.get('/api/submissions'),
          api.get('/api/marks'),
          api.get('/api/events'),
          api.get('/api/notifications'),
          api.get('/api/announcements')
        ]);

        const getResultData = (result) => {
          if (result.status !== 'fulfilled' || !result.value) return [];
          return result.value.data?.data ?? result.value.data ?? [];
        };

        setData({
          profile: user,
          attendance: getResultData(results[0]),
          assignments: getResultData(results[1]),
          submissions: getResultData(results[2]),
          marks: getResultData(results[3]),
          events: getResultData(results[4]),
          notifications: getResultData(results[5]),
          announcements: getResultData(results[6])
        });
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate Attendance Stats
  const totalDays = data.attendance.length;
  const presentDays = data.attendance.filter(a => a.status === 'Present').length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Calculate Assignment Stats
  const totalAssignments = data.assignments.length;
  const submittedAssignments = data.submissions.length;
  const pendingAssignments = Math.max(0, totalAssignments - submittedAssignments);

  // Calculate Marks Stats
  const recentMarks = data.marks.slice(0, 3);
  const totalMarksEarned = data.marks.reduce((acc, curr) => acc + (curr.marksObtained || 0), 0);
  const totalMaxMarks = data.marks.reduce((acc, curr) => acc + (curr.maxMarks || 100), 0);
  const averageMarks = totalMaxMarks > 0 ? Math.round((totalMarksEarned / totalMaxMarks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {data.profile?.name || user?.name || 'Student'}!</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Profile Card Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-3">
            <User size={32} />
          </div>
          <h2 className="font-semibold text-lg text-gray-800">{data.profile?.name || user?.name}</h2>
          <p className="text-sm text-gray-500 mb-1">{data.profile?.email || user?.email}</p>
          <div className="mt-2 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full w-full">
            ID: {data.profile?.studentId || 'N/A'}
          </div>
          <div className="mt-2 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full w-full truncate">
            {data.profile?.department || 'Department N/A'}
          </div>
        </div>

        {/* Attendance Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Overall Attendance</h3>
              <div className="text-3xl font-bold text-gray-800 mt-1">{attendancePercentage}%</div>
            </div>
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <CheckSquare size={24} />
            </div>
          </div>
          <div className="flex justify-between text-sm mt-6">
            <span className="text-gray-600">Present: <span className="font-semibold text-green-600">{presentDays}</span></span>
            <span className="text-gray-600">Absent: <span className="font-semibold text-red-600">{totalDays - presentDays}</span></span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${attendancePercentage}%` }}></div>
          </div>
        </div>

        {/* Assignments Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Assignments</h3>
              <div className="text-3xl font-bold text-gray-800 mt-1">{pendingAssignments}</div>
              <p className="text-xs text-gray-400 mt-1">Pending tasks</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
              <FileText size={24} />
            </div>
          </div>
          <div className="flex justify-between text-sm mt-6 pt-3 border-t border-gray-100">
            <span className="text-gray-600">Total: {totalAssignments}</span>
            <span className="text-green-600 font-medium">Submitted: {submittedAssignments}</span>
          </div>
        </div>

        {/* Marks Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Average Marks</h3>
              <div className="text-3xl font-bold text-gray-800 mt-1">{averageMarks}%</div>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <Award size={24} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {recentMarks.length > 0 ? (
               recentMarks.map((m, i) => (
                 <div key={i} className="flex justify-between text-xs items-center">
                   <span className="text-gray-600 truncate max-w-[100px]">{m.subject || 'Subject'}</span>
                   <span className="font-semibold">{m.marksObtained}/{m.maxMarks}</span>
                 </div>
               ))
            ) : (
              <p className="text-xs text-gray-400">No recent marks</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events & Announcements (Takes up 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="mr-2 text-blue-500" size={20} />
                Upcoming Events
              </h2>
              <Link to="/student/events" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="p-4">
              {data.events.length > 0 ? (
                <div className="space-y-4">
                  {data.events.slice(0, 3).map((event, idx) => (
                    <div key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="bg-white p-2 rounded border border-gray-200 text-center min-w-[60px] mr-4">
                        <div className="text-xs text-red-500 font-bold uppercase">{new Date(event.date || Date.now()).toLocaleString('default', { month: 'short' })}</div>
                        <div className="text-lg font-bold text-gray-800">{new Date(event.date || Date.now()).getDate()}</div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{event.title}</h4>
                        <p className="text-sm text-gray-500 line-clamp-1">{event.description}</p>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Clock size={12} className="mr-1" />
                          {event.time || 'TBA'} • {event.location || 'Campus'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 flex flex-col items-center">
                  <Calendar size={32} className="text-gray-300 mb-2" />
                  <p>No upcoming events</p>
                </div>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Megaphone className="mr-2 text-orange-500" size={20} />
                Latest Announcements
              </h2>
            </div>
            <div className="p-4">
              {data.announcements.length > 0 ? (
                <div className="space-y-4">
                  {data.announcements.slice(0, 3).map((ann, idx) => (
                    <div key={idx} className="border-l-4 border-orange-400 pl-4 py-1">
                      <h4 className="font-medium text-gray-800">{ann.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{ann.content}</p>
                      <span className="text-xs text-gray-400 mt-2 block">
                        {new Date(ann.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No new announcements</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications Sidebar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-fit">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Bell className="mr-2 text-yellow-500" size={20} />
              Notifications
            </h2>
            {data.notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                {data.notifications.filter(n => !n.isRead).length} New
              </span>
            )}
          </div>
          <div className="p-0">
            {data.notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {data.notifications.slice(0, 5).map((notif, idx) => (
                  <div key={idx} className={`p-4 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex items-start">
                      <div className={`mt-0.5 mr-3 ${!notif.isRead ? 'text-blue-500' : 'text-gray-400'}`}>
                        {notif.type === 'alert' ? <AlertCircle size={16} /> : <Bell size={16} />}
                      </div>
                      <div>
                        <p className={`text-sm ${!notif.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                          {notif.message}
                        </p>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {new Date(notif.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                <p>You're all caught up!</p>
              </div>
            )}
          </div>
          {data.notifications.length > 5 && (
            <Link to="/student/notifications" className="block text-center p-3 text-sm text-blue-600 hover:bg-gray-50 border-t border-gray-100">
              View All Notifications
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
