import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './Components/Auth/ProtectedRoute';
import Login from './Components/Auth/Login';
import HrDashboard from './Components/HR/HrDashboard';
import SupervisorDashboard from './Components/Supervisor/SupervisorDashboard';
import InternDashboard from './Components/Intern/InternDashboard';
import ParticipantMonitoring from './Components/Supervisor/Monitoring';
import ActivityChecklist from './Components/Intern/ActivityChecklist';
import ActivityChecklistReadOnly from './Components/Supervisor/ActivityChecklistReadOnly';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/HrDashboard"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HrDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/SupervisorDashboard"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/InternDashboard"
            element={
              <ProtectedRoute allowedRoles={['intern']}>
                <InternDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/HrDashboard"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HrDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoring/:participantId"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <ParticipantMonitoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisorChecklist/:participantId"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <ActivityChecklistReadOnly />
              </ProtectedRoute>
            }
          />
           <Route 
              path="/tasks" 
              element={
                <ProtectedRoute allowedRoles={['intern']}>
                  <ActivityChecklist />
                </ProtectedRoute>
              } 
            />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;