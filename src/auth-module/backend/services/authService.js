import pool from '../../../db.js';

export async function login(username, password) {
  const { rows } = await pool.query(
    `SELECT user_id, username, role FROM "User" WHERE username = $1 AND password = $2`,
    [username, password]
  );
  if (rows.length === 0) return null;

  const user = rows[0];
  let profile = null;

  switch (user.role) {
    case 'ADMIN': {
      const { rows: r } = await pool.query(
        `SELECT name, contact_number FROM SystemAdmin WHERE admin_id = $1`, [user.user_id]
      );
      profile = r[0] || {};
      break;
    }
    case 'RELIEF_ORG': {
      const { rows: r } = await pool.query(
        `SELECT org_id, name, address, contact_number, status FROM ReliefOrganization WHERE org_id = $1`, [user.user_id]
      );
      profile = r[0] || {};
      break;
    }
    case 'VOLUNTEER': {
      const { rows: r } = await pool.query(
        `SELECT volunteer_id, name, age, gender, contact_number, status FROM Volunteer WHERE volunteer_id = $1`, [user.user_id]
      );
      profile = r[0] || {};
      break;
    }
    case 'PUBLIC': {
      const { rows: r } = await pool.query(
        `SELECT name, age, gender, contact_number FROM PublicUser WHERE user_id = $1`, [user.user_id]
      );
      profile = r[0] || {};
      break;
    }
  }

  return { ...user, profile };
}

export async function register({ username, password, role, name, contactNumber, age, gender, address }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO "User" (username, password, role) VALUES ($1, $2, $3) RETURNING user_id`,
      [username, password, role]
    );
    const userId = rows[0].user_id;

    switch (role) {
      case 'ADMIN':
        await client.query(
          `INSERT INTO SystemAdmin (admin_id, name, contact_number) VALUES ($1, $2, $3)`,
          [userId, name, contactNumber]
        );
        break;
      case 'RELIEF_ORG':
        await client.query(
          `INSERT INTO ReliefOrganization (org_id, name, address, contact_number, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
          [userId, name, address || '', contactNumber]
        );
        break;
      case 'PUBLIC':
        await client.query(
          `INSERT INTO PublicUser (user_id, name, age, gender, contact_number) VALUES ($1, $2, $3, $4, $5)`,
          [userId, name, age || null, gender || null, contactNumber]
        );
        break;
    }

    await client.query('COMMIT');
    return { user_id: userId, username, role };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
