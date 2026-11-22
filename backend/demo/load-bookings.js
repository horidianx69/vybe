// Demo only: fills the local database the way a busy year would.
// Never run this against Atlas or any shared database.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Movie = require("../models/movieModel");
const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel");
const Booking = require("../models/bookingModel");

const load = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email: process.argv[2] });
    if (!user) {
        console.log("No user with that email. Register first.");
        process.exit(1);
    }

    // Any show will do. The seed script may not create one, so make one if needed.
    let show = await Show.findOne();
    if (!show) {
        const movie = await Movie.findOne();
        const theatre = await Theatre.findOne();
        show = await Show.create({
            movie: movie._id, theatre: theatre._id, date: new Date(), time: "18:00",
            totalSeats: 100, availableSeats: 100, ticketPrice: 250,
        });
    }

    // 10 bookings for our demo user
    const mine = [];
    for (let i = 0; i < 10; i++) {
        mine.push({ show: show._id, user: user._id, seats: 2, totalPrice: 2 * show.ticketPrice, status: "confirmed" });
    }
    await Booking.insertMany(mine);

    // 1,000,000 bookings by 5,000 other customers, 10,000 at a time
    const others = [];
    for (let i = 0; i < 5000; i++) {
        others.push(new mongoose.Types.ObjectId());
    }

    for (let batch = 1; batch <= 100; batch++) {
        const docs = [];
        for (let i = 0; i < 10000; i++) {
            docs.push({ show: show._id, user: others[i % 5000], seats: 1, totalPrice: show.ticketPrice, status: "confirmed" });
        }
        await Booking.insertMany(docs);
        if (batch % 20 === 0) console.log(`${batch * 10000} bookings added`);
    }

    console.log("Done");
    process.exit(0);
};

load();
