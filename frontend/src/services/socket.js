import { io } from "socket.io-client";

// autoConnect: false, so nothing connects until a page asks for it
const socket = io(import.meta.env.VITE_API_URL, {
    autoConnect: false,
    // Called before every connection attempt, so it always sends the latest token
    auth: (cb) => cb({ token: localStorage.getItem("token") }),
});

export default socket;
