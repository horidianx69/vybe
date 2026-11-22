const request = require("supertest");
const app = require("../app");
const sendEmail = require("../utils/emailSender");
const { createUserAndToken } = require("./helpers");

// Replace the real email sender with a fake that only records its calls
jest.mock("../utils/emailSender");

describe("POST /api/auth/forgot-password", () => {
    test("a known and an unknown email get the same answer", async () => {
        const { user } = await createUserAndToken("user");

        const known = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: user.email });
        const unknown = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: "nobody@vybe.com" });

        expect(known.status).toBe(unknown.status);
        expect(known.body).toEqual(unknown.body);

        // Only the real account got an email
        expect(sendEmail).toHaveBeenCalledTimes(1);
        expect(sendEmail.mock.calls[0][0].to).toBe(user.email);
    });
});
