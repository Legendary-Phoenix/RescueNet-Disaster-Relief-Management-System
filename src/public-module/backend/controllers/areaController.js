import * as areaService from '../services/areaService.js';

export async function getAreas(req, res) {
  try {
    const { search, state, hasActiveEvent } = req.query;
    const areas = await areaService.findAll({ search, state, hasActiveEvent: hasActiveEvent === 'true' });
    res.json(areas);
  } catch (err) {
    console.error('Error fetching areas:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAreaDetails(req, res) {
  try {
    const data = await areaService.getDetails(req.params.areaId);
    if (!data) return res.status(404).json({ error: 'Area not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching area details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
