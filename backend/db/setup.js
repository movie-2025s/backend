import pool from './index.js';

export async function ensureSchemaAndSeed() {
    // Create tables
    await pool.query(`
    CREATE TABLE IF NOT EXISTS theatres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT,
      timezone TEXT DEFAULT 'Europe/Helsinki'
    );

    CREATE TABLE IF NOT EXISTS seats (
      theatre_id TEXT REFERENCES theatres(id) ON DELETE CASCADE,
      seat_id TEXT NOT NULL,
      row_label TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      seat_type TEXT NOT NULL,
      PRIMARY KEY (theatre_id, seat_id)
    );

    CREATE TABLE IF NOT EXISTS showtimes (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL,
      theatre_id TEXT REFERENCES theatres(id) ON DELETE CASCADE,
      start_time TIMESTAMPTZ NOT NULL,
      base_price_eur NUMERIC(6,2) NOT NULL
    );

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
  `);

    // Seed theatres (Finnish locations)
    const theatres = [
        { id: 'hel-kinopalatsi', name: 'Finnkino Kinopalatsi', city: 'Helsinki', address: 'Kaisaniemenkatu 2' },
        { id: 'hel-tennispalatsi', name: 'Finnkino Tennispalatsi', city: 'Helsinki', address: 'Salomonkatu 15' },
        { id: 'espoo-sello', name: 'Finnkino Sello', city: 'Espoo', address: 'Leppävaarankatu 3-9' },
        { id: 'tre-plevna', name: 'Finnkino Plevna', city: 'Tampere', address: 'Itäinenkatu 4' }
    ];
    for (const t of theatres) {
        await pool.query(
            `INSERT INTO theatres (id, name, city, address) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, address = EXCLUDED.address`,
            [t.id, t.name, t.city, t.address]
        );
    }

    // Seed seats per theatre (rows A-G, 10 seats each; A-B premium)
    const { rows: theatreRows } = await pool.query('SELECT id FROM theatres');
    for (const { id: theatreId } of theatreRows) {
        const { rows: seatCountRows } = await pool.query('SELECT COUNT(*)::int AS c FROM seats WHERE theatre_id=$1', [theatreId]);
        if ((seatCountRows[0]?.c || 0) > 0) continue;
        const rows = 'A,B,C,D,E,F,G'.split(',');
        const inserts = [];
        for (const row of rows) {
            for (let i = 1; i <= 10; i++) {
                const seatId = `${row}${i}`;
                const type = (row === 'A' || row === 'B') ? 'premium' : 'regular';
                inserts.push(pool.query(
                    'INSERT INTO seats (theatre_id, seat_id, row_label, seat_number, seat_type) VALUES ($1,$2,$3,$4,$5)',
                    [theatreId, seatId, row, i, type]
                ));
            }
        }
        await Promise.all(inserts);
    }
}

export const PREMIUM_ADD_EUR = 2.5;
export const BASE_PRICE_EUR = 13.9;