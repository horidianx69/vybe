const request = require("supertest");
const app = require("../app");
const { createUserAndToken } = require("./helpers");

describe("Secure headers", () => {
    test("the response no longer says it comes from Express", async () => {
        const res = await request(app).get("/api/movies");
        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
});

describe("Injection", () => {
    test("an object instead of an email is refused with 400", async () => {
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: { $regex: "^a" } });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("email must be text");
    });
});

describe("JWT tampering", () => {
    test("a token whose role was changed to admin gets 401", async () => {
        const { token } = await createUserAndToken("user");
        const [header, payload, signature] = token.split(".");

        // Decode the middle part, change the role, encode it again
        const data = JSON.parse(Buffer.from(payload, "base64url").toString());
        data.role = "admin";
        const forgedPayload = Buffer.from(JSON.stringify(data)).toString("base64url");
        const forgedToken = [header, forgedPayload, signature].join(".");

        const res = await request(app)
            .post("/api/movies")
            .set("Authorization", `Bearer ${forgedToken}`)
            .send({ title: "Hacked" });

        expect(res.status).toBe(401);
    });
});
