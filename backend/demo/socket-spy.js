// Connects to VYBE's socket without logging in and tries to join a show's live room.
// Only ever run this against your own local VYBE.
const { io } = require("socket.io-client");

const SHOW_ID = process.argv[2]; // a real show id from your database
const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected as", socket.id);
    socket.emit("join-show", SHOW_ID);
});
socket.on("viewers", (count) => console.log("Viewers on this show:", count));
socket.on("seat-update", (data) => console.log("Seat update:", data));
socket.on("connect_error", (err) => console.log("connect_error:", err.message));

setTimeout(() => process.exit(0), 3000);
