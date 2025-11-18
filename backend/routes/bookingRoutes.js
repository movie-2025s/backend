const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const Showtime = require('../models/showtime');
const Seat = require('../models/seat');

// Customer booking flow
router.post('/', async (req, res) => {
  try {
    const { showtime_id, seat_ids, user_email, user_phone } = req.body;

    // Validate showtime exists
    const showtime = await Showtime.findByPk(showtime_id, {
      include: ['movie', 'theatre']
    });

    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }

    // Check seat availability
    const seats = await Seat.findAll({
      where: { id: seat_ids, theatre_id: showtime.theatre_id }
    });

    if (seats.length !== seat_ids.length) {
      return res.status(400).json({ message: 'Some seats are invalid' });
    }

    // Create booking
    const booking = await Booking.create({
      showtime_id,
      user_email,
      user_phone,
      number_of_tickets: seat_ids.length,
      total_amount: seat_ids.length * 250, // Assuming fixed price
      status: 'confirmed'
    });

    // Associate seats with booking
    await booking.addSeats(seat_ids);

    res.status(201).json({
      message: 'Booking confirmed',
      booking_id: booking.id,
      total_amount: booking.total_amount
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});