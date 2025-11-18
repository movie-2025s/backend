import axios from 'axios';

class TMDBService {
  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || 'd88a1a232de1cf854775d0306a306741';
    this.baseURL = 'https://api.themoviedb.org/3';
  }

  async fetchPopularMovies() {
    try {
      const response = await axios.get(
        `${this.baseURL}/movie/popular?api_key=${this.apiKey}`
      );
      return response.data.results;
    } catch (error) {
      console.error('TMDB API Error:', error.message);
      throw new Error('Failed to fetch movies from TMDB');
    }
  }

  async searchMovies(query) {
    try {
      const response = await axios.get(
        `${this.baseURL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`
      );
      return response.data.results;
    } catch (error) {
      console.error('TMDB Search Error:', error.message);
      throw new Error('Failed to search movies');
    }
  }

  async getMovieDetails(movieId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/movie/${movieId}?api_key=${this.apiKey}`
      );
      return response.data;
    } catch (error) {
      console.error('TMDB Details Error:', error.message);
      throw new Error('Failed to fetch movie details');
    }
  }
}

export default new TMDBService();