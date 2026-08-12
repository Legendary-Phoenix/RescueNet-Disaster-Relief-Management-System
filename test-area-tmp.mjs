const ev = await (await fetch('http://localhost:3000/api/admin/disaster-events')).json()
const eventId = ev[0].id
const areas = await (await fetch('http://localhost:3000/api/admin/areas')).json()
const areaId = areas[0].id
console.log('eventId', eventId)
console.log('areaId', areaId)
const url = `http://localhost:3000/api/admin/areas/${areaId}?eventId=${eventId}`
console.log('URL', url)
const res = await fetch(url)
console.log('STATUS', res.status)
console.log(await res.text())
