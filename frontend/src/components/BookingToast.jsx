import { useEffect, useState } from "react";
import socket from "../services/socket";

const BookingToast = () => {
    const [message, setMessage] = useState("");

    useEffect(() => {
        let timer;
        const onBooked = ({ movie, seats }) => {
            setMessage(
                `Someone just booked ${seats} ${seats === 1 ? "seat" : "seats"} for ${movie}`
            );
            clearTimeout(timer);
            timer = setTimeout(() => setMessage(""), 4000);
        };

        socket.on("booking-confirmed", onBooked);
        socket.connect();

        return () => {
            clearTimeout(timer);
            socket.off("booking-confirmed", onBooked);
        };
    }, []);

    if (!message) return null;

    return (
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-violet-500 text-white px-5 py-3 rounded-xl shadow-lg">
            {message}
        </div>
    );
};

export default BookingToast;
