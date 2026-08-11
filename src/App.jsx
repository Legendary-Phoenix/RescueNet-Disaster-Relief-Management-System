import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth-module/frontend/components/AuthContext';
import Login from './auth-module/frontend/pages/Login';
import Register from './auth-module/frontend/pages/Register';
import PendingApproval from './auth-module/frontend/pages/PendingApproval';
import Landing from './Landing';
import Layout from './organization-module/frontend/components/Layout';
import DisasterEvents from './organization-module/frontend/pages/DisasterEvents';
import EventDashboard from './organization-module/frontend/pages/EventDashboard';
import Volunteers from './organization-module/frontend/pages/Volunteers';
import Resources from './organization-module/frontend/pages/Resources';
import Tasks from './organization-module/frontend/pages/Tasks';
import PublicLayout from './public-module/frontend/components/Layout';
import Dashboard from './public-module/frontend/pages/Dashboard';
import Shelters from './public-module/frontend/pages/Shelters';
import Announcements from './public-module/frontend/pages/Announcements';
import VictimLookup from './public-module/frontend/pages/VictimLookup';

function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  if (user.role === 'RELIEF_ORG' && user.profile?.status === 'PENDING') {
    return <Navigate to="/pending-approval" replace />;
  }
  return children;
}

function AuthRoute({ children }) {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'RELIEF_ORG' && user.profile?.status === 'PENDING') {
      return <Navigate to="/pending-approval" replace />;
    }
    switch (user.role) {
      case 'RELIEF_ORG': return <Navigate to="/organization" replace />;
      case 'ADMIN': return <Navigate to="/admin" replace />;
      case 'VOLUNTEER': return <Navigate to="/volunteer" replace />;
      case 'PUBLIC': return <Navigate to="/public" replace />;
    }
  }
  return children;
}

function PendingRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'RELIEF_ORG' || user.profile?.status !== 'PENDING') {
    return <Navigate to="/organization" replace />;
  }
  return <PendingApproval />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
          <Route path="/pending-approval" element={<PendingRoute />} />

          <Route path="/organization" element={<ProtectedRoute role="RELIEF_ORG"><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="disaster-events" replace />} />
            <Route path="disaster-events" element={<DisasterEvents />} />
            <Route path="disaster-events/:eventId" element={<EventDashboard />} />
            <Route path="volunteers" element={<Volunteers />} />
            <Route path="resources" element={<Resources />} />
            <Route path="tasks" element={<Tasks />} />
          </Route>

          <Route path="/public" element={<ProtectedRoute role="PUBLIC"><PublicLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="shelters" element={<Shelters />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="victim-lookup" element={<VictimLookup />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
