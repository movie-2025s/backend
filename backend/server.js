import express from 'express';
import { ensureSchemaAndSeed } from './db/setup.js';
import bookingRoutes from './routes/bookingRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const PORT = 4001;

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});
app.use(express.json());

// Mount modular routers
app.use('/api', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes);


// Movies route 
app.get('/api/movies', (req, res) => {
  const movies = [
    {
      id: 1,
      title: "The Avengers",
      genre: "Action, Adventure",
      rating: "8.0",
      poster_url: "https://via.placeholder.com/300x450/333/666?text=Avengers",
      language: "en",
      duration: 143
    }
  ];

  res.json(movies);
});

// TMDB popular movies
app.get('/api/tmdb/popular', async (req, res) => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=d88a1a232de1cf854775d0306a306741`);
    const data = await response.json();

    // Add full poster URLs to each movie
    const moviesWithPosters = data.results.map(movie => ({
      ...movie,
      poster_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/300x450/1a1a1a/666666?text=No+Poster',
      poster_full_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null
    }));

    res.json(moviesWithPosters);
  } catch (error) {
    console.error(' TMDB Error:', error);
    res.status(500).json({ message: 'Error fetching from TMDB' });
  }
});

// MOVIE DETAILS BY ID - NEW ROUTE
app.get('/api/tmdb/movie/:id', async (req, res) => {
  try {
    const movieId = req.params.id;

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=d88a1a232de1cf854775d0306a306741`
    );

    if (!response.ok) {
      return res.status(404).json({ message: 'Movie not found on TMDB' });
    }
    const movieData = await response.json();

    res.json(movieData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching movie details from TMDB' });
  }
});

// Search movies
app.get('/api/search/movies', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=d88a1a232de1cf854775d0306a306741&query=${encodeURIComponent(query)}`);
    const data = await response.json();

    // Add full poster URLs to each movie
    const moviesWithPosters = data.results.map(movie => ({
      ...movie,
      poster_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/300x450/1a1a1a/666666?text=No+Poster',
      poster_full_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null
    }));

    res.json(moviesWithPosters);
  } catch (error) {
    res.status(500).json({ message: 'Search failed' });
  }
});

async function start() {
  
  await ensureSchemaAndSeed();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
start();
