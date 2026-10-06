import DashboardLayout from '../components/DashboardLayout';
import { LayoutDashboard, User, CheckSquare, FileText, Upload, Award, Calendar, Ticket, Frown, Package, Megaphone, Bell, Briefcase } from 'lucide-react';

const StudentLayout = () => {
  const menuItems = [
    { path: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/student/profile', label: 'My Profile', icon: User },
    { path: '/student/attendance', label: 'Attendance', icon: CheckSquare },
    { path: '/student/assignments', label: 'Assignments', icon: FileText },
    { path: '/student/submissions', label: 'Submissions', icon: Upload },
    { path: '/student/marks', label: 'Marks', icon: Award },
    { path: '/student/events', label: 'Events', icon: Calendar },
    { path: '/student/event-registration', label: 'Event Reg.', icon: Ticket },
    { path: '/student/leave-requests', label: 'Leave Requests', icon: Calendar },
    { path: '/student/complaints', label: 'Complaints', icon: Frown },
    { path: '/student/lost-found', label: 'Lost & Found', icon: Package },
    { path: '/student/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/student/notifications', label: 'Notifications', icon: Bell },
    { path: '/student/career-profile', label: 'Career Profile', icon: Briefcase },
  ];

  return <DashboardLayout title="Student Portal" menuItems={menuItems} />;
};

export default StudentLayout;
