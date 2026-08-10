import express from 'express';
import cors from 'cors';
import { getDisasterEvents } from './src/organization-module/backend/controllers/disasterEventController.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/organization/disaster-events', getDisasterEvents);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
