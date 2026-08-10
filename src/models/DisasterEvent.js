export default class DisasterEvent {
  constructor({ event_id, name, description, type, severity, start_date, end_date, status, created_by, area_count }) {
    this.event_id = event_id;
    this.name = name;
    this.description = description;
    this.type = type;
    this.severity = severity;
    this.start_date = start_date;
    this.end_date = end_date;
    this.status = status;
    this.created_by = created_by;
    if (area_count !== undefined) this.area_count = area_count;
  }
}
