const Movie = require("../models/movieModel");
const { getCache, setCache, clearCache } = require("../utils/cache");

// One key for the whole movie list
const MOVIES_KEY = "movies:all";

// Create a movie (Admin only)
const createMovie = async (req, res) => {
    try {
        const { title, description, genre, language, releaseDate, rating, poster } = req.body;

        if (!title || !description || !genre || !releaseDate) {
            return res.status(400).json({
                success: false,
                message: "Title, description, genre, and release date are required",
            });
        }

        const movie = await Movie.create({
            title,
            description,
            genre,
            language,
            releaseDate,
            rating,
            poster,
        });

        await clearCache(MOVIES_KEY);
        res.status(201).json({
            success: true,
            message: "Movie created successfully",
            data: movie,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

// Get all movies (Public)
const getAllMovies = async (req, res) => {
    try {
        // 1. Look in Redis first
        const cached = await getCache(MOVIES_KEY);
        if (cached) {
            res.set("X-Cache", "HIT");
            return res.status(200).json({
                success: true,
                message: "Movies fetched successfully",
                data: cached,
            });
        }

        // 2. Not there: ask MongoDB, then keep a copy for 5 minutes
        const movies = await Movie.find();
        await setCache(MOVIES_KEY, movies, 300);
        res.set("X-Cache", "MISS");
        res.status(200).json({
            success: true,
            message: "Movies fetched successfully",
            data: movies,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

// Get a single movie by ID (Public)
const getMovieById = async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Movie fetched successfully",
            data: movie,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

// Update a movie (Admin only)
const updateMovie = async (req, res) => {
    try {
        const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found",
            });
        }

        await clearCache(MOVIES_KEY);
        res.status(200).json({
            success: true,
            message: "Movie updated successfully",
            data: movie,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

// Delete a movie (Admin only)
const deleteMovie = async (req, res) => {
    try {
        const movie = await Movie.findByIdAndDelete(req.params.id);

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found",
            });
        }

        await clearCache(MOVIES_KEY);
        res.status(200).json({
            success: true,
            message: "Movie deleted successfully",
            data: movie,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = {
    createMovie,
    getAllMovies,
    getMovieById,
    updateMovie,
    deleteMovie,
};