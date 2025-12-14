import { Router } from 'express';
import pool from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// List theatres
router.get('/admin/theatres', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, city, address FROM theatres ORDER BY city, name');
    res.json(rows);
  } catch (e) {
    console.error('Admin theatres list error', e);
    res.status(500).json({ message: 'Failed to load theatres' });
  }
});

// List bookings with joined info
router.get('/admin/bookings', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.id AS booking_id,
             b.customer_name, b.customer_email, b.customer_phone,
             b.total_amount, b.currency, b.created_at,
             s.id AS showtime_id, s.movie_id, s.start_time, s.base_price_eur,
             t.id AS theatre_id, t.name AS theatre_name, t.city AS theatre_city,
             json_agg(json_build_object('seat_id', bs.seat_id, 'price_eur', bs.price_eur) ORDER BY bs.seat_id) AS seats
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      JOIN theatres t ON t.id = s.theatre_id
      LEFT JOIN booking_seats bs ON bs.booking_id = b.id
      GROUP BY b.id, s.id, t.id
      ORDER BY b.created_at DESC
      LIMIT 200
    `);
    res.json(rows.map(r => ({
      bookingId: r.booking_id,
      customer: { name: r.customer_name, email: r.customer_email, phone: r.customer_phone },
      totalAmount: Number(r.total_amount), currency: r.currency, createdAt: r.created_at,
      showtime: { id: r.showtime_id, movieId: r.movie_id, startISO: new Date(r.start_time).toISOString(), basePriceEUR: Number(r.base_price_eur) },
      theatre: { id: r.theatre_id, name: r.theatre_name, location: `${r.theatre_city}, Finland` },
      seats: r.seats || []
    })));
  } catch (e) {
    console.error('Admin bookings error', e);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// Modify booking status or customer info
router.put('/admin/bookings/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const { customer_name, customer_email, customer_phone } = req.body || {};
    const { rowCount } = await pool.query(
      'UPDATE bookings SET customer_name=$1, customer_email=$2, customer_phone=$3 WHERE id=$4',
      [customer_name || null, customer_email || null, customer_phone || null, id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking updated' });
  } catch (e) {
    console.error('Admin booking update error', e);
    res.status(500).json({ message: 'Failed to update booking' });
  }
});

// Update theatre details
router.put('/admin/theatres/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, city, address } = req.body || {};
    const { rowCount } = await pool.query(
      'UPDATE theatres SET name=COALESCE($1,name), city=COALESCE($2,city), address=COALESCE($3,address) WHERE id=$4',
      [name, city, address, id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Theatre not found' });
    res.json({ message: 'Theatre updated' });
  } catch (e) {
    console.error('Admin theatre update error', e);
    res.status(500).json({ message: 'Failed to update theatre' });
  }
});

// Update showtime (start_time, base_price_eur)
router.put('/admin/showtimes/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const { start_time, base_price_eur, theatre_id } = req.body || {};
    const { rowCount } = await pool.query(
      'UPDATE showtimes SET start_time=COALESCE($1,start_time), base_price_eur=COALESCE($2,base_price_eur), theatre_id=COALESCE($3,theatre_id) WHERE id=$4',
      [start_time, base_price_eur, theatre_id, id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Showtime not found' });
    res.json({ message: 'Showtime updated' });
  } catch (e) {
    console.error('Admin showtime update error', e);
    res.status(500).json({ message: 'Failed to update showtime' });
  }
});

// Update seat info (type) for a theatre seat
router.put('/admin/theatres/:theatreId/seats/:seatId', authenticate, async (req, res) => {
  try {
    const { theatreId, seatId } = req.params;
    const { seat_type } = req.body || {};
    if (!seat_type || !['regular','premium'].includes(seat_type)) {
      return res.status(400).json({ message: 'seat_type must be regular or premium' });
    }
    const { rowCount } = await pool.query(
      'UPDATE seats SET seat_type=$1 WHERE theatre_id=$2 AND seat_id=$3',
      [seat_type, theatreId, seatId]
    );
    if (!rowCount) return res.status(404).json({ message: 'Seat not found' });
    res.json({ message: 'Seat updated' });
  } catch (e) {
    console.error('Admin seat update error', e);
    res.status(500).json({ message: 'Failed to update seat' });
  }
});

// Change a single booking's showtime by date/time (ISO) for a specific user/booking
// Does not modify other bookings or global showtime data except creating a new showtime if needed.
router.put('/admin/bookings/:id/showtime', authenticate, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { date_time_iso, customer_email, customer_name } = req.body || {};
    if (!date_time_iso) {
      return res.status(400).json({ message: 'date_time_iso is required (ISO string)' });
    }

    // Verify booking and optionally match user identity
    const bookingRes = await pool.query(
      `SELECT b.id, b.customer_email, b.customer_name, b.showtime_id,
              s.movie_id, s.theatre_id
       FROM bookings b
       JOIN showtimes s ON s.id = b.showtime_id
       WHERE b.id = $1`,
      [bookingId]
    );
    if (!bookingRes.rowCount) return res.status(404).json({ message: 'Booking not found' });
    const b = bookingRes.rows[0];
    if (customer_email && customer_email !== b.customer_email) {
      return res.status(400).json({ message: 'Customer email does not match booking' });
    }
    if (customer_name && customer_name !== b.customer_name) {
      return res.status(400).json({ message: 'Customer name does not match booking' });
    }

    // Ensure a showtime exists for same movie/theatre at requested time
    const targetStart = new Date(date_time_iso);
    if (isNaN(targetStart.getTime())) {
      return res.status(400).json({ message: 'Invalid date_time_iso' });
    }
    const targetISO = targetStart.toISOString();

    const existing = await pool.query(
      'SELECT id FROM showtimes WHERE theatre_id=$1 AND movie_id=$2 AND start_time=$3',
      [b.theatre_id, b.movie_id, targetISO]
    );
    let targetShowtimeId;
    if (existing.rowCount) {
      targetShowtimeId = existing.rows[0].id;
    } else {
      // Create a new showtime with same base price as current one
      const currentPriceRes = await pool.query('SELECT base_price_eur FROM showtimes WHERE id=$1', [b.showtime_id]);
      const basePrice = currentPriceRes.rows[0]?.base_price_eur ?? 13.9;
      const newId = `ST-${Math.random().toString(36).slice(2,10).toUpperCase()}`;
      const created = await pool.query(
        'INSERT INTO showtimes (id, theatre_id, movie_id, start_time, base_price_eur) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [newId, b.theatre_id, b.movie_id, targetISO, basePrice]
      );
      targetShowtimeId = created.rows[0].id;
    }

    // Update only this booking to point to the target showtime
    await pool.query('UPDATE bookings SET showtime_id=$1 WHERE id=$2', [targetShowtimeId, bookingId]);

    res.json({ message: 'Booking showtime updated', showtime_id: targetShowtimeId, start_time: targetISO });
  } catch (e) {
    console.error('Admin booking showtime change error', e);
    res.status(500).json({ message: 'Failed to change booking showtime' });
  }
});

export default router;