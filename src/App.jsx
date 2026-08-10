import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './organization-module/frontend/components/Layout';
import DisasterEvents from './organization-module/frontend/pages/DisasterEvents';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/organization" element={<Layout />}>
          <Route index element={<Navigate to="disaster-events" replace />} />
          <Route path="disaster-events" element={<DisasterEvents />} />
        </Route>
        <Route path="*" element={<Navigate to="/organization" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
