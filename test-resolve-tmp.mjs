const BASE = 'http://localhost:3000/api/admin'
const areas = await (await fetch(`${BASE}/areas`)).json()
const createdEvent = await (await fetch(`${BASE}/disaster-events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test Event 2', description: 'x', type: 'FLOOD', severity: 'HIGH', startDate: '2026-08-01', areaIds: [areas[0].id] }),
})).json()
console.log('created', createdEvent.id)
const res = await fetch(`${BASE}/disaster-events/${createdEvent.id}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'RESOLVED' }),
})
console.log('STATUS', res.status)
console.log(await res.text())
