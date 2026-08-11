export default class Shelter {
  constructor(row) {
    this.shelter_id = row.shelter_id;
    this.name = row.name;
    this.address = row.address;
    this.contact_number = row.contact_number;
    this.capacity = row.capacity;
    this.current_occupancy = row.current_occupancy;
    this.status = row.status;
    this.area_id = row.area_id;
    if (row.area_name !== undefined) this.area_name = row.area_name;
    if (row.area_state !== undefined) this.area_state = row.area_state;
    if (row.need_level !== undefined) this.need_level = row.need_level;
    if (row.need_score !== undefined) this.need_score = row.need_score;
    if (row.is_overloaded !== undefined) this.is_overloaded = row.is_overloaded;
  }
}
