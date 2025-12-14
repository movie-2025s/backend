import pool from '../db/index.js';

export async function ensureShowtimesForMovie(movieId, basePriceEUR) {
  // Generate showtimes for next 7 days for the movie across all theatres
  const times = ['12:30', '15:15', '18:00', '20:45'];
  const { rows: ths } = await pool.query('SELECT id FROM theatres');

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    // normalize to local start of day to keep IDs stable
    day.setHours(0, 0, 0, 0);
    for (const t of times) {
      const [hh, mm] = t.split(':').map(Number);
      const d = new Date(day);
      d.setHours(hh, mm, 0, 0);
      for (const th of ths) {
        const id = `${movieId}-${th.id}-${d.getTime()}`;
        await pool.query(
          'INSERT INTO showtimes (id, movie_id, theatre_id, start_time, base_price_eur) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
          [id, String(movieId), th.id, d.toISOString(), basePriceEUR]
        );
      }
    }
  }
}

export async function getShowtimesForMovieAtTheatre(movieId, theatreId) {
  const { rows } = await pool.query(
    'SELECT id, start_time, base_price_eur FROM showtimes WHERE movie_id=$1 AND theatre_id=$2 ORDER BY start_time',
    [String(movieId), theatreId]
  );
  return rows;
}

export async function getShowtimesForMovieAtTheatreOnDate(movieId, theatreId, dateYMD) {
  // Filter start_time by date in Europe/Helsinki; compare on date portion
  // Using Postgres date casting: start_time::date = $3
  const { rows } = await pool.query(
    'SELECT id, start_time, base_price_eur FROM showtimes WHERE movie_id=$1 AND theatre_id=$2 AND start_time::date=$3 ORDER BY start_time',
    [String(movieId), theatreId, dateYMD]
  );
  return rows;
}

export async function getShowtimeWithTheatre(showtimeId) {
  const { rows } = await pool.query(
    'SELECT s.id, s.movie_id, s.theatre_id, s.start_time, s.base_price_eur, t.name AS theatre_name, t.city FROM showtimes s JOIN theatres t ON t.id=s.theatre_id WHERE s.id=$1',
    [showtimeId]
  );
  return rows[0] || null;
}

export async function countBookedSeats(showtimeId) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM booking_seats WHERE showtime_id=$1', [showtimeId]);
  return rows[0]?.c || 0;
}

export async function getOccupiedSeatIds(showtimeId, seatIds) {
  const { rows } = await pool.query(
    'SELECT seat_id FROM booking_seats WHERE showtime_id=$1 AND seat_id = ANY($2::text[])',
    [showtimeId, seatIds]
  );
  return rows.map(r => r.seat_id);
}
