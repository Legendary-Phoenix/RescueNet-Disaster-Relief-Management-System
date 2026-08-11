export default class Volunteer {
  constructor(row) {
    this.volunteer_id = row.volunteer_id;
    this.name = row.name;
    this.age = row.age;
    this.gender = row.gender;
    this.contact_number = row.contact_number;
    this.status = row.status;
    if (row.username !== undefined) this.username = row.username;
    if (row.shelters !== undefined) this.shelters = row.shelters;
  }
}
