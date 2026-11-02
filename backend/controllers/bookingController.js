const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");
const { emitSeatUpdate } = require("../socket");

const createBooking = async (req, res) => {
    try {
        const { showId, seats } = req.body;

        // Step 1: Validate input
        if (!showId || !seats) {
            return res.status(400).json({
                success: false,
                message: "Show ID and number of seats are required",
            });
        }

        if (seats < 1) {
            return res.status(400).json({
                success: false,
                message: "Must book at least 1 seat",
            });
        }

        // Step 2: Find the show
        const show = await Show.findById(showId);

        if (!show) {
            return res.status(404).json({
                success: false,
                message: "Show not found",
            });
        }

        // Step 3: Check if show is active
        if (!show.isActive) {
            return res.status(400).json({
                success: false,
                message: "This show is not currently available for booking",
            });
        }

        // Step 4: Atomic seat check and decrement
        const updatedShow = await Show.findOneAndUpdate(
            {
                _id: showId,
                availableSeats: { $gte: seats },
            },
            {
                $inc: { availableSeats: -seats },
            },
            { new: true }
        );

        if (!updatedShow) {
            return res.status(400).json({
                success: false,
                message: "Not enough seats available. Only " + show.availableSeats + " seats left.",
            });
        }

        // Tell everyone watching this show that seats just dropped
        emitSeatUpdate(updatedShow);

        // Step 5: Calculate total price
        const totalPrice = seats * show.ticketPrice;

        // Step 6: Create the booking
        const booking = await Booking.create({
            show: showId,
            user: req.user.userId,
            seats,
            totalPrice,
            status: "pending",
        });
        res.status(201).json({
            success: true,
            message: "Booking created successfully. Proceed to payment.",
            data: booking,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        // Only the user who made the booking can cancel it
        if (booking.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only cancel your own bookings",
            });
        }

        if (booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Booking is already cancelled",
            });
        }
        if (booking.stripePaymentIntentId) {
            const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
            const intent = await stripe.paymentIntents.retrieve(
                booking.stripePaymentIntentId
            );

            if (intent.status === "succeeded") {
                await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
            } else if (intent.status === "processing") {
                return res.status(400).json({ success: false, message: "Payment is still processing. Please try again shortly." });
            } else if (intent.status !== "canceled") {
                await stripe.paymentIntents.cancel(booking.stripePaymentIntentId);
            }
        }

        // Restore seats to the show
        const restoredShow = await Show.findByIdAndUpdate(
            booking.show,
            { $inc: { availableSeats: booking.seats } },
            { new: true }
        );
        emitSeatUpdate(restoredShow);

        // Update booking status
        booking.status = "cancelled";
        await booking.save();

        res.status(200).json({
            success: true,
            message: "Booking cancelled successfully. Seats have been restored.",
            data: booking,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
const getBookingsByUser = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.userId })
            .populate({
                path: "show",
                populate: [
                    { path: "movie", select: "title genre language poster" },
                    { path: "theatre", select: "name address" },
                ],
                select: "movie theatre date time ticketPrice",
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Bookings fetched successfully",
            data: bookings,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
const getTicket = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate({
                path: "show",
                populate: [
                    { path: "movie", select: "title genre language poster" },
                    { path: "theatre", select: "name address" },
                ],
            })
            .populate("user", "name email");
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        if (booking.user._id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own tickets",
            });
        }

        if (booking.status !== "confirmed") {
            return res.status(400).json({
                success: false,
                message: "Ticket is only available for confirmed bookings",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ticket generated",
            data: {
                bookingId: booking._id,
                movie: booking.show.movie.title,
                genre: booking.show.movie.genre,
                language: booking.show.movie.language,
                theatre: booking.show.theatre.name,
                address: booking.show.theatre.address,
                showDate: booking.show.date,
                showTime: booking.show.time,
                seats: booking.seats,
                totalPrice: booking.totalPrice,
                userName: booking.user.name,
                userEmail: booking.user.email,
                status: booking.status,
            },
        });
    } catch (error) {
        console.error("Error generating ticket:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate ticket",
        });
    }
};

module.exports = { createBooking, cancelBooking, getBookingsByUser, getTicket };
