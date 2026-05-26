import { AlertTriangle, Bot, Camera, ClipboardList, FileText, Info, LayoutDashboard, Map, Package } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/inventory', label: 'Kho hàng', icon: Package },
  { path: '/tasks', label: 'Nhiệm vụ', icon: ClipboardList },
  { path: '/robots', label: 'Robot', icon: Bot },
  { path: '/camera', label: 'Camera AI', icon: Camera },
  { path: '/alerts', label: 'Cảnh báo', icon: AlertTriangle },
  { path: '/logs', label: 'Nhật ký', icon: FileText },
  { path: '/map', label: 'Bản đồ kho', icon: Map },
  { path: '/about', label: 'Giới thiệu', icon: Info },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
          <img
            src="/autonomous_robot_icon.png"
            alt="Biểu tượng robot tự hành WMS"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-950">WMS Robot Tự Hành</h1>
          <p className="text-[11px] font-medium text-slate-500">Quản lý kho mini</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Điều hướng chính">
        <div className="space-y-1.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}

