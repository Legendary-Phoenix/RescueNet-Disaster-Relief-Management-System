import pool from '../../../db.js';
import Volunteer from '../../../models/Volunteer.js';

async function getOrgId() {
  const { rows } = await pool.query(
    `SELECT org_id FROM ReliefOrganization WHERE status = 'APPROVED' LIMIT 1`
  );
  return rows[0]?.org_id;
}

export async function findAll({ status, shelter, search } = {}) {
  const orgId = await getOrgId();
  const params = [orgId];
  let query = `
    SELECT v.volunteer_id, v.name, v.age, v.gender, v.contact_number, v.status,
      u.username,
      COALESCE(
        json_agg(json_build_object('shelter_id', s.shelter_id, 'name', s.name))
        FILTER (WHERE s.shelter_id IS NOT NULL),
        '[]'
      ) AS shelters
    FROM Volunteer v
    JOIN "User" u ON v.volunteer_id = u.user_id
    LEFT JOIN VolunteerShelterAssignment vsa ON v.volunteer_id = vsa.volunteer_id
    LEFT JOIN Shelter s ON vsa.shelter_id = s.shelter_id
    WHERE v.organization_id = $1
  `;

  if (status) {
    params.push(status);
    query += ` AND v.status = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    query += ` AND v.name ILIKE $${params.length}`;
  }
  if (shelter) {
    params.push(shelter);
    query += ` AND EXISTS (
      SELECT 1 FROM VolunteerShelterAssignment vsa2
      WHERE vsa2.volunteer_id = v.volunteer_id AND vsa2.shelter_id = $${params.length}
    )`;
  }

  query += ` GROUP BY v.volunteer_id, v.name, v.age, v.gender, v.contact_number, v.status, u.username
             ORDER BY v.name`;

  const { rows } = await pool.query(query, params);
  return rows.map(r => new Volunteer(r));
}

export async function create({ username, name, age, gender, contact_number }) {
  const orgId = await getOrgId();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [user] } = await client.query(
      `INSERT INTO "User" (username, password, role) VALUES ($1, $2, 'VOLUNTEER') RETURNING user_id`,
      [username, 'password123']
    );
    await client.query(
      `INSERT INTO Volunteer (volunteer_id, name, age, gender, contact_number, organization_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')`,
      [user.user_id, name, age, gender, contact_number, orgId]
    );
    await client.query('COMMIT');
    return user.user_id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(volunteerId, { name, age, gender, contact_number, status }) {
  await pool.query(
    `UPDATE Volunteer SET name = $2, age = $3, gender = $4, contact_number = $5, status = $6
     WHERE volunteer_id = $1`,
    [volunteerId, name, age, gender, contact_number, status]
  );
}

export async function remove(volunteerId) {
  await pool.query(
    `UPDATE Volunteer SET status = 'INACTIVE' WHERE volunteer_id = $1`,
    [volunteerId]
  );
}

export async function updateShelterAssignment(volunteerId, shelterId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM VolunteerShelterAssignment WHERE volunteer_id = $1`,
      [volunteerId]
    );
    if (shelterId) {
      await client.query(
        `INSERT INTO VolunteerShelterAssignment (volunteer_id, shelter_id) VALUES ($1, $2)`,
        [volunteerId, shelterId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getAllShelters() {
  const { rows } = await pool.query(
    `SELECT shelter_id, name, status FROM Shelter WHERE status = 'OPEN' ORDER BY name`
  );
  return rows;
}
