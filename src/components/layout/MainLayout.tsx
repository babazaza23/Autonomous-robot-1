import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  demoMode: boolean;
  onToggleDemo: () => void;
  alertCount: number;
  serverConnected: boolean;
  robotOnline: boolean;
}

export default function MainLayout({ demoMode, onToggleDemo, alertCount, serverConnected, robotOnline }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:ml-[260px]">
        <Header
          demoMode={demoMode}
          onToggleDemo={onToggleDemo}
          alertCount={alertCount}
          serverConnected={serverConnected}
          robotOnline={robotOnline}
        />
        <main className="max-w-[1560px] p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
