import express from 'express';

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

// Health check
app.get('/api/health', (req, res) => {
  console.log('✅ Health check hit');
  res.json({ 
    message: 'Server is running!', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Movies route (test data - can be removed later)
app.get('/api/movies', (req, res) => {
  console.log('🎬 Movies route hit');
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
    console.log('🌟 TMDB Popular route hit');
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
    console.error('❌ TMDB Error:', error);
    res.status(500).json({ message: 'Error fetching from TMDB' });
  }
});

// ✅ MOVIE DETAILS BY ID - NEW ROUTE
app.get('/api/tmdb/movie/:id', async (req, res) => {
  try {
    const movieId = req.params.id;
    console.log('🎬 Fetching movie details for ID:', movieId);
    
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=d88a1a232de1cf854775d0306a306741`
    );
    
    if (!response.ok) {
      return res.status(404).json({ message: 'Movie not found on TMDB' });
    }
    
    const movieData = await response.json();
    console.log('✅ Movie details fetched successfully:', movieData.title);
    
    res.json(movieData);
  } catch (error) {
    console.error('❌ Movie details error:', error);
    res.status(500).json({ message: 'Error fetching movie details from TMDB' });
  }
});

// Search movies
app.get('/api/search/movies', async (req, res) => {
  try {
    const query = req.query.q || '';
    console.log('🔍 Search route hit:', query);
    
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
    console.error('❌ Search Error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🎬 MOVIE SERVER RUNNING!');
  console.log(`📍 Port: ${PORT}`);
  console.log('='.repeat(50));
  console.log('📋 Available Routes:');
  console.log('   ✅ http://localhost:4001/api/health');
  console.log('   🎥 http://localhost:4001/api/movies');
  console.log('   🌟 http://localhost:4001/api/tmdb/popular');
  console.log('   🎬 http://localhost:4001/api/tmdb/movie/:id');
  console.log('   🔍 http://localhost:4001/api/search/movies?q=query');
  console.log('='.repeat(50));
});