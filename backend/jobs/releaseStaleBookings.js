const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");
const { emitSeatUpdate } = require("../socket");

// How long an unpaid booking may hold its seats
const HOLD_MINUTES = 10;

const releaseStaleBookings = async () => {
    // 1. Every pending booking created before the cutoff has held its seats too long
    const cutoff = new Date(Date.now() - HOLD_MINUTES * 60 * 1000);
    const stale = await Booking.find({ status: "pending", createdAt: { $lt: cutoff } });

    let released = 0;
    for (const booking of stale) {
        // 2. If checkout was opened, cancel the payment at Stripe first.
        //    Stripe refuses if the user has just paid, and then we leave the booking alone.
        if (booking.stripePaymentIntentId) {
            try {
                await stripe.paymentIntents.cancel(booking.stripePaymentIntentId);
            } catch (err) {
                console.log(`Skipped booking ${booking._id}: ${err.message}`);
                continue;
            }
        }

        // 3. Cancel only if it is still pending. If anyone got there first, we get null.
        const cancelled = await Booking.findOneAndUpdate(
            { _id: booking._id, status: "pending" },
            { status: "cancelled" }
        );
        if (!cancelled) continue;

        // 4. Only the run that cancelled it gives the seats back
        const show = await Show.findByIdAndUpdate(
            booking.show,
            { $inc: { availableSeats: booking.seats } },
            { new: true }
        );
        emitSeatUpdate(show);
        released++;
    }

    if (released > 0) {
        console.log(`Released ${released} stale booking(s)`);
    }
};

module.exports = releaseStaleBookings;
