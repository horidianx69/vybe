// demo/socket-flood.js: 200 connections from one script
// Only ever run this against your own local VYBE.
const { io } = require("socket.io-client");
const SHOW_ID = process.argv[2];

for (let i = 0; i < 200; i++) {
    const socket = io("http://localhost:3001");
    socket.on("connect", () => socket.emit("join-show", SHOW_ID));
}
console.log("200 connections opened. Watch the viewer count on the show page.");
setTimeout(() => process.exit(0), 20000);
