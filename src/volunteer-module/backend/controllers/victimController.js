import * as fieldService from '../services/volunteerFieldService.js';

const GENDERS = ['MALE', 'FEMALE'];

export async function registerVictim(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { name, age, gender, shelterId, eventId } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!shelterId) return res.status(400).json({ error: 'shelterId is required' });
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });
    if (gender && !GENDERS.includes(gender)) return res.status(400).json({ error: `gender must be one of: ${GENDERS.join(', ')}` });
    const data = await fieldService.registerVictim(volunteerId, {
      name: name.trim().slice(0, 100),
      age: age != null ? parseInt(age, 10) : null,
      gender: gender || null,
      shelterId,
      eventId,
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function listVictims(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { shelterId, search, scope } = req.query;
    const data = await fieldService.listVictims(volunteerId, { shelterId, search, scope });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getVictimStats(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { shelterId, scope } = req.query;
    const data = await fieldService.getVictimStats(volunteerId, { shelterId, scope });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function dischargeVictim(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    const data = await fieldService.dischargeVictim(volunteerId, id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function assignVictimShelter(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    const { shelterId } = req.body;
    if (!shelterId) return res.status(400).json({ error: 'shelterId is required' });
    const data = await fieldService.assignVictimToShelter(volunteerId, id, shelterId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getVictimOptions(req, res) {
  res.json({ genders: GENDERS });
}
