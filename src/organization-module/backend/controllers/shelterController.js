import * as shelterService from '../services/shelterService.js';

export async function getShelterDetails(req, res) {
  try {
    const { eventId } = req.query;
    const data = await shelterService.getDetails(req.params.shelterId, eventId);
    if (!data) return res.status(404).json({ error: 'Shelter not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching shelter details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
