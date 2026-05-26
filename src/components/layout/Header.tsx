import { Bell, Clock, Power, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import EmergencyStopButton from '../common/EmergencyStopButton';

interface HeaderProps {
  demoMode: boolean;
  onToggleDemo: () => void;
  alertCount: number;
  serverConnected: boolean;
  robotOnline: boolean;
}

export default function Header({ demoMode, onToggleDemo, alertCount, serverConnected, robotOnline }: HeaderProps) {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const fleetConnected = serverConnected && robotOnline;

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-950">{pageTitle}</h2>
        <HeaderClock />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          demoMode ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
        }`}>
          {demoMode ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          Demo {demoMode ? 'Bật' : 'Tắt'}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          fleetConnected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${fleetConnected ? 'bg-blue-600' : 'bg-slate-400'}`} />
          AI/Telemetry + Robot
        </span>

        <button
          type="button"
          onClick={onToggleDemo}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
            demoMode ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Power className="h-3.5 w-3.5" />
          {demoMode ? 'Dừng Demo' : 'Bật Demo'}
        </button>
        <EmergencyStopButton compact />

        <button
          type="button"
          aria-label="Xem cảnh báo"
          title="Xem cảnh báo"
          className="relative rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"
        >
          <Bell className="h-5 w-5 text-slate-500" />
          {alertCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function HeaderClock() {
  const [timeStr, setTimeStr] = useState(() =>
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Cập nhật lúc {timeStr}</span>
        </div>
  );
}

function getPageTitle(pathname: string) {
  if (pathname === '/') return 'Tổng quan';
  if (pathname.startsWith('/robots')) return 'Điều khiển robot';
  if (pathname.startsWith('/map')) return 'Bản đồ kho';
  if (pathname.startsWith('/inventory')) return 'Kho hàng';
  if (pathname.startsWith('/tasks')) return 'Nhiệm vụ';
  if (pathname.startsWith('/camera')) return 'Camera và AI Vision';
  if (pathname.startsWith('/sensors')) return 'Cảm biến';
  if (pathname.startsWith('/alerts')) return 'Cảnh báo';
  if (pathname.startsWith('/logs')) return 'Nhật ký';
  if (pathname.startsWith('/about')) return 'Giới thiệu dự án';
  return 'WMS Robot Tự Hành';
}
