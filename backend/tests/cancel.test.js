const request = require("supertest");
const app = require("../app");
const Show = require("../models/showModel");
const { createUserAndToken, createShow } = require("./helpers");

describe("PUT /api/bookings/cancel/:id", () => {
    test("cancelling gives the seats back", async () => {
        // Arrange: book 2 of 10 seats
        const { token } = await createUserAndToken("user");
        const show = await createShow({ availableSeats: 10 });
        const booked = await request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${token}`)
            .send({ showId: show._id, seats: 2 });

        // Act
        const res = await request(app)
            .put(`/api/bookings/cancel/${booked.body.data._id}`)
            .set("Authorization", `Bearer ${token}`);

        // Assert
        expect(res.status).toBe(200);
        const updated = await Show.findById(show._id);
        expect(updated.availableSeats).toBe(10);
    });
});
