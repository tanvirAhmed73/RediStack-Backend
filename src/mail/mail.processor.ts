import { Job, Worker } from "bullmq";
import logger from "../utlis/logger";
import { mailTransporter } from "../config/mail.config";
import appConfig from "../config/app.config";
import path from "node:path";
import fs from "node:fs";
import ejs from "ejs";
import { getBullConnection } from "../config/bullmq.config";
import { renderEmailTemplate } from "./email.templete.loader";

const config = appConfig();

const TEMPLATE_DIR = path.join(__dirname, "templates");

// Create and export the worker so it can be initialized in main.ts
export const emailWorker = new Worker(
    "email-queue",
    async (job: Job) => {
        try {
            logger.info(`Processing Job: Sending Verification Email with ID`);
            
            // Use job.name (the first parameter of queue.add()) not job.data.name
            switch (job.name) {
                case "send-verification-email":
                    logger.info("Processing Job: Sending OTP verification code to email");
                    
                    // Render HTML with context
                    const html = renderEmailTemplate("email-verification-by-otp.ejs", job.data.context || {});
    
                    // Send email with timeout
                    const mailOptions = {

                        from: job.data.from,
                        to: job.data.to,
                        subject: job.data.subject,
                        html
                    };
    
                    logger.info(`Attempting to send email`);
                    
                    try {
                        // Add timeout wrapper to prevent hanging
                        const sendPromise = mailTransporter.sendMail(mailOptions);
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000);
                        });
                        
                        const info = await Promise.race([sendPromise, timeoutPromise]) as any;
                        logger.info(`✅ Email sent successfully`);
                    } catch (emailError: any) {
                        // Log detailed error information
                        const errorDetails: any = {
                            error: emailError.message,
                            code: emailError.code,
                            command: emailError.command,
                            response: emailError.response,
                            responseCode: emailError.responseCode,
                        };
                        
                        // Add troubleshooting hints
                        if (emailError.message?.includes('Timeout') || emailError.code === 'ETIMEDOUT') {
                            errorDetails.troubleshooting = [
                                'Check if port 587 is blocked by firewall',
                                'Verify MAIL_HOST and MAIL_PORT are correct',
                                'Try using port 465 with secure: true',
                                'Check if your network allows SMTP connections',
                            ];
                        }
                        
                        logger.error(`❌ Failed to send email to ${job.data.to}:`, errorDetails);
                        throw emailError;
                    }
                    break;
                    
                default:
                    logger.error(`Unknown job type: ${job.name}`);
                    throw new Error(`Unknown job type: ${job.name}`);
            }
        } catch (error) {
            logger.error(`Error processing job ${job.id}:`, error);
            throw error; // Re-throw to mark job as failed
        }
    },
    {
        connection: getBullConnection(),
        concurrency: 5,
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
            age: 24 * 3600, // Keep failed jobs for 24 hours
        },
    }
);

// Worker event handlers for monitoring
emailWorker.on("completed", (job) => {
    logger.info(`Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
});

emailWorker.on("error", (err) => {
    logger.error("Worker error:", err);
});