import * as volunteerService from '../services/volunteerService.js';

export async function getVolunteers(req, res) {
  try {
    const { status, shelter, search } = req.query;
    const volunteers = await volunteerService.findAll({ status, shelter, search });
    res.json(volunteers);
  } catch (err) {
    console.error('Error fetching volunteers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createVolunteer(req, res) {
  try {
    const id = await volunteerService.create(req.body);
    res.status(201).json({ volunteer_id: id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Error creating volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateVolunteer(req, res) {
  try {
    await volunteerService.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function removeVolunteer(req, res) {
  try {
    await volunteerService.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateAssignment(req, res) {
  try {
    await volunteerService.updateShelterAssignment(req.params.id, req.body.shelterId || null);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating assignment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listShelters(req, res) {
  try {
    const shelters = await volunteerService.getAllShelters({ event: req.query.event });
    res.json(shelters);
  } catch (err) {
    console.error('Error fetching shelters:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
