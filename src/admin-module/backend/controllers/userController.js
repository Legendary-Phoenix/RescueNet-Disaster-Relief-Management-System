import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../services/userService.js'




export async function listUsersHandler(req, res) {
  try {
    const { search } = req.query
    const users = await listUsers({ search })
    res.status(200).json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}


// in service it needs to put the new entry in the correct role table
export async function createUserHandler(req, res) {
  try {
    const user = await createUser({
      username: req.body.username,
      password: req.body.password,
      role: req.body.role,
      name: req.body.name,
      contactNumber: req.body.contactNumber,
      age: req.body.age,
      gender: req.body.gender,
      organizationId: req.body.organizationId,
      address: req.body.address,
    })
    res.status(201).json(user)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

// update 
export async function updateUserHandler(req, res) {
  try {
    const user = await updateUser({
      userId: req.params.id,
      username: req.body.username,
      role: req.body.role,
      password: req.body.password,
      name: req.body.name,
      contactNumber: req.body.contactNumber,
      age: req.body.age,
      gender: req.body.gender,
      organizationId: req.body.organizationId,
      address: req.body.address,
    })
    res.status(200).json(user)
  } catch (err) {
    if (err.message === 'User not found') {
      return res.status(404).json({ message: err.message })
    }
    res.status(400).json({ message: err.message })
  }
}

// deletion also requires checkin the role table
export async function deleteUserHandler(req, res) {
  try {
    await deleteUser(req.params.id)
    res.status(200).json({ message: 'User deleted' })
  } catch (err) {
    if (err.message === 'User not found') {
      return res.status(404).json({ message: err.message })
    }
    if (err.message.startsWith('Cannot delete')) {
      return res.status(400).json({ message: err.message })
    }
    res.status(500).json({ message: err.message })
  }
}
