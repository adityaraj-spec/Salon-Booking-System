import { Server } from "socket.io";

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: (process.env.CORS_ORIGIN || "").split(","),
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        // Join a private room based on user ID passed during handshake or event
        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(userId);
        }

        socket.on("join", (userId) => {
            if (userId) {
                socket.join(userId);
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
