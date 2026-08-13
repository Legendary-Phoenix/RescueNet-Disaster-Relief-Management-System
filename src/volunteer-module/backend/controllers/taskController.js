import * as fieldService from '../services/volunteerFieldService.js';

const TASK_VIEWS = Object.keys(fieldService.TASK_VIEWS);

export async function listTasks(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { status, shelterId, view } = req.query;
    if (view && !TASK_VIEWS.includes(view)) {
      return res.status(400).json({ error: `view must be one of: ${TASK_VIEWS.join(', ')}` });
    }
    const data = await fieldService.listMyTasks(volunteerId, { status, shelterId, view });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getTaskStats(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const data = await fieldService.getMyTaskStats(volunteerId, { shelterId: req.query.shelterId });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updateTaskStatus(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required in request body' });
    await fieldService.updateTaskStatus(volunteerId, id, status);
    const [tasks, stats] = await Promise.all([
      fieldService.listMyTasks(volunteerId),
      fieldService.getMyTaskStats(volunteerId),
    ]);
    res.json({ task: tasks.find((t) => t.task_id === id) ?? null, stats });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
