import 'dotenv/config'
import express from "express"

import logger from "./utlis/logger"
import { swaggerSetup } from "./config/swagger"
import appConfig from "./config/app.config"
import { initRoutes } from "./initRoutes"
import { prisma } from './utlis/prisma'


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

    // swagger setup
    if(config.app.node_env !== 'production'){
        swaggerSetup(app)
    }
  
    // Initialize Routes setup
    initRoutes(app)
  
    app.listen(port, () => {
      logger.info(`${config.app.name} app listening on port ${port}`)
    })
  } catch (error) {
    logger.error(`Error starting the server: ${error}`)
    process.exit(1)
  }


}
bootstrap()