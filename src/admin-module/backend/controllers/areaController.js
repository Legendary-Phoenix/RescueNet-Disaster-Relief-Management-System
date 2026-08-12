import { listAreas } from '../services/areaService.js'
import { getAreaDetail } from '../services/disasterEventService.js'

export async function listAreasHandler(req, res) {
  try {
    const areas = await listAreas()
    res.status(200).json(areas)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export async function getAreaDetailHandler(req, res) {
  try {
    const { eventId } = req.query
    if (!eventId) {
      return res.status(400).json({ message: 'eventId query parameter is required' })
    }
    const detail = await getAreaDetail(req.params.id, eventId)
    if (!detail) {
      return res.status(404).json({ message: 'Area not found' })
    }
    res.status(200).json(detail)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
