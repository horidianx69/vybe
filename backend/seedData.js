require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/userModel");
const Movie = require("./models/movieModel");
const Theatre = require("./models/theatreModel");
const Show = require("./models/showModel");

const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(0, 0, 0, 0);
    return d;
};

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        await User.deleteMany({});
        await Movie.deleteMany({});
        await Theatre.deleteMany({});
        await Show.deleteMany({});
        console.log("Cleared existing data");

        const partner = await User.create({
            name: "Rajesh Kumar",
            email: "rajesh@example.com",
            password: "password123",
            role: "partner",
        });

        const movies = await Movie.insertMany([
            {
                title: "Inception",
                description: "A thief who steals secrets through dream-sharing technology.",
                genre: "Sci-Fi",
                language: "English",
                releaseDate: new Date("2010-07-16"),
                rating: 8.8,
            },
            {
                title: "3 Idiots",
                description: "Three engineering friends chase excellence instead of grades.",
                genre: "Comedy",
                language: "Hindi",
                releaseDate: new Date("2009-12-25"),
                rating: 8.4,
            },
            {
                title: "The Conjuring",
                description: "Paranormal investigators help a family terrorized by a dark presence.",
                genre: "Horror",
                language: "English",
                releaseDate: new Date("2013-07-19"),
                rating: 7.5,
            },
            {
                title: "The Dark Knight",
                description: "Batman faces the Joker, who pushes Gotham into chaos.",
                genre: "Action",
                language: "English",
                releaseDate: new Date("2008-07-18"),
                rating: 9.0,
            },
            {
                title: "Jab We Met",
                description: "A heartbroken businessman meets a free-spirited girl on a train.",
                genre: "Romance",
                language: "Hindi",
                releaseDate: new Date("2007-10-26"),
                rating: 7.9,
            },
        ]);

        const theatres = await Theatre.insertMany([
            {
                name: "PVR Orion Mall",
                address: "Dr Rajkumar Rd, Rajajinagar, Bengaluru",
                phone: "9876543210",
                email: "orion@pvr.com",
                owner: partner._id,
                isActive: true,
            },
            {
                name: "INOX Garuda Mall",
                address: "Magrath Rd, Ashok Nagar, Bengaluru",
                phone: "9876543211",
                email: "garuda@inox.com",
                owner: partner._id,
                isActive: true,
            },
            {
                name: "Cinepolis Nexus Koramangala",
                address: "Hosur Rd, Koramangala, Bengaluru",
                phone: "9876543212",
                email: "nexus@cinepolis.com",
                owner: partner._id,
                isActive: true,
            },
            {
                name: "PVR Phoenix Marketcity",
                address: "LBS Marg, Kurla, Mumbai",
                phone: "9876543213",
                email: "phoenix@pvr.com",
                owner: partner._id,
                isActive: true,
            },
            {
                name: "PVR Forum Mall",
                address: "Hosur Rd, Koramangala, Bengaluru",
                phone: "9876543214",
                email: "forum@pvr.com",
                owner: partner._id,
                isActive: true,
            },
        ]);

        const shows = await Show.insertMany([
            { movie: movies[0]._id, theatre: theatres[0]._id, date: daysFromNow(1), time: "10:00", totalSeats: 100, availableSeats: 100, ticketPrice: 250, isActive: true },
            { movie: movies[1]._id, theatre: theatres[1]._id, date: daysFromNow(1), time: "13:30", totalSeats: 120, availableSeats: 120, ticketPrice: 200, isActive: true },
            { movie: movies[2]._id, theatre: theatres[2]._id, date: daysFromNow(2), time: "21:00", totalSeats: 80, availableSeats: 80, ticketPrice: 300, isActive: true },
            { movie: movies[3]._id, theatre: theatres[3]._id, date: daysFromNow(2), time: "18:15", totalSeats: 150, availableSeats: 150, ticketPrice: 350, isActive: true },
            { movie: movies[4]._id, theatre: theatres[4]._id, date: daysFromNow(3), time: "16:00", totalSeats: 90, availableSeats: 90, ticketPrice: 220, isActive: true },
        ]);

        console.log(`Seeded: 1 partner, ${movies.length} movies, ${theatres.length} theatres, ${shows.length} shows`);
        process.exit(0);
    } catch (err) {
        console.log("Error seeding data:", err.message);
        process.exit(1);
    }
};

seedData();