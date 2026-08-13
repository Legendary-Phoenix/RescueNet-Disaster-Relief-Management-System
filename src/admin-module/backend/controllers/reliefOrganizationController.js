import {
  getReliefOrganizations,
  getReliefOrganizationById,
  updateReliefOrganizationStatus as updateOrganizationStatus,
} from '../services/reliefOrganizationService.js'



//list orgs
export async function listReliefOrganizations(req, res) {
  try {
    const { status, search } = req.query
    const organizations = await getReliefOrganizations({ status, search })
    res.status(200).json(organizations)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}


// get specific org
export async function getReliefOrganization(req, res) {
  try {
    const organization = await getReliefOrganizationById(req.params.id)
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' })
    }
    res.status(200).json(organization)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

//update
export async function updateReliefOrganizationStatus(req, res) {
  try {
    const { status } = req.body
    //status
    if (!status) {
      return res.status(400).json({ message: 'Status is required' })
    }
    const organization = await updateOrganizationStatus({
      orgId: req.params.id,
      status,
    })
    res.status(200).json(organization)
  } catch (err) {
    if (err.message === 'Organization not found') {
      return res.status(404).json({ message: err.message })
    }
    if (err.message.startsWith('Invalid status')) {
      return res.status(400).json({ message: err.message })
    }
    res.status(500).json({ message: err.message })
  }
}
