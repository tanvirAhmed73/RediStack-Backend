import { Express } from "express";
import authRoutes from "./modules/auth/auth.routes";

export function initRoutes(app:Express){
    app.use('/api/v1/auth', authRoutes)
}