import type { Express } from "express"
import { createServer } from "http"

export const createHttpServer = (app:Express) =>{
    return createServer(app)
}