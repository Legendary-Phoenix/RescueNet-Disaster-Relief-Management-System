import * as disasterEventService from '../services/disasterEventService.js';

export async function getDisasterEvents(req, res) {
  try {
    const { status, type, search } = req.query;
    const events = await disasterEventService.findAll({ status, type, search });
    res.json(events);
  } catch (err) {
    console.error('Error fetching disaster events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
