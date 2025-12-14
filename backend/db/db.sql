-- Base users table (kept as-is)
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Theatres in Finland
CREATE TABLE IF NOT EXISTS theatres (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  timezone TEXT DEFAULT 'Europe/Helsinki'
);

-- Seat map per theatre
CREATE TABLE IF NOT EXISTS seats (
  theatre_id TEXT REFERENCES theatres(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_type TEXT NOT NULL,
  PRIMARY KEY (theatre_id, seat_id)
);

-- Showtimes for TMDB movies
CREATE TABLE IF NOT EXISTS showtimes (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL,
  theatre_id TEXT REFERENCES theatres(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  base_price_eur NUMERIC(6,2) NOT NULL
);

-- Bookings and booked seats
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  showtime_id TEXT REFERENCES showtimes(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount NUMERIC(8,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  showtime_id TEXT REFERENCES showtimes(id) ON DELETE CASCADE,
  theatre_id TEXT REFERENCES theatres(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  price_eur NUMERIC(6,2) NOT NULL,
  PRIMARY KEY (booking_id, seat_id)
);


