const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");
const { emitSeatUpdate } = require("../socket");
const AppError = require("../utils/appError")
const asyncHandler = require("../utils/asyncHandler");

const createBooking = asyncHandler(async (req, res) => {
    // ...everything inside stays as it is for now...
    const { showId, seats } = req.body;

    if (!showId || !seats) {
        throw new AppError("Show ID and number of seats are required", 400);
    }
    if (seats < 1) {
        throw new AppError("Must book at least 1 seat", 400);
    }
    if (seats > 10) {
        throw new AppError("You can book at most 10 seats at a time", 400);
    }

    const show = await Show.findById(showId);
    if (!show) {
        throw new AppError("Show not found", 404);
    }
    if (!show.isActive) {
        throw new AppError("This show is not currently available for booking", 400);
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
        throw new AppError("Not enough seats available. Only " + show.availableSeats + " seats left.", 400);
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
});
// const createBooking = async (req, res) => {
//     try {
//         const { showId, seats } = req.body;

//         // Step 1: Validate input
//         if (!showId || !seats) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Show ID and number of seats are required",
//             });
//         }

//         if (seats < 1) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Must book at least 1 seat",
//             });
//         }
//         // Riya's ticket: no more than 10 seats in one booking
//         if (seats > 10) {
//             return res.status(400).json({
//                 success: false,
//                 message: "You can book at most 10 seats at a time",
//             });
//         }

//         // Step 2: Find the show
//         const show = await Show.findById(showId);

//         if (!show) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Show not found",
//             });
//         }

//         // Step 3: Check if show is active
//         if (!show.isActive) {
//             return res.status(400).json({
//                 success: false,
//                 message: "This show is not currently available for booking",
//             });
//         }

//         // Step 4: Atomic seat check and decrement
//         const updatedShow = await Show.findOneAndUpdate(
//             {
//                 _id: showId,
//                 availableSeats: { $gte: seats },
//             },
//             {
//                 $inc: { availableSeats: -seats },
//             },
//             { new: true }
//         );

//         if (!updatedShow) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Not enough seats available. Only " + show.availableSeats + " seats left.",
//             });
//         }

//         // Tell everyone watching this show that seats just dropped
//         emitSeatUpdate(updatedShow);

//         // Step 5: Calculate total price
//         const totalPrice = seats * show.ticketPrice;

//         // Step 6: Create the booking
//         const booking = await Booking.create({
//             show: showId,
//             user: req.user.userId,
//             seats,
//             totalPrice,
//             status: "pending",
//         });
//         res.status(201).json({
//             success: true,
//             message: "Booking created successfully. Proceed to payment.",
//             data: booking,
//         });
//     } catch (err) {
//         res.status(500).json({
//             success: false,
//             message: "Something went wrong",
//         });
//     }
// };
const cancelBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        throw new AppError("Booking not found", 404);
    }

    // Only the user who made the booking can cancel it
    if (booking.user.toString() !== req.user.userId) {
        throw new AppError("You can only cancel your own bookings", 403);
    }

    if (booking.status === "cancelled") {
        throw new AppError("Booking is already cancelled", 400);
    }
    if (booking.stripePaymentIntentId) {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const intent = await stripe.paymentIntents.retrieve(
            booking.stripePaymentIntentId
        );

        if (intent.status === "succeeded") {
            await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
        } else if (intent.status === "processing") {
            throw new AppError("Payment is still processing. Please try again shortly.", 400);
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
});
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
