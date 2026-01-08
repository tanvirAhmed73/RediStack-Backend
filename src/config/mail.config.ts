import nodemailer from "nodemailer";
import appConfig from "./app.config";
import logger from "../utlis/logger";

const config = appConfig();

// Determine if we should use secure connection (port 465) or STARTTLS (port 587)
const port = Number(config.mail.port);
const useSecure = port === 465;

// Build transport options optimized for Gmail
const transportOptions: any = {
    host: config.mail.host,
    port: port,
    secure: useSecure, // true for port 465, false for port 587
    // Don't require TLS explicitly - let it negotiate naturally
    // requireTLS can cause issues with some Gmail configurations
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 30000, // 30 seconds
    // TLS options for better compatibility
    tls: {
        rejectUnauthorized: true, // Verify SSL certificate (Gmail requires this)
        minVersion: 'TLSv1.2', // Minimum TLS version
    },
    // Connection pool settings
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Disable debug to reduce noise
    debug: false,
    logger: false,
};

// Only add auth if credentials are actually provided
if (config.mail.mail_from && config.mail.mail_app_password && 
    config.mail.mail_from.trim() !== '' && config.mail.mail_app_password.trim() !== '') {
    transportOptions.auth = {
        user: config.mail.mail_from,
        pass: config.mail.mail_app_password,
    };
} else {
    logger.warn("⚠️  Mail credentials not configured. Set MAIL_FROM and MAIL_APP_PASSWORD in .env");
}

export const mailTransporter = nodemailer.createTransport(transportOptions);

// Verify connection on module load (async, won't block)
// Only verify if credentials are provided
if (config.mail.mail_from && config.mail.mail_app_password && 
    config.mail.mail_from.trim() !== '' && config.mail.mail_app_password.trim() !== '') {
    mailTransporter.verify().then(() => {
        logger.info(`✅ Mail transporter verified successfully (${config.mail.host}:${port})`);
    }).catch((error: any) => {
        logger.error("❌ Mail transporter verification failed:", {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
        });
        
        // Provide specific troubleshooting based on error
        if (error.message?.includes('Connection closed') || error.code === 'ECONNRESET') {
            logger.warn("💡 Troubleshooting tips:");
            logger.warn("   1. Try using port 465 with secure: true (set MAIL_PORT=465)");
            logger.warn("   2. Check if your firewall/antivirus is blocking the connection");
            logger.warn("   3. Verify your Google App Password is correct (16 characters, no spaces)");
            logger.warn("   4. Ensure 2-Step Verification is enabled on your Google account");
            logger.warn("   5. Check Google Account security settings for any blocks");
        } else if (error.code === 'EAUTH') {
            logger.warn("💡 Authentication failed - check your MAIL_FROM and MAIL_APP_PASSWORD");
        }
    });
} else {
    logger.warn("⚠️  Mail credentials not configured - skipping verification");
}