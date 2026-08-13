# Volunteer module

Field app for the **Volunteer** role — a field worker who belongs to a Relief
Organization, is deployed to shelters, and carries out relief operations on the
ground.

## Running it

```bash
npm install
cp .env.example .env      # then set DB_PASSWORD for your local postgres user
npm run db:migrate        # creates the rescuenet database + all 18 tables
npm run db:seed           # development data
npm run dev               # Vite on :5173, application tier on :4000
```

Open <http://localhost:5173/volunteer/dashboard>.

## Screens

One route per feature in the role spec.

| Route | Feature | What it does |
| --- | --- | --- |
| `/volunteer/dashboard` | Operations Dashboard | Assigned shelter details (capacity and occupancy), inventory summary banded by days of cover, the active disaster event, urgent alerts derived from all three, and a snapshot of assigned tasks |
| `/volunteer/victims` | Victim Registration | Register a new victim, assign them to a shelter, browse the register, and search or filter it |
| `/volunteer/requests` | Resource Requests | Raise a request by shelter and event, update or withdraw one still pending, and follow every request through to fulfilment |
| `/volunteer/tasks` | Task Management | The full task list with the field status control — pending, in progress, completed |

The read-only public shelter directory that used to sit at
`/volunteer/directory` now lives in `src/public-module/` — it is public
information, so it belongs to the module that owns that audience.

## Layout

```
src/shared/                        used by every role module
├── ui/theme.css                   design tokens + all `rn-` component classes
├── ui/components.jsx              Button, Card, Modal, StatusBadge, gauges, ...
├── ui/UnifiedDetailsPanel.jsx     the shared shelter/area slide-over
├── ui/Icons.jsx · ui/format.js
├── lib/directory.js               client face of the shared directory controller
└── backend/directoryController.js cross-role reads (events, announcements,
    backend/directoryService.js    shelters, areas) + detailsService.js

src/volunteer-module/
├── backend/
│   ├── controllers/               plain async fns: (ctx, ...args) → data | throw
│   │   ├── taskController.js
│   │   ├── victimController.js
│   │   ├── dashboardController.js
│   │   └── resourceRequestController.js
│   └── services/                  raw SQL + field rules
│       ├── volunteerFieldService.js
│       └── resourceRequestService.js
└── frontend/
    ├── routes.js                  route list, concatenated by src/App.jsx
    ├── volunteer.css              module-specific styles (`vm-` prefix)
    ├── lib/controllers.js         client face of the controllers above
    ├── lib/VolunteerContext.jsx   identity switcher; publishes ambient identity
    ├── components/                shell, shelter switcher, alert feed, task
    │                              card, victim + request modals
    └── pages/                     Dashboard, Victims, Requests, Tasks
```

**Two tiers, no route table.** A React component imports a controller and calls
it: `await taskController.updateTaskStatus(taskId, 'COMPLETED')`. There are no
`routes.js` files on the backend, no `express.Router()`, no paths, verbs or
status codes in any module file. One generic bridge in `server.js` carries the
call to `dispatcher.js`, which looks it up in `rpc/registry.js` — so adding a
method means editing the registry, never the server.

Identity is ambient, not an argument. `VolunteerContext` publishes the selected
volunteer through `setIdentity()`, the dispatcher resolves it into a `ctx` that
every controller receives first, and pages gate their loads on `ready` so
nothing calls before a volunteer exists.

**No CSS framework.** Everything is plain CSS: shared tokens and component
classes in `src/shared/ui/theme.css` (`rn-` prefix), module-specific rules in
`volunteer.css` (`vm-` prefix), and inline styles only for one-off layout.

Spacing comes from tokens rather than per-file numbers: `--rn-gap` (16px) for
form field gaps and stacked elements, `--rn-gap-lg` (24px) for grid gutters and
the space between cards in a column, `--rn-pad-modal` (24px) for every modal
region. Controls share one surface — `--rn-border`, `--rn-radius-sm`,
`--rn-shadow-sm` — so an input, a select and an option card read as the same
material. Reusable form pieces: `.rn-panel` (recessed sub-panel),
`.rn-optiongrid` (1/2/3 responsive option grid), `.rn-reveal` (the animated
block a conditional "Other / Custom..." field appears in).

## Controllers

Import from `frontend/lib/controllers.js` and call. Every method resolves the
acting volunteer from the ambient identity, so none of them takes a volunteer id.
Reads that a newer render can supersede take an `AbortSignal` as a last argument.

| Controller · method | Purpose |
| --- | --- |
| `accountController.listAccounts()` | dev identity switcher (no identity needed) |
| `dashboardController.getProfile()` | profile, organization, shelter deployments |
| **1. Operations dashboard** | |
| `dashboardController.getDashboard(shelterId?)` | shelter + inventory + active events + alerts + task snapshot, composed |
| `dashboardController.getMyShelter(shelterId?)` | the shelter on its own, with banded inventory and occupants |
| **2. Victim registration** | |
| `victimController.listVictims({ shelterId, status, search, scope })` | the register; `scope: 'mine'` narrows to own registrations |
| `victimController.getVictimStats({ shelterId, scope })` | headcount by status, same scope as the list |
| `victimController.getVictimOptions()` | status + special-needs vocabulary and its limits |
| `victimController.registerVictim(input)` | register an arrival; `specialNeeds[]` accepts custom strings |
| `victimController.updateVictimStatus(victimId, status)` | field status change |
| `victimController.assignVictimShelter(victimId, shelterId)` | move between shelters you cover |
| **3. Resource requests** | |
| `resourceRequestController.listRequests({ shelterId, status, scope })` | requests with their line items |
| `resourceRequestController.getRequestStats({ shelterId, scope })` | counts by status, same scope as the list |
| `resourceRequestController.getRequestOptions()` | catalogue + active events you can request against |
| `resourceRequestController.createRequest(input)` | raise one; each item is `{ resourceId }` **or** `{ custom: { category, name, unit } }` plus `quantity` |
| `resourceRequestController.getRequest(requestId)` | one request |
| `resourceRequestController.updateRequest(requestId, { items })` | replace the line items (pending, yours only) |
| `resourceRequestController.withdrawRequest(requestId)` | mark your pending request REVOKED |
| **4. Task management** | |
| `taskController.listTasks({ filter, priority, shelterId })` | `filter` is `''` / `PENDING` / `IN_PROGRESS` / `COMPLETED` / `OVERDUE` |
| `taskController.getTaskStats()` | the four KPI counters |
| `taskController.updateTaskStatus(taskId, status)` | field status change; returns `{ task, stats }` |
| **Shared reads** (`shared/lib/directory.js`) | |
| `directoryController.listEvents/listAnnouncements/listShelters/listAreas` | public cross-role reads |
| `directoryController.getShelterDetail(id, viewerOrgId?)` · `getAreaDetail(...)` | Unified Details Panel |

A failure throws a `ControllerError` carrying a semantic `code`
(`INVALID_INPUT`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNAUTHENTICATED`,
`INTERNAL`) and a message written for a field worker — never a status number.

## Behaviour worth knowing

- **The dashboard is a 12-column split, ordered by urgency.** Eight columns of
  operations workspace on the left — alerts, then the volunteer's own tasks,
  then the shelter they are standing in, then its stock — and four columns of
  context on the right, broadcasts first. The blue banner at the top is the only
  place the organization, shelter and disaster event are named; no panel below
  repeats them. Below 1080px the two columns become one.
- **Registered ≠ occupants, and the dashboard says so.** `current_occupancy` is
  the headcount the shelter reports; `registered_victims` counts rows in the
  victim register. The register is a subset — anyone admitted before the system
  arrived, or logged by another agency, is in the building but not in the data —
  so the shelter panel shows both, plus how many people on site are not yet on
  the register. Conflating them loses a shelter's worth of people.
- **The dashboard is one request, not five.** `/dashboard` composes the shelter,
  its inventory, the active events for its area, the task counters and the alert
  feed on the server, so everything on screen describes the same instant instead
  of five responses that arrived at different times.
- **Alerts are derived, never stored.** `buildAlerts()` reads occupancy, days of
  supply cover, open requests, overdue tasks and the medical-attention headcount
  and emits the feed from those. Nothing to keep in sync, and an alert cannot
  contradict the number rendered next to it. Supply shortfalls are grouped by
  band rather than one row per resource — five "running low" rows would push the
  overcrowding warning off the top of the feed, which defeats the point.
- **A critical shortfall knows whether it is already covered.** The alert checks
  the open requests for that shelter and only offers "Raise a resource request"
  for the resources no pending or approved request already names.
- **Counters take the same scope as the list under them.** The victim and request
  stats endpoints accept the same `shelterId` and `scope` filters as their list
  endpoints — and only those, since the cards *are* the status breakdown. A card
  can never claim work the list below it does not show.
- **Optimistic status updates.** Tapping Pending → In Progress → Completed flips
  the card immediately, then reconciles against the server response. Any failure
  restores the previous snapshot and shows why — a field worker on a bad
  connection sees instant feedback without ever being lied to about what stuck.
- **Volunteers cannot revoke tasks.** The status control only offers PENDING,
  IN_PROGRESS and COMPLETED. REVOKED belongs to the issuing organization, and the
  API rejects it from this role; a revoked task renders read-only. Resource
  requests are the mirror image: the volunteer raises them, so they may withdraw
  their own — but only while it is still PENDING.
- **Requests are replaced, not patched.** `PATCH /requests/:id` sends the whole
  item list, because that is the only shape in which removing a line is
  expressible; the server swaps the lines in one transaction. The shelter and
  event are fixed once the request exists — changing what a pending request is
  *for* is a new request, and the organization may already be acting on it.
- **Registration is transactional.** `POST /victims` inserts the `Victim` row and
  increments `Shelter.current_occupancy` together, with the shelter row locked
  `FOR UPDATE`, so two volunteers registering at once cannot push a shelter past
  capacity. It refuses closed shelters, full shelters, resolved events, and any
  shelter the volunteer is not assigned to.
- **Moving a victim moves both counters.** `PATCH /victims/:id/shelter` locks
  both shelters in a fixed id order — so two simultaneous transfers cannot
  deadlock — decrements the origin and increments the destination in one
  transaction. Both ends must be shelters the volunteer covers, and someone who
  does not currently occupy a bed moves without touching either counter.
- **Victim status drives occupancy.** `CHECKED_IN` and `MEDICAL_ATTENTION`
  occupy a bed; `TRANSFERRED` and `DISCHARGED` do not. Moving someone across
  that line updates `Shelter.current_occupancy` in the same transaction, with
  the shelter row locked, so the capacity gauge can never drift from the
  occupant list. Re-admitting into a full shelter is refused as a CONFLICT.
- **The four KPI cards are the only filter on the tasks page.** A card is not a
  read-out that happens to be clickable — it *is* the control, and the list below
  is always the rows behind whichever card is lit. The inline filter pills that
  used to sit in the list header are gone: two controls for one piece of state is
  two things to keep in agreement, and they drifted. An "All tasks" pill next to
  the section title is the reset. The choice lives in the query string
  (`?filter=overdue`) so the dashboard alert links straight to it and the view
  survives a reload.
- **Every card agrees with the list it opens, by construction.** `OVERDUE` is a
  derived view rather than a status, and the server applies *exactly* the
  predicate behind the Overdue KPI — excluding `REVOKED` as well as `COMPLETED`,
  since a withdrawn task is not outstanding work. `COMPLETED` narrows to
  *today's* completions for the same reason: the card counts today, so a card
  reading 2 must never open a list of 9. Both predicates are defined once in the
  service and shared by the counter and the list.
- **A task card offers one action, not a state machine.** `PENDING` shows
  "Start task", `IN_PROGRESS` shows "Mark complete", `COMPLETED` shows a flat
  badge. It replaced a three-way segmented toggle whose targets were ~60px wide
  side by side — under the comfortable touch minimum, with the routine option
  adjacent to the one nobody wants to hit by accident. Moving work backwards is
  deliberately not offered from the field.
- **The shelter choice is module-wide.** Volunteers covering more than one
  shelter pick which in the header; the selection lives in `VolunteerContext`,
  so switching on the dashboard is still in effect on the victim register and
  the request list. It resets when the acting volunteer changes.
- **Special needs are bounded free text.** `Victim.special_needs` is a `TEXT[]`.
  Tags from the vocabulary in `src/core/victimNeeds.js` pass through as-is;
  anything else is accepted as a volunteer-authored custom need, because the
  list cannot anticipate every situation in the field. It is still bounded —
  trimmed, whitespace-collapsed, `MAX_NEED_LENGTH` characters, de-duplicated
  case-insensitively, and at most `MAX_CUSTOM_NEEDS` free-text entries — since
  the array renders straight into the occupant list and the details panel, and
  one unbounded registration would push a wall of text through every screen
  that reads it. The limits ship to the client on `/victims/options`.
- **A custom resource becomes a real catalogue row.**
  `ResourceRequestItem.resource_id` is a foreign key, so a custom item cannot be
  a loose string on the request — `resolveCustomResource()` reuses an existing
  `Resource` with the same category and name (case-insensitively) or creates
  one. The third volunteer to ask for mosquito nets adds to the same entry as
  the first, and it appears in everyone's item dropdown afterwards. The
  **category stays one of the four `resource_type` values**: that enum is the
  shared schema's taxonomy, and widening it would be a migration every other
  role module has to run. Because a custom line and a catalogue line can resolve
  to the same id, the duplicate check runs again after resolution.
- **Supply banding.** Under 1 day of cover is `CRITICAL`, under 3 is `LOW`, else
  `SUFFICIENT`. Rates per person per day live in `src/core/needLevel.js`. Use
  `<SupplyBadge>` rather than `<StatusBadge>` for these: `LOW` means opposite
  things in the two vocabularies that use it — a low-priority task is calm, a
  low supply line is a warning.
- **Availability banding.** `CLOSED` as recorded, `OVERCROWDED` at or above 90%
  of capacity, else `NORMAL`. Derived, not stored.

## Identity is a stub

No login yet. The signed-in volunteer is chosen in the sidebar and published as
the ambient identity every call carries: `VolunteerContext` calls
`setIdentity()`, the dispatcher passes it to `src/core/volunteerContext.js`,
which verifies the id is an **ACTIVE** volunteer and returns the `ctx` that every
controller receives as its first parameter. Every service still takes
`volunteerId` as its first argument, so replacing the stub with real auth means
editing that one file. Pages gate their loads on `ready` so nothing calls before
a volunteer exists. The organization module has the mirror-image stub in
`orgContext.js`.

Seeded volunteers (all accounts use `Password123!`):

| Volunteer | volunteer_id | Organization |
| --- | --- | --- |
| Nurul Aisyah binti Rahman | `c0000000-0000-4000-8000-000000000001` | Mercy Relief Malaysia |
| Daniel Tan Wei Jie (two shelters) | `c0000000-0000-4000-8000-000000000002` | Mercy Relief Malaysia |
| Rajesh Subramaniam | `c0000000-0000-4000-8000-000000000009` | Bulan Sabit Merah |
| Chong Kar Wai | `c0000000-0000-4000-8000-000000000007` | INACTIVE → 403 |

## Schema note

Five columns and two enums were added for this module. All are additive and
defaulted, so no other role module needs to change — but `schema.sql` is
shared, so tell the team before merging. Resource requests needed **no** schema
change: `ResourceRequest.created_by` already references `Volunteer`, so raising
one is a volunteer action by design.

| Object | Definition |
| --- | --- |
| `task_priority` | enum `LOW / MEDIUM / HIGH / URGENT` |
| `Task.priority` | `task_priority NOT NULL DEFAULT 'MEDIUM'` |
| `Task.due_date` | `TIMESTAMP NULL` |
| `victim_status` | enum `CHECKED_IN / MEDICAL_ATTENTION / TRANSFERRED / DISCHARGED` |
| `Victim.status` | `victim_status NOT NULL DEFAULT 'CHECKED_IN'` |
| `Victim.special_needs` | `TEXT[] NOT NULL DEFAULT '{}'` |
| `Victim.contact_number` | `VARCHAR(20)` |

Every timestamp column is `timestamp WITHOUT time zone`. Write local timestamp
strings via `toLocalTimestamp()` in `src/core/http.js`, never `toISOString()` —
a UTC string loses its offset on the way in and comes back hours adrift, which
silently flips "Due today" into "Overdue".
