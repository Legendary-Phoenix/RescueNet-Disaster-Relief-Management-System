import * as announcementService from '../services/announcementService.js';

export async function getAnnouncements(req, res) {
  try {
    const { event_id, search } = req.query;
    const announcements = await announcementService.findAll({ event_id, search });
    res.json(announcements);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRecentAnnouncements(req, res) {
  try {
    const announcements = await announcementService.findRecent();
    res.json(announcements);
  } catch (err) {
    console.error('Error fetching recent announcements:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
