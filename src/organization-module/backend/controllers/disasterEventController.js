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

export async function getEventDashboard(req, res) {
  try {
    const data = await disasterEventService.getDashboard(req.params.eventId);
    if (!data) return res.status(404).json({ error: 'Event not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching event dashboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
