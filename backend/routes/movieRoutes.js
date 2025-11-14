import express from "express";
import { getAllMovies, createMovie } from "../models/movie.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET all movies
router.get("/", async (req, res) => {
  try {
    const movies = await getAllMovies();
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching movies" });
  }
});
// GET search movies
router.get("/search",async (req,res)=>{
  try {
    const query=req.query.q || '';
    if(!query){
      return res.status(400).json({message:"Search query is required"});
    }
    const movies= await searchMovies(query);
    res.jeson(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({message:"Error searching movies"});
  }
});

// GET movies by genre
router.get("genre/:genre",async(req,res)=>{
  try{
    const movies = await getMoviesByGenre(req.params.genre);
    res.json(movies);
  }catch (error){
    console.error(error);
    res.status(500).json({message:"Error fetching movies by genre"});
  }
});

//GET movie by ID
router.get("/:id",async(req,res)=>{
  try{
    const movie = await getMovieById(req.params.id);
    if(!movie){
      return res.status(404).json({message: "Movie not found"});
    }
    res.json(movie);
  }catch (error){
    console.error(error);
    res.status(500).json({message:"Error fetching movie by ID"});
  }
});

// POST a new movie (protected)
router.post("/", authenticate, async (req, res) => {
  try {
    const saved = await createMovie(req.body);
    res.json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving movie" });
  }
});

export default router;
