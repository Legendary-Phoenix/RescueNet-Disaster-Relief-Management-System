import * as taskService from '../services/taskService.js';

export async function getTasks(req, res) {
  try {
    const { status, shelter, event, volunteer, search } = req.query;
    const data = await taskService.findAll({ status, shelter, event, volunteer, search });
    res.json(data);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTask(req, res) {
  try {
    const result = await taskService.create(req.body);
    res.json(result);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTask(req, res) {
  try {
    await taskService.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTaskStatus(req, res) {
  try {
    await taskService.updateStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTask(req, res) {
  try {
    await taskService.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
