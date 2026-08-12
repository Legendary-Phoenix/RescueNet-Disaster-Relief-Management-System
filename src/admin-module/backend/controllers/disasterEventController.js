import {
  listDisasterEvents,
  getDisasterEventDashboard,
  createDisasterEvent,
  updateDisasterEventStatus,
} from '../services/disasterEventService.js'



// list all disasters
export async function listDisasterEventsHandler(req, res) {
  try {
    const { status, type, area, date, search } = req.query
    const events = await listDisasterEvents({ status, type, area, date, search })
    res.status(200).json(events)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}



export async function getDisasterEventDashboardHandler(req, res) {
  try {
    const dashboard = await getDisasterEventDashboard(req.params.id)
    if (!dashboard) {
      return res.status(404).json({ message: 'Event not found' })
    }
    res.status(200).json(dashboard)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}


//create disaster (hah)
export async function createDisasterEventHandler(req, res) {
  try {
    const event = await createDisasterEvent({
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      severity: req.body.severity,
      startDate: req.body.startDate,
      areaIds: req.body.areaIds,
    })
    res.status(201).json(event)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}


// update
export async function updateDisasterEventStatusHandler(req, res) {
  try {
    const { status, endDate } = req.body
    //status should be required
    if (!status) {
      return res.status(400).json({ message: 'Status is required' })
    }
    const event = await updateDisasterEventStatus({
      eventId: req.params.id,
      status,
      endDate,
    })
    res.status(200).json(event)
  } catch (err) {
    if (err.message === 'Event not found') {
      return res.status(404).json({ message: err.message })
    }
    if (err.message.startsWith('Invalid status')) {
      return res.status(400).json({ message: err.message })
    }
    res.status(500).json({ message: err.message })
  }
}
//TODO: 