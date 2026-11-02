const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel")

const createTheatre = async (req, res) => {
    try {
        const { name, address, phone, email } = req.body;

        if (!name || !address || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: "Name, address, phone, and email are required",
            });
        }

        const theatre = await Theatre.create({
            name,
            address,
            phone,
            email,
            owner: req.user.userId,
        });

        res.status(201).json({
            success: true,
            message: "Theatre created successfully. Pending admin approval.",
            data: theatre,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

const getAllTheatres = async (req, res) => {
    try {
        const theatres = await Theatre.find({ isActive: true })
            .populate("owner", "name email");

        res.status(200).json({
            success: true,
            message: "Theatres fetched successfully",
            data: theatres,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const getTheatreById = async (req, res) => {
    try {
        const theatre = await Theatre.findById(req.params.id);

        if (!theatre) {
            return res.status(404).json({
                success: false,
                message: "Theatre not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Theatre fetched successfully",
            data: theatre,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const getTheatresByOwner = async (req, res) => {
    try {
        const filter = { owner: req.user.userId };

        if (req.query.status === "pending") {
            filter.isActive = false;
        } else if (req.query.status === "active") {
            filter.isActive = true;
        }

        const theatres = await Theatre.find(filter);

        res.status(200).json({
            success: true,
            message: "Theatres fetched successfully",
            data: theatres,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const updateTheatre = async (req, res) => {
    try {
        const theatre = await Theatre.findById(req.params.id);

        if (!theatre) {
            return res.status(404).json({
                success: false,
                message: "Theatre not found",
            });
        }

        if (theatre.owner.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own theatres",
            });
        }

        const updatedTheatre = await Theatre.findByIdAndUpdate(
            req.params.id,
            { ...req.body, isActive: false },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Theatre updated successfully. Pending re-approval.",
            data: updatedTheatre,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
};

const deleteTheatre = async (req, res) => {
    try {
        const theatre = await Theatre.findById(req.params.id);

        if (!theatre) {
            return res.status(404).json({
                success: false,
                message: "Theatre not found",
            });
        }

        if (theatre.owner.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own theatres",
            });
        }

        // Check for existing shows
        const showCount = await Show.countDocuments({ theatre: theatre._id });

        if (showCount > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete theatre with existing shows. Remove all shows first.",
            });
        }

        await Theatre.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Theatre deleted successfully",
            data: theatre,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
const getAllTheatresAdmin = async (req, res) => {
    try {
        const filter = {};

        if (req.query.status === "pending") {
            filter.isActive = false;
        } else if (req.query.status === "active") {
            filter.isActive = true;
        }
        // If no status query param, filter is empty = return all

        const theatres = await Theatre.find(filter)
            .populate("owner", "name email");

        res.status(200).json({
            success: true,
            message: "Theatres fetched successfully",
            data: theatres,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
const approveTheatre = async (req, res) => {
    try {
        const theatre = await Theatre.findById(req.params.id);

        if (!theatre) {
            return res.status(404).json({
                success: false,
                message: "Theatre not found",
            });
        }

        if (theatre.isActive) {
            return res.status(400).json({
                success: false,
                message: "Theatre is already approved",
            });
        }

        theatre.isActive = true;
        await theatre.save();

        res.status(200).json({
            success: true,
            message: "Theatre approved successfully",
            data: theatre,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

const rejectTheatre = async (req, res) => {
    try {
        const theatre = await Theatre.findById(req.params.id);

        if (!theatre) {
            return res.status(404).json({
                success: false,
                message: "Theatre not found",
            });
        }

        if (!theatre.isActive) {
            return res.status(400).json({
                success: false,
                message: "Theatre is already inactive",
            });
        }

        theatre.isActive = false;
        await theatre.save();

        // Deactivate all shows at this theatre
        await Show.updateMany(
            { theatre: theatre._id },
            { isActive: false }
        );

        res.status(200).json({
            success: true,
            message: "Theatre rejected. All associated shows have been deactivated.",
            data: theatre,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = {
    createTheatre,
    getAllTheatres,
    getTheatreById,
    getTheatresByOwner,
    updateTheatre,
    deleteTheatre,
    getAllTheatresAdmin,
    approveTheatre,
    rejectTheatre,
};