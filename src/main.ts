import 'dotenv/config'
import express from "express"

import logger from "./utlis/logger"
import { swaggerSetup } from "./config/swagger"
import appConfig from "./config/app.config"
import { initRoutes } from "./initRoutes"

const app = express()
app.use(express.json())
const config = appConfig()

const port = config.app.port
if (!port) {
    logger.error("PORT is not defined! Please set PORT in your environment variables.");
    process.exit(1); // stop the server immediately
}

// swagger setup
if(config.app.node_env !== 'production'){
    swaggerSetup(app)
}

// Initialize Routes setup
initRoutes(app)

app.listen(port, () => {
  logger.info(`${config.app.name} app listening on port ${port}`)
})
