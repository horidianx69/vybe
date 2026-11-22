const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

let io;

const roomFor = (showId) => `show:${showId}`;

// How many sockets are in a room right now
const viewersIn = (room) => io.sockets.adapter.rooms.get(room)?.size || 0;

const initSocket = (server) => {
    io = new Server(server, {
        cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" },
    });

    // Runs once per connection, before "connection" fires: the gate check
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        // No token: a guest. Guests may listen to public events like the booking toast.
        if (!token) {
            socket.user = null;
            return next();
        }

        try {
            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch (err) {
            // A bad or expired token is treated as a guest
            socket.user = null;
            next();
        }
    });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("join-show", (showId) => {
            // Live seats and viewers are for logged-in users only
            if (!socket.user) return;
            // Never trust the client: only real show ids may name a room
            if (!mongoose.isObjectIdOrHexString(showId)) return;
            const room = roomFor(showId);
            socket.join(room);
            io.to(room).emit("viewers", viewersIn(room));
        });

        socket.on("leave-show", (showId) => {
            if (!mongoose.isObjectIdOrHexString(showId)) return;
            const room = roomFor(showId);
            socket.leave(room);
            io.to(room).emit("viewers", viewersIn(room));
        });

        // "disconnecting" fires while the socket is still inside its rooms
        socket.on("disconnecting", () => {
            for (const room of socket.rooms) {
                if (room.startsWith("show:")) {
                    socket.to(room).emit("viewers", viewersIn(room) - 1);
                }
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
};

// Called by the booking controller whenever seats change
const emitSeatUpdate = (show) => {
    if (!io || !show) return;
    io.to(roomFor(show._id)).emit("seat-update", {
        showId: show._id,
        availableSeats: show.availableSeats,
    });
};

// Called when a payment is verified: every connected client hears about it
const emitBookingConfirmed = ({ movie, seats }) => {
    if (!io) return;
    io.emit("booking-confirmed", { movie, seats });
};

module.exports = { initSocket, emitSeatUpdate, emitBookingConfirmed };
