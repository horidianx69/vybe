const request = require("supertest");
const app = require("../app");
const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");
const releaseStaleBookings = require("../jobs/releaseStaleBookings");
const { createUserAndToken, createShow } = require("./helpers");

describe("releaseStaleBookings", () => {
    test("gives back the seats of an old unpaid booking, once", async () => {
        // Arrange: book 2 of 10 seats, then make the booking 15 minutes old
        const { token } = await createUserAndToken("user");
        const show = await createShow({ availableSeats: 10 });
        const booked = await request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({ showId: show._id, seats: 2 });

        // Mongoose never lets createdAt change, so we go to the raw collection
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const pending = await Booking.findById(booked.body.data._id);
        await Booking.collection.updateOne(
            { _id: pending._id },
            { $set: { createdAt: fifteenMinutesAgo } }
        );

        // Act: two runs at the same moment, as two servers would
        await Promise.all([releaseStaleBookings(), releaseStaleBookings()]);

        // Assert: cancelled, and the seats came back exactly once
        const booking = await Booking.findById(booked.body.data._id);
        expect(booking.status).toBe("cancelled");
        const updated = await Show.findById(show._id);
        expect(updated.availableSeats).toBe(10);
    });

    test("leaves a fresh booking alone", async () => {
        const { token } = await createUserAndToken("user");
        const show = await createShow({ availableSeats: 10 });
        const booked = await request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({ showId: show._id, seats: 2 });

        await releaseStaleBookings();

        const booking = await Booking.findById(booked.body.data._id);
        expect(booking.status).toBe("pending");
        const updated = await Show.findById(show._id);
        expect(updated.availableSeats).toBe(8);
    });
});
