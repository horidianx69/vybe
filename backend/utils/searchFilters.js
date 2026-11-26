const { z } = require("zod");
const Movie = require("../models/movieModel");

// The genres the Movie schema allows, read from the schema itself
const GENRES = Movie.schema.path("genre").enumValues;

// What a valid filter looks like. A field that is missing or breaks its rule becomes undefined.
const filterSchema = z.object({
    genre: z.enum(GENRES).catch(undefined),
    language: z.string().max(30).catch(undefined),
    movieTitle: z.string().max(100).catch(undefined),
    dateFrom: z.iso.date().catch(undefined),
    dateTo: z.iso.date().catch(undefined),
    timeFrom: z.iso.time({ precision: -1 }).catch(undefined),
    timeTo: z.iso.time({ precision: -1 }).catch(undefined),
});

// Turns the AI's reply into checked filters, or null if nothing usable came back
const parseFilters = (aiText) => {
    let json;
    try {
        json = JSON.parse(aiText);
    } catch {
        return null;
    }

    const result = filterSchema.safeParse(json);
    if (!result.success) return null;

    const found = Object.values(result.data).some((value) => value !== undefined);
    return found ? result.data : null;
};

// . * ( ) and friends mean something inside a regex. A backslash in front makes each one plain text.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { parseFilters, escapeRegex };
