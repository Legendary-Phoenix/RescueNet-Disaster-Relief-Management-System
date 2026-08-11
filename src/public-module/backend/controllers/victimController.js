import * as victimService from '../services/victimService.js';

const MIN_NAME_LENGTH = 2;

export async function searchVictims(req, res) {
  try {
    const { name, event_id, shelter_id } = req.query;
    const trimmedName = (name ?? '').trim();

    if (trimmedName.length < MIN_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be at least ${MIN_NAME_LENGTH} characters` });
    }

    const victims = await victimService.search({ name: trimmedName, event_id, shelter_id });
    res.json(victims);
  } catch (err) {
    console.error('Error searching victims:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
