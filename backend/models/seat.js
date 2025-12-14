import pool from '../db/index.js';

export async function getSeatsForTheatre(theatreId) {
  const { rows } = await pool.query(
    'SELECT seat_id, row_label, seat_number, seat_type FROM seats WHERE theatre_id=$1 ORDER BY row_label, seat_number',
    [theatreId]
  );
  return rows;
}
