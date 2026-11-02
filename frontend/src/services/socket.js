import { io } from "socket.io-client";

// autoConnect: false, so nothing connects until a page asks for it
const socket = io(import.meta.env.VITE_API_URL, { autoConnect: false });

export default socket;
