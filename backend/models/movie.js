import pool from '../db/config.js';

// Get all movies from local database
export const getAllMovies = async () => {
  try {
    const result = await pool.query(
      "SELECT * FROM movies WHERE status = 'active' ORDER BY created_at DESC"
    );
    return result.rows;
  } catch (error) {
    console.error('Database error in getAllMovies:', error);
    throw error;
  }
};

// Get movie by ID
export const getMovieById = async (id) => {
  try {
    const result = await pool.query("SELECT * FROM movies WHERE id = $1", [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in getMovieById:', error);
    throw error;
  }
};

// Search movies in local database
export const searchMovies = async (query) => {
  try {
    const result = await pool.query(
      "SELECT * FROM movies WHERE title ILIKE $1 AND status = 'active' ORDER BY title",
      [`%${query}%`]
    );
    return result.rows;
  } catch (error) {
    console.error('Database error in searchMovies:', error);
    throw error;
  }
};

// Get movies by genre
export const getMoviesByGenre = async (genre) => {
  try {
    const result = await pool.query(
      "SELECT * FROM movies WHERE genre ILIKE $1 AND status = 'active' ORDER BY title",
      [`%${genre}%`]
    );
    return result.rows;
  } catch (error) {
    console.error('Database error in getMoviesByGenre:', error);
    throw error;
  }
};