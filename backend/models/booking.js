import pool from '../db/index.js';

export async function createBooking(client, showtimeId, customer, totalAmount) {
  const id = customer?.idOverride || null; // usually not passed
  const bookingId = id || `BK-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
  await client.query(
    'INSERT INTO bookings (id, showtime_id, customer_name, customer_email, customer_phone, total_amount, currency) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [bookingId, showtimeId, customer?.name || null, customer?.email || null, customer?.phone || null, totalAmount.toFixed(2), 'EUR']
  );
  return bookingId;
}

export async function addBookingSeats(client, bookingId, showtimeId, theatreId, seats) {
  for (const s of seats) {
    await client.query(
      'INSERT INTO booking_seats (booking_id, showtime_id, theatre_id, seat_id, price_eur) VALUES ($1,$2,$3,$4,$5)',
      [bookingId, showtimeId, theatreId, s.id, s.price]
    );
  }
}

export async function getTheatreNameCity(theatreId) {
  const { rows } = await pool.query('SELECT name, city FROM theatres WHERE id=$1', [theatreId]);
  return rows[0] || null;
}
