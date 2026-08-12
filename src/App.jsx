import { useState } from 'react'
import Layout from './admin-module/frontend/components/Layout.jsx'
import ReliefOrganizationsList from './admin-module/frontend/pages/ReliefOrganizationsList.jsx'
import DisasterEvents from './admin-module/frontend/pages/DisasterEvents.jsx'
import DisasterEventDashboard from './admin-module/frontend/pages/DisasterEventDashboard.jsx'
import ShelterManagement from './admin-module/frontend/pages/ShelterManagement.jsx'

function App() {
  const [page, setPage] = useState('relief-organizations')
  const [selectedEventId, setSelectedEventId] = useState(null)

  function handleNavigate(id) {
    setSelectedEventId(null)
    setPage(id)
  }

  function handleOpenEvent(eventId) {
    setSelectedEventId(eventId)
    setPage('disaster-event-dashboard')
  }

  let content
  switch (page) {
    case 'disaster-events':
      content = <DisasterEvents onOpenEvent={handleOpenEvent} />
      break
    case 'disaster-event-dashboard':
      content = (
        <DisasterEventDashboard
          eventId={selectedEventId}
          onBack={() => setPage('disaster-events')}
        />
      )
      break
    case 'shelters':
      content = <ShelterManagement />
      break
    default:
      content = <ReliefOrganizationsList />
  }

  const navId = page === 'disaster-event-dashboard' ? 'disaster-events' : page

  return (
    <Layout activePage={navId} onNavigate={handleNavigate}>
      {content}
    </Layout>
  )
}

export default App
