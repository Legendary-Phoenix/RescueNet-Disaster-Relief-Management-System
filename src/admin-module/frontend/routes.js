import ReliefOrganizationsList from './pages/ReliefOrganizationsList.jsx'
import DisasterEvents from './pages/DisasterEvents.jsx'
import DisasterEventDashboard from './pages/DisasterEventDashboard.jsx'
import ShelterManagement from './pages/ShelterManagement.jsx'
import UsersList from './pages/UsersList.jsx'

const adminRoutes = [
  { path: '/admin/relief-organizations', component: ReliefOrganizationsList },
  { path: '/admin/disaster-events', component: DisasterEvents },
  { path: '/admin/disaster-events/:id/dashboard', component: DisasterEventDashboard },
  { path: '/admin/shelters', component: ShelterManagement },
  { path: '/admin/users', component: UsersList },
]

export default adminRoutes
