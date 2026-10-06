import DashboardLayout from '../components/DashboardLayout';
import { LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, Bell, Megaphone, UserCircle, Settings } from 'lucide-react';

const AdminLayout = () => {
  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/users', label: 'Users', icon: UserCircle },
    { path: '/admin/students', label: 'Students', icon: GraduationCap },
    { path: '/admin/faculty', label: 'Faculty', icon: Users },
    { path: '/admin/departments', label: 'Departments', icon: Settings },
    { path: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    { path: '/admin/events', label: 'Events', icon: Calendar },
    { path: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/admin/notifications', label: 'Notifications', icon: Bell },
  ];

  return <DashboardLayout title="Admin Portal" menuItems={menuItems} />;
};

export default AdminLayout;
