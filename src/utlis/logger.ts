import winston, { format, transports } from "winston"

const logger = winston.createLogger({
    level: "debug",
    format: format.combine(
        format.colorize({ all: true }),         // colorful logs in console
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack }) => {
          return stack
            ? `[${timestamp}] ${level}: ${stack}`   // log errors with stack
            : `[${timestamp}] ${level}: ${message}`;
        })
      ),
    transports:[
        new transports.Console()
    ]
})

export default logger;