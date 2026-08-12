import express from 'express'
import {
  listReliefOrganizations,
  getReliefOrganization,
  updateReliefOrganizationStatus,
} from './controllers/reliefOrganizationController.js'
import {
  listDisasterEventsHandler,
  getDisasterEventDashboardHandler,
  createDisasterEventHandler,
  updateDisasterEventStatusHandler,
} from './controllers/disasterEventController.js'
import { listAreasHandler, getAreaDetailHandler } from './controllers/areaController.js'
import {
  listSheltersHandler,
  getShelterDetailHandler,
  createShelterHandler,
  updateShelterHandler,
  deleteShelterHandler,
} from './controllers/shelterController.js'
import {
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from './controllers/userController.js'

const app = express()

app.use(express.json())

app.get('/api/admin/relief-organizations', listReliefOrganizations)
app.get('/api/admin/relief-organizations/:id', getReliefOrganization)
app.patch('/api/admin/relief-organizations/:id/status', updateReliefOrganizationStatus)

app.get('/api/admin/disaster-events', listDisasterEventsHandler)
app.post('/api/admin/disaster-events', createDisasterEventHandler)
app.get('/api/admin/disaster-events/:id/dashboard', getDisasterEventDashboardHandler)
app.patch('/api/admin/disaster-events/:id/status', updateDisasterEventStatusHandler)

app.get('/api/admin/areas', listAreasHandler)
app.get('/api/admin/areas/:id', getAreaDetailHandler)

app.get('/api/admin/shelters', listSheltersHandler)
app.post('/api/admin/shelters', createShelterHandler)
app.get('/api/admin/shelters/:id', getShelterDetailHandler)
app.put('/api/admin/shelters/:id', updateShelterHandler)
app.delete('/api/admin/shelters/:id', deleteShelterHandler)

app.get('/api/admin/users', listUsersHandler)
app.post('/api/admin/users', createUserHandler)
app.put('/api/admin/users/:id', updateUserHandler)
app.delete('/api/admin/users/:id', deleteUserHandler)

const PORT = 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
