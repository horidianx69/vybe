const request = require("supertest");
const app = require("../app");

describe("GET /health", () => {
    test("reports the database as up", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.db).toBe("up");
    });
});
