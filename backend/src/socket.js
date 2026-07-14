import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: (process.env.CORS_ORIGIN || "").split(","),
            credentials: true
        }
    });

    // ─── Authenticate Socket.io connections with JWT ─────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            return next(new Error("Authentication required — no token provided"));
        }

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            return next(new Error("Authentication failed — invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        // Auto-join the authenticated user's private room
        if (socket.userId) {
            socket.join(socket.userId);
        }

        // Prevent joining other users' rooms — users can only be in their own room
        socket.on("join", (requestedUserId) => {
            if (requestedUserId && requestedUserId === socket.userId) {
                socket.join(requestedUserId);
            }
        });

        socket.on("disconnect", () => {
            // Handle disconnect if needed
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    if (io && userId) {
        io.to(userId.toString()).emit(event, data);
    }
};

const emitToAll = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};

export { initializeSocket, getIO, emitToUser, emitToAll };
