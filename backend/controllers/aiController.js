const Groq = require("groq-sdk");
const Show = require("../models/showModel");
const Movie = require("../models/movieModel");
const Booking = require("../models/bookingModel");
const { parseFilters, escapeRegex } = require("../utils/searchFilters");

// Stop waiting after 5 seconds, and try again only once
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: 5000,
    maxRetries: 1,
});

// Plan B when the AI cannot help: match the user's words against movie titles and genres
const keywordSearch = async (query) => {
    const words = query.split(" ").filter((word) => word.length >= 3).map(escapeRegex);
    if (words.length === 0) return [];

    const pattern = new RegExp(words.join("|"), "i");
    const movies = await Movie.find({ $or: [{ title: pattern }, { genre: pattern }] }, "_id");

    return Show.find({ isActive: true, movie: { $in: movies.map((m) => m._id) } })
        .populate("movie", "title genre language rating poster")
        .populate("theatre", "name address");
};

const searchShows = async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required",
            });
        }

        if (query.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Search query must be 200 characters or fewer",
            });
        }

        // Step 1: Get all available movies for context
        const availableMovies = await Movie.find({}, "title genre language");

        let filters = null;
        const startedAt = Date.now();
        try {
            // Step 2: Send to Groq for filter extraction
            const today = new Date().toISOString().split("T")[0];

            const chatResponse = await groq.chat.completions.create({
                model: process.env.GROQ_MODEL,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: `You are a search filter extraction assistant for a movie booking platform.
Given a natural language search query, extract structured filters as JSON.

Available movies in the database:
${JSON.stringify(availableMovies)}

Today's date is: ${today}

Return ONLY a valid JSON object with these possible fields (include only fields that are relevant to the query):
- genre: one of "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Documentary"
- language: the language mentioned
- movieTitle: if a specific movie is mentioned, the closest matching title from the available movies
- dateFrom: start date in YYYY-MM-DD format
- dateTo: end date in YYYY-MM-DD format
- timeFrom: earliest show time in HH:mm format (use 24-hour)
- timeTo: latest show time in HH:mm format (use 24-hour)

Examples:
Query: "action movies this weekend" -> {"genre": "Action", "dateFrom": "2025-02-15", "dateTo": "2025-02-16"}
Query: "shows after 6pm" -> {"timeFrom": "18:00"}
Query: "Inception shows" -> {"movieTitle": "Inception"}

Return ONLY the JSON object. No explanation. No markdown. No code blocks.`,
                    },
                    {
                        role: "user",
                        content: query,
                    },
                ],
                temperature: 0.1,
            });
            // console.log("AI replied:", chatResponse.choices[0].message.content);

            // Step 3: Keep only the filters that pass the schema
            filters = parseFilters(chatResponse.choices[0].message.content);
        } catch (err) {
            console.log(`AI search failed after ${Date.now() - startedAt} ms: ${err.message}`);
        }

        if (!filters) {
            return res.status(200).json({
                success: true,
                mode: "keyword",
                message: `AI search could not help with this one. Showing title and genre matches for "${query}".`,
                data: await keywordSearch(query),
            });
        }

        // Step 4: Build MongoDB query from extracted filters
        let mongoQuery = { isActive: true };
        let movieFilter = {};

        if (filters.genre) {
            movieFilter.genre = filters.genre;
        }

        if (filters.language) {
            movieFilter.language = filters.language;
        }

        if (filters.movieTitle) {
            movieFilter.title = { $regex: escapeRegex(filters.movieTitle), $options: "i" };
        }

        // If we have movie filters, find matching movie IDs first
        if (Object.keys(movieFilter).length > 0) {
            const matchingMovies = await Movie.find(movieFilter, "_id");
            const movieIds = matchingMovies.map((m) => m._id);
            mongoQuery.movie = { $in: movieIds };
        }

        if (filters.dateFrom || filters.dateTo) {
            mongoQuery.date = {};
            if (filters.dateFrom) mongoQuery.date.$gte = new Date(filters.dateFrom);
            if (filters.dateTo) mongoQuery.date.$lte = new Date(filters.dateTo);
        }

        // Step 5: Query shows with filters
        const shows = await Show.find(mongoQuery)
            .populate("movie", "title genre language rating poster")
            .populate("theatre", "name address");

        // Optional: filter by time in-memory (since time is stored as string)
        let filteredShows = shows;
        if (filters.timeFrom) {
            filteredShows = filteredShows.filter((s) => s.time >= filters.timeFrom);
        }
        if (filters.timeTo) {
            filteredShows = filteredShows.filter((s) => s.time <= filters.timeTo);
        }

        res.status(200).json({
            success: true,
            mode: "ai",
            message: "Shows fetched successfully",
            filters: filters,
            data: filteredShows,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong with the search",
            error: err.message,
        });
    }
};


const getRecommendations = async (req, res) => {
    try {
        // Step 1: Get user's booking history
        const bookings = await Booking.find({
            user: req.user.userId,
            status: { $ne: "cancelled" },
        }).populate({
            path: "show",
            populate: {
                path: "movie",
                select: "title genre language",
            },
        });

        // Step 2: Extract watched movies and preferences
        const watchedMovies = [];
        const genres = {};
        const languages = {};

        bookings.forEach((booking) => {
            if (booking.show && booking.show.movie) {
                const movie = booking.show.movie;
                watchedMovies.push(movie.title);

                genres[movie.genre] = (genres[movie.genre] || 0) + 1;
                languages[movie.language] = (languages[movie.language] || 0) + 1;
            }
        });

        // Step 3: Get all available movies
        const availableMovies = await Movie.find({}, "title genre language rating");

        // Step 4: Build the AI prompt
        const userProfile = {
            watchedMovies,
            favoriteGenres: Object.entries(genres)
                .sort((a, b) => b[1] - a[1])
                .map((entry) => entry[0]),
            preferredLanguages: Object.keys(languages),
        };
        if (watchedMovies.length === 0) {
            // Cold start: recommend highest-rated movies
            const topMovies = await Movie.find()
                .sort({ rating: -1 })
                .limit(5)
                .select("title genre language rating");

            return res.status(200).json({
                success: true,
                message: "Here are our top-rated movies to get you started",
                data: {
                    userProfile: { watchedMovies: [], favoriteGenres: [], preferredLanguages: [] },
                    recommendations: topMovies.map((m) => ({
                        title: m.title,
                        reason: "Top rated on VYBE with a rating of " + m.rating,
                    })),
                },
            });
        }

        const chatResponse = await groq.chat.completions.create({
            model: process.env.GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are a movie recommendation assistant for VYBE, a movie booking platform.

Given a user's watching history and preferences, recommend movies from the available catalog.

User profile:
- Movies watched: ${JSON.stringify(userProfile.watchedMovies)}
- Favorite genres (most watched first): ${JSON.stringify(userProfile.favoriteGenres)}
- Preferred languages: ${JSON.stringify(userProfile.preferredLanguages)}

Available movies in the catalog:
${JSON.stringify(availableMovies)}

Return a JSON array of recommended movie titles from the available catalog, ordered by relevance. 
Include a brief reason for each recommendation.
Format: [{"title": "Movie Name", "reason": "Because you enjoyed..."}]
Do NOT recommend movies the user has already watched.
Return ONLY the JSON array. No explanation. No markdown.`,
                },
                {
                    role: "user",
                    content: "What should I watch next?",
                },
            ],
            temperature: 0.3,
        });

        // Step 5: Parse AI response
        const aiText = chatResponse.choices[0].message.content.trim();
        let recommendations;

        try {
            recommendations = JSON.parse(aiText);
        } catch (parseErr) {
            recommendations = [
                {
                    title: "Could not generate recommendations",
                    reason: "Try again or browse our catalog",
                },
            ];
        }

        res.status(200).json({
            success: true,
            message: "Recommendations generated successfully",
            data: {
                userProfile,
                recommendations,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong with recommendations",
        });
    }
};

module.exports = { searchShows, getRecommendations };