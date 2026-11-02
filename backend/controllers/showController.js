const Show = require("../models/showModel");
const Theatre = require("../models/theatreModel");

const createShow = async (req, res) => {
    try {
        const { movie, theatre, date, time, totalSeats, ticketPrice } = req.body;

        if (!movie || !theatre || !date || !time || !totalSeats || !ticketPrice) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: movie, theatre, date, time, totalSeats, ticketPrice",
            });
        }

        // Verify theatre ownership
        const theatreDoc = await Theatre.findById(theatre);

        if (!theatreDoc) {
            return res.status(404).json({
                success: false,
                message: "Theatre not found",
            });
        }

        if (theatreDoc.owner.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only add shows to your own theatres",
            });
        }

        const show = await Show.create({
            movie,
            theatre,
            date,
            time,
            totalSeats,
            availableSeats: totalSeats,
            ticketPrice,
        });

        res.status(201).json({
            success: true,
            message: "Show created successfully. Pending admin approval.",
            data: show,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

const getAllShows = async (req, res) => {
    try {
        const shows = await Show.find({ isActive: true })
            .populate("movie")
            .populate("theatre");

        res.status(200).json({
            success: true,
            message: "Shows fetched successfully",
            data: shows,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const getShowById = async (req, res) => {
    try {
        const show = await Show.findById(req.params.id)
            .populate("movie", "title genre language rating poster")
            .populate("theatre", "name address");

        if (!show) {
            return res.status(404).json({
                success: false,
                message: "Show not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Show fetched successfully",
            data: show,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const getShowsByTheatre = async (req, res) => {
    try {
        const shows = await Show.find({
            theatre: req.params.theatreId,
            isActive: true,
        })
            .populate("movie", "title genre language rating poster")
            .populate("theatre", "name address");

        res.status(200).json({
            success: true,
            message: "Shows fetched successfully",
            data: shows,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const getShowsByMovie = async (req, res) => {
    try {
        const shows = await Show.find({
            movie: req.params.movieId,
            isActive: true,
        })
            .populate("movie", "title genre language rating poster")
            .populate("theatre", "name address");

        res.status(200).json({
            success: true,
            message: "Shows fetched successfully",
            data: shows,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const updateShow = async (req, res) => {
    try {
        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({
                success: false,
                message: "Show not found",
            });
        }

        const theatre = await Theatre.findById(show.theatre);

        if (!theatre || theatre.owner.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only update shows for your own theatres",
            });
        }

        const updatedShow = await Show.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Show updated successfully",
            data: updatedShow,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

const deleteShow = async (req, res) => {
    try {
        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({
                success: false,
                message: "Show not found",
            });
        }

        const theatre = await Theatre.findById(show.theatre);

        if (!theatre || theatre.owner.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only delete shows for your own theatres",
            });
        }

        await Show.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Show deleted successfully",
            data: show,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
const getAllShowsAdmin = async (req, res) => {
    try {
        const filter = {};

        if (req.query.status === "pending") {
            filter.isActive = false;
        } else if (req.query.status === "active") {
            filter.isActive = true;
        }

        const shows = await Show.find(filter)
            .populate("movie", "title genre language")
            .populate("theatre", "name address");

        res.status(200).json({
            success: true,
            message: "Shows fetched successfully",
            data: shows,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const approveShow = async (req, res) => {
    try {
        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({
                success: false,
                message: "Show not found",
            });
        }

        if (show.isActive) {
            return res.status(400).json({
                success: false,
                message: "Show is already approved",
            });
        }

        show.isActive = true;
        await show.save();

        res.status(200).json({
            success: true,
            message: "Show approved successfully",
            data: show,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const rejectShow = async (req, res) => {
    try {
        const show = await Show.findById(req.params.id);

        if (!show) {
            return res.status(404).json({
                success: false,
                message: "Show not found",
            });
        }

        if (!show.isActive) {
            return res.status(400).json({
                success: false,
                message: "Show is already inactive",
            });
        }

        show.isActive = false;
        await show.save();

        res.status(200).json({
            success: true,
            message: "Show rejected successfully",
            data: show,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
const getShowsByOwner = async (req, res) => {
    try {
        // Step 1: Find all theatres owned by this partner
        const theatres = await Theatre.find({ owner: req.user.userId });
        const theatreIds = theatres.map((t) => t._id);

        // Step 2: Find all shows at these theatres
        const filter = { theatre: { $in: theatreIds } };

        if (req.query.status === "pending") {
            filter.isActive = false;
        } else if (req.query.status === "active") {
            filter.isActive = true;
        }

        const shows = await Show.find(filter)
            .populate("movie", "title genre language")
            .populate("theatre", "name address");

        res.status(200).json({
            success: true,
            message: "Shows fetched successfully",
            data: shows,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = {
    getShowsByOwner,
    rejectShow,
    approveShow,
    getAllShowsAdmin,
    createShow,
    getAllShows,
    getShowById,
    getShowsByTheatre,
    getShowsByMovie,
    updateShow,
    deleteShow,
};