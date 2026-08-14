import express from 'express';
import cors from 'cors';
import { login, register } from './src/auth-module/backend/controllers/authController.js';
import { getDisasterEvents, getEventDashboard } from './src/organization-module/backend/controllers/disasterEventController.js';
import { getShelterDetails } from './src/organization-module/backend/controllers/shelterController.js';
import { getAreaDetails } from './src/organization-module/backend/controllers/areaController.js';
import { getVolunteers, createVolunteer, updateVolunteer, removeVolunteer, updateAssignment, listShelters } from './src/organization-module/backend/controllers/volunteerController.js';
import { getInventory, getResources, addStock, moveStock, getRequests, updateRequestStatus } from './src/organization-module/backend/controllers/resourceController.js';
import { getTasks, createTask, updateTask, updateTaskStatus, deleteTask } from './src/organization-module/backend/controllers/taskController.js';
import { getEvents } from './src/public-module/backend/controllers/disasterEventController.js';
import { getAnnouncements, getRecentAnnouncements } from './src/public-module/backend/controllers/announcementController.js';
import { getShelters, getShelterById } from './src/public-module/backend/controllers/shelterController.js';
import { searchVictims } from './src/public-module/backend/controllers/victimController.js';
import { getAreas as getPublicAreas, getAreaDetails as getPublicAreaDetails } from './src/public-module/backend/controllers/areaController.js';
import {
  listReliefOrganizations,
  getReliefOrganization,
  updateReliefOrganizationStatus,
} from './src/admin-module/backend/controllers/reliefOrganizationController.js';
import {
  listDisasterEventsHandler,
  getDisasterEventDashboardHandler,
  createDisasterEventHandler,
  updateDisasterEventStatusHandler,
} from './src/admin-module/backend/controllers/disasterEventController.js';
import { listAreasHandler, getAreaDetailHandler } from './src/admin-module/backend/controllers/areaController.js';
import {
  listSheltersHandler,
  getShelterDetailHandler,
  createShelterHandler,
  updateShelterHandler,
  deleteShelterHandler,
} from './src/admin-module/backend/controllers/shelterController.js';
import {
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from './src/admin-module/backend/controllers/userController.js';
import { getDashboard, getProfile, getMyShelter, getAssignedShelters } from './src/volunteer-module/backend/controllers/dashboardController.js';
import { listTasks, getTaskStats, updateTaskStatus as volunteerUpdateTaskStatus } from './src/volunteer-module/backend/controllers/taskController.js';
import { registerVictim, listVictims, getVictimStats, updateVictimStatus, assignVictimShelter, getVictimOptions } from './src/volunteer-module/backend/controllers/victimController.js';
import { listRequests, getRequestStats, getRequest, createRequest, updateRequest, withdrawRequest, listResources, listRequestableEvents, getRequestOptions } from './src/volunteer-module/backend/controllers/resourceRequestController.js';
import {
  listAnnouncementsHandler,
  createAnnouncementHandler,
  updateAnnouncementHandler,
  deleteAnnouncementHandler,
} from './src/admin-module/backend/controllers/announcementController.js';

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
app.get('/api/public/areas', getPublicAreas);
app.get('/api/public/areas/:areaId', getPublicAreaDetails);

app.get('/api/admin/relief-organizations', listReliefOrganizations);
app.get('/api/admin/relief-organizations/:id', getReliefOrganization);
app.patch('/api/admin/relief-organizations/:id/status', updateReliefOrganizationStatus);
app.get('/api/admin/disaster-events', listDisasterEventsHandler);
app.post('/api/admin/disaster-events', createDisasterEventHandler);
app.get('/api/admin/disaster-events/:id/dashboard', getDisasterEventDashboardHandler);
app.patch('/api/admin/disaster-events/:id/status', updateDisasterEventStatusHandler);
app.get('/api/admin/areas', listAreasHandler);
app.get('/api/admin/areas/:id', getAreaDetailHandler);
app.get('/api/admin/shelters', listSheltersHandler);
app.post('/api/admin/shelters', createShelterHandler);
app.get('/api/admin/shelters/:id', getShelterDetailHandler);
app.put('/api/admin/shelters/:id', updateShelterHandler);
app.delete('/api/admin/shelters/:id', deleteShelterHandler);
app.get('/api/admin/users', listUsersHandler);
app.post('/api/admin/users', createUserHandler);
app.put('/api/admin/users/:id', updateUserHandler);
app.delete('/api/admin/users/:id', deleteUserHandler);
app.get('/api/admin/announcements', listAnnouncementsHandler);
app.post('/api/admin/announcements', createAnnouncementHandler);
app.put('/api/admin/announcements/:id', updateAnnouncementHandler);
app.delete('/api/admin/announcements/:id', deleteAnnouncementHandler);

app.get('/api/volunteer/dashboard', getDashboard);
app.get('/api/volunteer/profile', getProfile);
app.get('/api/volunteer/shelter', getMyShelter);
app.get('/api/volunteer/shelters', getAssignedShelters);

app.get('/api/volunteer/tasks', listTasks);
app.get('/api/volunteer/tasks/stats', getTaskStats);
app.put('/api/volunteer/tasks/:id/status', volunteerUpdateTaskStatus);

app.get('/api/volunteer/victims', listVictims);
app.get('/api/volunteer/victims/stats', getVictimStats);
app.get('/api/volunteer/victims/options', getVictimOptions);
app.post('/api/volunteer/victims', registerVictim);
app.put('/api/volunteer/victims/:id/status', updateVictimStatus);
app.put('/api/volunteer/victims/:id/shelter', assignVictimShelter);

app.get('/api/volunteer/requests', listRequests);
app.get('/api/volunteer/requests/stats', getRequestStats);
app.get('/api/volunteer/requests/options', getRequestOptions);
app.get('/api/volunteer/requests/events', listRequestableEvents);
app.get('/api/volunteer/resources', listResources);
app.post('/api/volunteer/requests', createRequest);
app.get('/api/volunteer/requests/:id', getRequest);
app.put('/api/volunteer/requests/:id', updateRequest);
app.delete('/api/volunteer/requests/:id', withdrawRequest);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
