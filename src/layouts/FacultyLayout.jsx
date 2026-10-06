import DashboardLayout from '../components/DashboardLayout';
import { LayoutDashboard, CheckSquare, FileText, Upload, Award, Calendar, Megaphone, Bell } from 'lucide-react';

const FacultyLayout = () => {
  const menuItems = [
    { path: '/faculty', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/faculty/attendance', label: 'Attendance', icon: CheckSquare },
    { path: '/faculty/assignments', label: 'Assignments', icon: FileText },
    { path: '/faculty/submissions', label: 'Submissions', icon: Upload },
    { path: '/faculty/marks', label: 'Marks', icon: Award },
    { path: '/faculty/events', label: 'Events', icon: Calendar },
    { path: '/faculty/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/faculty/notifications', label: 'Notifications', icon: Bell },
  ];

  return <DashboardLayout title="Faculty Portal" menuItems={menuItems} />;
};

export default FacultyLayout;
