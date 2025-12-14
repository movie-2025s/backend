import { Router } from 'express';
import pool from '../db/index.js';
import { BASE_PRICE_EUR, PREMIUM_ADD_EUR } from '../db/setup.js';
import { getAllTheatres, countSeats } from '../models/theatre.js';
import { getSeatsForTheatre } from '../models/seat.js';
import {
  ensureShowtimesForMovie as ensureShowtimesForMovieModel,
  getShowtimesForMovieAtTheatre,
  getShowtimesForMovieAtTheatreOnDate,
  getShowtimeWithTheatre,
  countBookedSeats,
  getOccupiedSeatIds,
} from '../models/showtime.js';
import { createBooking, addBookingSeats, getTheatreNameCity } from '../models/booking.js';

const router = Router();

function formatTimeHHmm(dateIso) {
  try {
    return new Intl.DateTimeFormat('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Helsinki' }).format(new Date(dateIso));
  } catch {
    const d = new Date(dateIso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

async function ensureShowtimesForMovie(movieId) {
  await ensureShowtimesForMovieModel(movieId, BASE_PRICE_EUR);
}

// GET theatres and showtimes for movie
router.get('/booking/options', async (req, res) => {
  try {
    const movieId = req.query.movieId;
    const dateYMD = req.query.date; // optional YYYY-MM-DD
    if (!movieId) return res.status(400).json({ message: 'movieId is required' });
    await ensureShowtimesForMovie(movieId);

    const ths = await getAllTheatres();
    const response = [];
    for (const th of ths) {
      const sts = dateYMD
        ? await getShowtimesForMovieAtTheatreOnDate(String(movieId), th.id, dateYMD)
        : await getShowtimesForMovieAtTheatre(String(movieId), th.id);
      const totalSeats = await countSeats(th.id);
      const mapped = [];
      for (const s of sts) {
        const booked = await countBookedSeats(s.id);
        mapped.push({
          id: s.id,
          time: formatTimeHHmm(s.start_time),
          price: Number(s.base_price_eur),
          currency: 'EUR',
          available: booked < totalSeats
        });
      }
      response.push({ id: th.id, name: th.name, location: `${th.city}, Finland`, showtimes: mapped });
    }
    res.json(response);
  } catch (e) {
    console.error('options error', e);
    res.status(500).json({ message: 'Failed to load booking options' });
  }
});

// GET showtime details with seat layout
router.get('/showtimes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const s = await getShowtimeWithTheatre(id);
    if (!s) return res.status(404).json({ message: 'Showtime not found' });
    const seatRows = await getSeatsForTheatre(s.theatre_id);
    const occupiedIds = await getOccupiedSeatIds(id, seatRows.map(r => r.seat_id));
    const occ = new Set(occupiedIds);

    const layoutMap = new Map();
    for (const seat of seatRows) {
      const arr = layoutMap.get(seat.row_label) || [];
      arr.push({
        id: seat.seat_id,
        row: seat.row_label,
        number: seat.seat_number,
        type: seat.seat_type,
        priceEUR: Number(seat.seat_type === 'premium' ? Number(s.base_price_eur) + PREMIUM_ADD_EUR : Number(s.base_price_eur)),
        occupied: occ.has(seat.seat_id),
        selected: false
      });
      layoutMap.set(seat.row_label, arr);
    }
    const seats = Array.from(layoutMap.keys()).sort().map(k => layoutMap.get(k));
    res.json({
      id: s.id,
      movieId: s.movie_id,
      theatre: { id: s.theatre_id, name: s.theatre_name, location: `${s.city}, Finland` },
      startISO: new Date(s.start_time).toISOString(),
      basePrice: Number(s.base_price_eur),
      currency: 'EUR',
      seats
    });
  } catch (e) {
    console.error('showtime error', e);
    res.status(500).json({ message: 'Failed to load showtime' });
  }
});

// POST create booking
router.post('/bookings', async (req, res) => {
  const client = await pool.connect();
  try {
    const { showtimeId, seatIds, customer, movie } = req.body || {};
    if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ message: 'showtimeId and seatIds are required' });
    }
    await client.query('BEGIN');
    const { rows: srows } = await client.query('SELECT id, theatre_id, base_price_eur, start_time, movie_id FROM showtimes WHERE id=$1 FOR UPDATE', [showtimeId]);
    if (!srows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Showtime not found' });
    }
    const s = srows[0];

    const { rows: validSeats } = await client.query(
      'SELECT seat_id, seat_type FROM seats WHERE theatre_id=$1 AND seat_id = ANY($2::text[])',
      [s.theatre_id, seatIds]
    );
    if (validSeats.length !== seatIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Some seats are invalid for this theatre' });
    }

    const conflictIds = await getOccupiedSeatIds(s.id, seatIds);
    if (conflictIds.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Some seats are no longer available', seats: conflictIds });
    }

    let total = 0;
    const priced = validSeats.map(v => {
      const isPremium = v.seat_type === 'premium';
      const price = Number(isPremium ? Number(s.base_price_eur) + PREMIUM_ADD_EUR : Number(s.base_price_eur));
      total += price;
      return { id: v.seat_id, type: v.seat_type, price };
    });
    const bookingId = await createBooking(client, s.id, customer, total);
    await addBookingSeats(client, bookingId, s.id, s.theatre_id, priced);
    await client.query('COMMIT');

    const th = await getTheatreNameCity(s.theatre_id);
    res.status(201).json({
      bookingId,
      movie: movie && typeof movie === 'object' ? movie : { id: s.movie_id },
      theatre: { id: s.theatre_id, name: th?.name, location: `${th?.city}, Finland` },
      showtime: { id: s.id, time: formatTimeHHmm(s.start_time), startISO: new Date(s.start_time).toISOString() },
      seats: priced.map(p => ({ id: p.id, type: p.type, price: p.price })),
      totalAmount: Number(total.toFixed(2)),
      currency: 'EUR',
      customerInfo: customer || {},
      bookingDate: new Date().toISOString()
    });
  } catch (e) {
    try { await pool.query('ROLLBACK'); } catch {}
    console.error('Booking error:', e);
    res.status(500).json({ message: 'Booking failed' });
  } finally {
    try { (await client).release(); } catch {}
  }
});
export default router;