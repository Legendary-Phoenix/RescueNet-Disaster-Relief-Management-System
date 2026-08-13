import * as fieldService from '../services/volunteerFieldService.js';

export async function getDashboard(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const shelterId = req.query.shelterId || null;
    const data = await fieldService.getDashboard(volunteerId, shelterId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getProfile(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const data = await fieldService.getProfile(volunteerId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getMyShelter(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const shelterId = req.query.shelterId || null;
    const data = await fieldService.getMyShelter(volunteerId, shelterId);
    if (!data) return res.status(404).json({ error: 'No shelter assignment found' });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getAssignedShelters(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const data = await fieldService.getAssignedShelters(volunteerId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
