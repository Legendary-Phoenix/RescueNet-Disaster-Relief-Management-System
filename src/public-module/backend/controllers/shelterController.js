import * as shelterService from '../services/shelterService.js';

export async function getShelters(req, res) {
  try {
    const { search, status, area_id } = req.query;
    const shelters = await shelterService.findAll({ search, status, area_id });
    res.json(shelters);
  } catch (err) {
    console.error('Error fetching shelters:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getShelterById(req, res) {
  try {
    const shelter = await shelterService.findById(req.params.id);
    if (!shelter) {
      return res.status(404).json({ error: 'Shelter not found' });
    }
    res.json(shelter);
  } catch (err) {
    console.error('Error fetching shelter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
