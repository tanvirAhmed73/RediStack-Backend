import { Server } from "socket.io"
import type { Server as HttpServer } from "http";
import logger from "../utlis/logger";
import { registerSocketHandlers } from "./socket.handler";
import { socketAuthMiddleware } from "../middlewares/socket.auth";
import { initChatPubSub } from "../services/chat.pubsub";

let io: Server;

export const initSocket = async (httpServer: HttpServer) => {
    io = new Server(httpServer,{
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.use(socketAuthMiddleware);
    
    // Initialize Redis Pub/Sub for chat
    try {
        await initChatPubSub();
        logger.info("Chat Pub/Sub initialized");
    } catch (error) {
        logger.error("Failed to initialize Chat Pub/Sub:", error);
        // Continue anyway - chat will work but Pub/Sub won't
    }
    
    io.on("connection", (socket) => {
        logger.info("Socket connected");
        registerSocketHandlers(socket);
    });
};

export const getIO = () => {
    if (!io) {
      throw new Error("Socket.io not initialized")
    }
    return io
  }