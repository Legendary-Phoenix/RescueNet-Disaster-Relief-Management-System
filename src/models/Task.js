export default class Task {
  constructor(row) {
    this.task_id = row.task_id;
    this.title = row.title;
    this.description = row.description;
    this.status = row.status;
    this.assigned_to = row.assigned_to;
    this.created_by = row.created_by;
    this.shelter_id = row.shelter_id;
    this.event_id = row.event_id;
    this.created_at = row.created_at;
    if (row.volunteer_name !== undefined) this.volunteer_name = row.volunteer_name;
    if (row.shelter_name !== undefined) this.shelter_name = row.shelter_name;
    if (row.event_name !== undefined) this.event_name = row.event_name;
  }
}
