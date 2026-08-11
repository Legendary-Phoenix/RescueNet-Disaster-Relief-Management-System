import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './organization-module/frontend/components/Layout';
import DisasterEvents from './organization-module/frontend/pages/DisasterEvents';
import EventDashboard from './organization-module/frontend/pages/EventDashboard';
import Volunteers from './organization-module/frontend/pages/Volunteers';
import Resources from './organization-module/frontend/pages/Resources';
import Tasks from './organization-module/frontend/pages/Tasks';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/organization" element={<Layout />}>
          <Route index element={<Navigate to="disaster-events" replace />} />
          <Route path="disaster-events" element={<DisasterEvents />} />
          <Route path="disaster-events/:eventId" element={<EventDashboard />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="resources" element={<Resources />} />
          <Route path="tasks" element={<Tasks />} />
        </Route>
        <Route path="*" element={<Navigate to="/organization" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
