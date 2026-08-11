import express from 'express';
import cors from 'cors';
import { getDisasterEvents, getEventDashboard } from './src/organization-module/backend/controllers/disasterEventController.js';
import { getShelterDetails } from './src/organization-module/backend/controllers/shelterController.js';
import { getAreaDetails } from './src/organization-module/backend/controllers/areaController.js';
import { getVolunteers, createVolunteer, updateVolunteer, removeVolunteer, updateAssignment, listShelters } from './src/organization-module/backend/controllers/volunteerController.js';
import { getInventory, getResources, addStock, moveStock, getRequests, updateRequestStatus } from './src/organization-module/backend/controllers/resourceController.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/organization/disaster-events', getDisasterEvents);
app.get('/api/organization/disaster-events/:eventId/dashboard', getEventDashboard);
app.get('/api/organization/shelters', listShelters);
app.get('/api/organization/shelters/:shelterId', getShelterDetails);
app.get('/api/organization/areas/:areaId', getAreaDetails);
app.get('/api/organization/volunteers', getVolunteers);
app.post('/api/organization/volunteers', createVolunteer);
app.put('/api/organization/volunteers/:id', updateVolunteer);
app.delete('/api/organization/volunteers/:id', removeVolunteer);
app.put('/api/organization/volunteers/:id/shelter', updateAssignment);
app.get('/api/organization/inventory', getInventory);
app.get('/api/organization/resources', getResources);
app.post('/api/organization/inventory/add', addStock);
app.post('/api/organization/inventory/move', moveStock);
app.get('/api/organization/resource-requests', getRequests);
app.put('/api/organization/resource-requests/:id/status', updateRequestStatus);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
