import * as resourceService from '../services/resourceService.js';

export async function getInventory(req, res) {
  try {
    const { shelter, type, needLevel } = req.query;
    const data = await resourceService.getInventory({ shelter, type, needLevel });
    res.json(data);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getResources(req, res) {
  try {
    res.json(await resourceService.getResources());
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addStock(req, res) {
  try {
    const { shelterId, resourceId, quantity } = req.body;
    await resourceService.addStock(shelterId, resourceId, quantity);
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding stock:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function moveStock(req, res) {
  try {
    const { fromShelterId, toShelterId, resourceId, quantity } = req.body;
    await resourceService.moveStock(fromShelterId, toShelterId, resourceId, quantity);
    res.json({ success: true });
  } catch (err) {
    if (err.message === 'Insufficient stock at source shelter') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error moving stock:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRequests(req, res) {
  try {
    const { volunteer, shelter, status, event } = req.query;
    const data = await resourceService.getRequests({ volunteer, shelter, status, event });
    res.json(data);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateRequestStatus(req, res) {
  try {
    await resourceService.updateRequestStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating request status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
