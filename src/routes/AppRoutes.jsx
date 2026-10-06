import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// Pages
import Login from '../pages/Login';
import Unauthorized from '../pages/Unauthorized';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import FacultyLayout from '../layouts/FacultyLayout';
import StudentLayout from '../layouts/StudentLayout';

import AdminDashboard from '../pages/admin/AdminDashboard';
import StudentDashboard from '../pages/student/StudentDashboard';
import MyProfile from '../pages/student/MyProfile';
import Attendance from '../pages/student/Attendance';
import Assignments from '../pages/student/Assignments';
import Marks from '../pages/student/Marks';
import Events from '../pages/student/Events';
import LeaveRequests from '../pages/student/LeaveRequests';
import Complaints from '../pages/student/Complaints';
import LostFound from '../pages/student/LostFound';
import Announcements from '../pages/student/Announcements';
import Notifications from '../pages/student/Notifications';
import CareerProfile from '../pages/student/CareerProfile';
import FacultyDashboard from '../pages/faculty/FacultyDashboard';
import AttendanceManagement from '../pages/faculty/AttendanceManagement';
import FacultyAssignments from '../pages/faculty/Assignments';
import FacultySubmissions from '../pages/faculty/Submissions';
import FacultyMarks from '../pages/faculty/Marks';
import FacultyEvents from '../pages/faculty/Events';
import FacultyAnnouncements from '../pages/faculty/Announcements';
import FacultyNotifications from '../pages/faculty/Notifications';
import Users from '../pages/admin/Users';
import Students from '../pages/admin/Students';
import Faculty from '../pages/admin/Faculty';
import Departments from '../pages/admin/Departments';
import Subjects from '../pages/admin/Subjects';
import AdminEvents from '../pages/admin/Events';
import AdminAnnouncements from '../pages/admin/Announcements';
import AdminNotifications from '../pages/admin/Notifications';
const Placeholder = ({ title }) => <div className="p-4">{title} Page</div>;

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="students" element={<Students />} />
        <Route path="faculty" element={<Faculty />} />
        <Route path="departments" element={<Departments />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="notifications" element={<AdminNotifications />} />
      </Route>

      {/* Faculty Routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <FacultyLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FacultyDashboard />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="assignments" element={<FacultyAssignments />} />
        <Route path="submissions" element={<FacultySubmissions />} />
        <Route path="marks" element={<FacultyMarks />} />
        <Route path="events" element={<FacultyEvents />} />
        <Route path="announcements" element={<FacultyAnnouncements />} />
        <Route path="notifications" element={<FacultyNotifications />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="submissions" element={<Placeholder title="Assignment Submissions" />} />
        <Route path="marks" element={<Marks />} />
        <Route path="events" element={<Events />} />
        <Route path="event-registration" element={<Placeholder title="Event Registration" />} />
        <Route path="leave-requests" element={<LeaveRequests />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="lost-found" element={<LostFound />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="career-profile" element={<CareerProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
