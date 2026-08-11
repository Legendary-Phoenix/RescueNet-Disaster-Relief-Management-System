import express from 'express';
import cors from 'cors';
import { getDisasterEvents, getEventDashboard } from './src/organization-module/backend/controllers/disasterEventController.js';
import { getShelterDetails } from './src/organization-module/backend/controllers/shelterController.js';
import { getAreaDetails } from './src/organization-module/backend/controllers/areaController.js';
import { getVolunteers, createVolunteer, updateVolunteer, removeVolunteer, updateAssignment, listShelters } from './src/organization-module/backend/controllers/volunteerController.js';
import { getInventory, getResources, addStock, moveStock, getRequests, updateRequestStatus } from './src/organization-module/backend/controllers/resourceController.js';
import { getTasks, createTask, updateTask, updateTaskStatus, deleteTask } from './src/organization-module/backend/controllers/taskController.js';
import { login, register } from './src/auth-module/backend/controllers/authController.js';

// public module
import { getEvents } from './src/public-module/backend/controllers/disasterEventController.js';
import { getAnnouncements, getRecentAnnouncements } from './src/public-module/backend/controllers/announcementController.js';
import { getShelters, getShelterById } from './src/public-module/backend/controllers/shelterController.js';
import { searchVictims } from './src/public-module/backend/controllers/victimController.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/login', login);
app.post('/api/auth/register', register);

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
app.get('/api/organization/tasks', getTasks);
app.post('/api/organization/tasks', createTask);
app.put('/api/organization/tasks/:id', updateTask);
app.put('/api/organization/tasks/:id/status', updateTaskStatus);
app.delete('/api/organization/tasks/:id', deleteTask);

app.get('/api/public/events', getEvents);
app.get('/api/public/announcements', getAnnouncements);
app.get('/api/public/announcements/recent', getRecentAnnouncements);
app.get('/api/public/shelters', getShelters);
app.get('/api/public/shelters/:id', getShelterById);
app.get('/api/public/victims/search', searchVictims);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
