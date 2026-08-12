const BASE = 'http://localhost:3000/api/admin'

async function j(url, opts) {
  const res = await fetch(url, opts)
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

const areas = (await j(`${BASE}/areas`)).body
const areaId = areas[0].id

const createdShelter = await j(`${BASE}/shelters`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test Shelter Alpha', address: '1 Test Road', contactNumber: '0100000000', capacity: 100, status: 'OPEN', areaId }),
})
console.log('CREATE SHELTER', createdShelter.status, createdShelter.body?.name, createdShelter.body?.id)
const sid = createdShelter.body?.id

const updatedShelter = await j(`${BASE}/shelters/${sid}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test Shelter Beta', address: '2 Test Road', contactNumber: '0100000001', capacity: 150, status: 'CLOSED', areaId }),
})
console.log('UPDATE SHELTER', updatedShelter.status, updatedShelter.body?.name, updatedShelter.body?.status)

const createdEvent = await j(`${BASE}/disaster-events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test Event Gamma', description: 'Created by test', type: 'FLOOD', severity: 'HIGH', startDate: '2026-08-01', areaIds: [areaId] }),
})
console.log('CREATE EVENT', createdEvent.status, createdEvent.body?.name, createdEvent.body?.id)
const eid = createdEvent.body?.id

const resolvedEvent = await j(`${BASE}/disaster-events/${eid}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'RESOLVED' }),
})
console.log('RESOLVE EVENT', resolvedEvent.status, resolvedEvent.body?.status, resolvedEvent.body?.endDate)

const badEvent = await j(`${BASE}/disaster-events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Bad', type: 'NOPE', severity: 'HIGH', areaIds: [areaId] }),
})
console.log('BAD CREATE EVENT', badEvent.status, JSON.stringify(badEvent.body))

const deleted = await j(`${BASE}/shelters/${sid}`, { method: 'DELETE' })
console.log('DELETE SHELTER', deleted.status, JSON.stringify(deleted.body))

const areaDetail = await j(`${BASE}/areas/${areaId}?eventId=${eid}`)
console.log('AREA DETAIL (new event)', areaDetail.status, JSON.stringify(areaDetail.body.area))
