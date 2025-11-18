import express from 'express';
import { getAllMovies, getMovieById } from '../models/movie.js';
import TMDBService from '../services/tmdbService.js';

const router = express.Router();

// GET all movies (Public)
router.get('/', async (req, res) => {
  try {
    const movies = await getAllMovies();
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ message: 'Error fetching movies' });
  }
});

// GET popular movies from TMDB (Public)
router.get('/tmdb/popular', async (req, res) => {
  try {
    const movies = await TMDBService.fetchPopularMovies();
    res.json(movies);
  } catch (error) {
    console.error('Error fetching TMDB movies:', error);
    res.status(500).json({ message: 'Error fetching popular movies from TMDB' });
  }
});

// GET search movies from TMDB (Public)
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const movies = await TMDBService.searchMovies(query);
    res.json(movies);
  } catch (error) {
    console.error('Error searching movies:', error);
    res.status(500).json({ message: 'Error searching movies' });
  }
});

// GET movie by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const movie = await getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ message: 'Error fetching movie' });
  }
});

export default router;