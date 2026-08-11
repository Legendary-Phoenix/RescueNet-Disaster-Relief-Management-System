import * as disasterEventService from '../services/disasterEventService.js';

export async function getEvents(req, res) {
  try {
    const { status } = req.query;
    const events = await disasterEventService.findEvents({ status });
    res.json(events);
  } catch (err) {
    console.error('Error fetching disaster events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
