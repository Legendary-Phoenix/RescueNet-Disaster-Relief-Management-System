import * as areaService from '../services/areaService.js';

export async function getAreaDetails(req, res) {
  try {
    const { eventId } = req.query;
    const data = await areaService.getDetails(req.params.areaId, eventId);
    if (!data) return res.status(404).json({ error: 'Area not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching area details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
