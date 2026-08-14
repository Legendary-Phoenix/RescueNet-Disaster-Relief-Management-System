import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../services/announcementService.js'



export async function listAnnouncementsHandler(req, res) {
  try {
    const { search, eventId } = req.query
    const announcements = await listAnnouncements({ search, eventId })
    res.status(200).json(announcements)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// create announcement
export async function createAnnouncementHandler(req, res) {
  try {
    const announcement = await createAnnouncement({
      title: req.body.title,
      message: req.body.message,
      eventId: req.body.eventId,
    })
    res.status(201).json(announcement)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

export async function updateAnnouncementHandler(req, res) {
  try {
    const announcement = await updateAnnouncement({
      announcementId: req.params.id,
      title: req.body.title,
      message: req.body.message,
      eventId: req.body.eventId,
    })
    res.status(200).json(announcement)
  } catch (err) {
    if (err.message === 'Announcement not found') {
      return res.status(404).json({ message: err.message })
    }
    res.status(400).json({ message: err.message })
  }
}

export async function deleteAnnouncementHandler(req, res) {
  try {
    await deleteAnnouncement(req.params.id)
    res.status(200).json({ message: 'Announcement deleted' })
  } catch (err) {
    if (err.message === 'Announcement not found') {
      return res.status(404).json({ message: err.message })
    }
    res.status(500).json({ message: err.message })
  }
}
