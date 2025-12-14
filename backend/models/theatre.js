import pool from '../db/index.js';

export async function getAllTheatres() {
  const { rows } = await pool.query('SELECT id, name, city, address, timezone FROM theatres ORDER BY city, name');
  return rows;
}

export async function getTheatreById(id) {
  const { rows } = await pool.query('SELECT id, name, city, address, timezone FROM theatres WHERE id=$1', [id]);
  return rows[0] || null;
}

export async function countSeats(theatreId) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM seats WHERE theatre_id=$1', [theatreId]);
  return rows[0]?.c || 0;
}
