import { Socket, ExtendedError } from "socket.io";
import { AppError } from "../utlis/appError";
import { verifyAccessToken } from "../utlis/helper/auth";

export const socketAuthMiddleware = async (
    socket: Socket,
    next: (err?: ExtendedError) => void
) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            const err = new Error("Unauthorized") as ExtendedError;
            err.data = { statusCode: 401 };
            return next(err);
        }

        const payload = await verifyAccessToken(token);
        if (!payload) {
            const err = new Error("Unauthorized") as ExtendedError;
            err.data = { statusCode: 401 };
            return next(err);
        }

        socket.data.userId = payload.sub;

        next();
    } catch (error) {
        const err = new Error("Unauthorized") as ExtendedError;
        err.data = { statusCode: 401 };
        next(err);
    }
}