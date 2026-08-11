export default class Area {
  constructor(row) {
    this.area_id = row.area_id;
    this.name = row.name;
    this.state = row.state;
    if (row.shelter_count !== undefined) this.shelter_count = row.shelter_count;
    if (row.victim_count !== undefined) this.victim_count = row.victim_count;
    if (row.need_level !== undefined) this.need_level = row.need_level;
    if (row.need_score !== undefined) this.need_score = row.need_score;
  }
}
