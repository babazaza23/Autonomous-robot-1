import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { useRobotTask } from './hooks/useRobotTask';
import { useRobotTelemetry } from './hooks/useRobotTelemetry';
import { DEFAULT_AI_SERVER_HOST } from './hooks/useVisionServer';
import { DEFAULT_ROBOT_ID } from './types/robot';
import { buildRobotAlerts, buildRobotLogs } from './utils/robotEvents';
import './index.css';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RobotPage = lazy(() => import('./pages/RobotPage'));
const WarehouseMapPage = lazy(() => import('./pages/WarehouseMapPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const TaskPage = lazy(() => import('./pages/TaskPage'));
const CameraPage = lazy(() => import('./pages/CameraPage'));
const SensorPage = lazy(() => import('./pages/SensorPage'));
const AlertPage = lazy(() => import('./pages/AlertPage'));
const LogPage = lazy(() => import('./pages/LogPage'));
const ProjectIntroPage = lazy(() => import('./pages/ProjectIntroPage'));

export default function App() {
  const [demoMode, setDemoMode] = useState(false);
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('wms-ai-server-host') || DEFAULT_AI_SERVER_HOST);
  const [selectedRobotId, setSelectedRobotId] = useState(DEFAULT_ROBOT_ID);
  const robotTelemetry = useRobotTelemetry(serverHost, selectedRobotId, demoMode);
  const robotTask = useRobotTask(robotTelemetry.latestTelemetry, robotTelemetry.sendTask);
  const alerts = buildRobotAlerts(robotTelemetry.latestTelemetry, robotTelemetry.robotOnline);
  const logs = buildRobotLogs(robotTelemetry.latestTelemetry, robotTelemetry.robotOnline, robotTelemetry.source);
  const unacknowledgedCount = alerts.length;

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-sm font-semibold text-slate-500">Đang tải giao diện...</div>}>
        <Routes>
          <Route
            element={
              <MainLayout
                demoMode={demoMode}
                onToggleDemo={() => setDemoMode(!demoMode)}
                alertCount={unacknowledgedCount}
                serverConnected={robotTelemetry.connected}
                robotOnline={robotTelemetry.robotOnline}
              />
            }
          >
            <Route
              index
              element={
                <DashboardPage
                  robotTelemetry={robotTelemetry}
                  selectedRobotId={selectedRobotId}
                  onSelectRobot={setSelectedRobotId}
                  currentTask={robotTask.currentTask}
                  alerts={alerts}
                />
              }
            />
            <Route path="robots" element={<RobotPage robotTelemetry={robotTelemetry} selectedRobotId={selectedRobotId} onSelectRobot={setSelectedRobotId} />} />
            <Route path="map" element={<WarehouseMapPage robotTelemetry={robotTelemetry} selectedRobotId={selectedRobotId} />} />
            <Route path="inventory" element={<InventoryPage serverHost={serverHost} selectedRobotId={selectedRobotId} />} />
            <Route path="tasks" element={<TaskPage serverHost={serverHost} selectedRobotId={selectedRobotId} />} />
            <Route
              path="camera"
              element={
                <CameraPage
                  selectedRobotId={selectedRobotId}
                  robots={robotTelemetry.registeredRobots}
                  onSelectRobot={setSelectedRobotId}
                  onServerHostChange={setServerHost}
                />
              }
            />
            <Route path="sensors" element={<SensorPage robotTelemetry={robotTelemetry} selectedRobotId={selectedRobotId} />} />
            <Route
              path="alerts"
              element={
                <AlertPage
                  alerts={alerts}
                  onAcknowledge={() => undefined}
                  onAcknowledgeAll={() => undefined}
                  onClearResolved={() => undefined}
                />
              }
            />
            <Route path="logs" element={<LogPage logs={logs} serverHost={serverHost} selectedRobotId={selectedRobotId} />} />
            <Route path="about" element={<ProjectIntroPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

