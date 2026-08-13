import DashboardPage from './pages/DashboardPage.jsx'
import VictimsPage from './pages/VictimsPage.jsx'
import RequestsPage from './pages/RequestsPage.jsx'
import TasksPage from './pages/TasksPage.jsx'
import './volunteer.css'

/**
 * Routes owned by the Volunteer module — one per feature in the role spec:
 * operations dashboard, victim registration, resource requests, tasks.
 *
 * src/App.jsx concatenates every module's export, so each role module only
 * ever edits its own file. Entries expose `Component` rather than a rendered
 * element because Vite does not transform JSX inside .js files, and the README
 * fixes this filename as routes.js.
 */
const routes = [
  { path: '/volunteer/dashboard', label: 'Operations', Component: DashboardPage },
  { path: '/volunteer/victims', label: 'Victims', Component: VictimsPage },
  { path: '/volunteer/requests', label: 'Resource Requests', Component: RequestsPage },
  { path: '/volunteer/tasks', label: 'Tasks', Component: TasksPage },
]

export default routes
