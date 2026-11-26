const request = require("supertest");

// A pretend Groq client. Each test decides what the AI "replies".
const mockCreate = jest.fn();
jest.mock("groq-sdk", () =>
    jest.fn().mockImplementation(() => ({
        chat: { completions: { create: (...args) => mockCreate(...args) } },
    }))
);

const app = require("../app");
const Movie = require("../models/movieModel");
const Show = require("../models/showModel");
const { createShow } = require("./helpers");

// Make the pretend AI answer with this text
const aiReplies = (text) =>
    mockCreate.mockResolvedValue({ choices: [{ message: { content: text } }] });

// One thriller at 18:00, one comedy at 19:00, and one comedy at 21:00 that is not approved yet
const createShows = async () => {
    const thrillerShow = await createShow();
    const comedy = await Movie.create({
        title: "3 Idiots",
        description: "Three friends at engineering college",
        genre: "Comedy",
        language: "Hindi",
        releaseDate: new Date("2009-12-25"),
    });
    const comedyShow = {
        movie: comedy._id,
        theatre: thrillerShow.theatre,
        date: thrillerShow.date,
        totalSeats: 10,
        availableSeats: 10,
        ticketPrice: 200,
    };
    await Show.create({ ...comedyShow, time: "19:00", isActive: true });
    await Show.create({ ...comedyShow, time: "21:00", isActive: false });
};

const search = (query) => request(app).post("/api/ai/search-shows").send({ query });

describe("POST /api/ai/search-shows", () => {
    beforeEach(() => mockCreate.mockReset());

    test("a good AI reply finds the right show", async () => {
        await createShows();
        aiReplies('{"genre":"Comedy","timeFrom":"18:00"}');

        const res = await search("comedy after 6pm");

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].time).toBe("19:00");
    });

    test("bad fields in the AI reply are dropped, good ones kept", async () => {
        await createShows();
        aiReplies('{"genre":"Comedy","timeFrom":"evening","dateFrom":"this weekend","isActive":false}');

        const res = await search("comedy this weekend evening");

        expect(res.statusCode).toBe(200);
        expect(res.body.filters).toEqual({ genre: "Comedy" });
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].time).toBe("19:00");
    });

    test("when Groq fails, the search still answers with keyword matches", async () => {
        await createShows();
        mockCreate.mockRejectedValue(new Error("Request timed out."));

        const res = await search("comedy after 6pm");

        expect(res.statusCode).toBe(200);
        expect(res.body.mode).toBe("keyword");
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].movie.title).toBe("3 Idiots");
    });

    test("a very long query is refused before it reaches Groq", async () => {
        const res = await search("a".repeat(201));

        expect(res.statusCode).toBe(400);
        expect(mockCreate).not.toHaveBeenCalled();
    });
});
