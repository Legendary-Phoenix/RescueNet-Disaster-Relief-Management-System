import {
  listShelters,
  createShelter,
  updateShelter,
  deleteShelter,
} from '../services/shelterService.js'
import { getShelterDetail } from '../services/disasterEventService.js'

export async function listSheltersHandler(req, res) {
  try {
    const { search } = req.query
    const shelters = await listShelters({ search })
    res.status(200).json(shelters)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export async function getShelterDetailHandler(req, res) {
  try {
    const { eventId } = req.query
    if (!eventId) {
      return res.status(400).json({ message: 'eventId query parameter is required' })
    }
    const detail = await getShelterDetail(req.params.id, eventId)
    if (!detail) {
      return res.status(404).json({ message: 'Shelter not found' })
    }
    res.status(200).json(detail)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export async function createShelterHandler(req, res) {
  try {
    const shelter = await createShelter({
      name: req.body.name,
      address: req.body.address,
      contactNumber: req.body.contactNumber,
      capacity: req.body.capacity,
      status: req.body.status,
      areaId: req.body.areaId,
    })
    res.status(201).json(shelter)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

export async function updateShelterHandler(req, res) {
  try {
    const shelter = await updateShelter({
      shelterId: req.params.id,
      name: req.body.name,
      address: req.body.address,
      contactNumber: req.body.contactNumber,
      capacity: req.body.capacity,
      status: req.body.status,
      areaId: req.body.areaId,
    })
    res.status(200).json(shelter)
  } catch (err) {
    if (err.message === 'Shelter not found') {
      return res.status(404).json({ message: err.message })
    }
    res.status(400).json({ message: err.message })
  }
}

export async function deleteShelterHandler(req, res) {
  try {
    await deleteShelter(req.params.id)
    res.status(200).json({ message: 'Shelter deleted' })
  } catch (err) {
    if (err.message === 'Shelter not found') {
      return res.status(404).json({ message: err.message })
    }
    res.status(500).json({ message: err.message })
  }
}
