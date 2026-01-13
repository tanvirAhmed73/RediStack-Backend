import 'dotenv/config'
import express from "express"
import "./types/express" // Load Express type extensions

import logger from "./utlis/logger"
import { swaggerSetup } from "./config/docs/swagger"
import appConfig from "./config/app.config"
import { initRoutes } from "./initRoutes"
import { prisma } from './utlis/prisma'
import { globalErrorHandler } from './middlewares/globalErrorHandler'
import { AppError } from './utlis/appError'
import { connectRedis, disconnectRedis } from './config/redis.config'
import './mail/mail.processor' // Initialize email worker
import { createHttpServer } from './server'
import { initSocket } from './socket'
import { apiRateLimiter } from './middlewares/rateLimiter'


// 🔥 Node.js level error protection (TOP LEVEL ERROR HANDLING)
process.on("uncaughtException", async (err) => {
  logger.error("UNCAUGHT EXCEPTION 💥", err)
  await disconnectRedis()
  process.exit(1)
})

process.on("unhandledRejection", async (err) => {
  logger.error("UNHANDLED REJECTION 💥", err)
  await disconnectRedis()
  process.exit(1)
})

async function bootstrap() {
  const app = express()
  app.use(express.json())
  const config = appConfig()

  const port = config.app.port
  if (!port) {
      logger.error("PORT is not defined! Please set PORT in your environment variables.");
      process.exit(1); // stop the server immediately
  }

  try {
    // check Postgres connection
    await prisma.$connect()
    logger.info('Connected to Postgres')

    // Redis connection
    await connectRedis()

    // swagger setup
    if(config.app.node_env !== 'production'){
        swaggerSetup(app)
    }
  
    // Initialize Routes setup
    initRoutes(app)

    // Unhandled route 
    app.use((req, _res, next) => {
      next(new AppError(`Route ${req.originalUrl} not found`, 404))
    })

    // Global Error Handler
    app.use(globalErrorHandler)
    
    // API Rate Limiter
    app.use(apiRateLimiter)

    const httpServer = createHttpServer(app)
    // init socket.io
    await initSocket(httpServer)
  
    httpServer.listen(port, () => {
      logger.info(`${config.app.name} app listening on port ${port}`)
    })
  } catch (error) {
    logger.error(`Error starting the server: ${error}`)
    process.exit(1)
  }


}
bootstrap()