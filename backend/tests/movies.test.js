const request = require("supertest");
const app = require("../app");

describe("GET /api/movies", () => {
    test("returns 200 and a list of movies", async () => {
        // Arrange: nothing to set up, an empty list is still a list

        // Act
        const res = await request(app).get("/api/movies");

        // Assert
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});
