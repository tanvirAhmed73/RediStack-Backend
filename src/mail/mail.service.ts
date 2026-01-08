import { generateRandomOtp } from "../utlis/helper/generateRandomOtp";
import logger from "../utlis/logger";
import { emailQueue } from "./email.queue";
import appConfig from "../config/app.config";

const config = appConfig();

export const sendVerificationEmail = async (email:string)=>{
    const verificationOtp = generateRandomOtp();
    logger.info(`Email Verification OTP Generated Successfully`);

    const from = `${config.app.name} <${config.mail.mail_from}>`;
    const subject = "Verify your email";
    const expireTime = 1;

    await emailQueue.add("send-verification-email", {
        from,
        to:email,
        subject,
        context: {
            expireTime: expireTime,
            verificationOtp,
        },
    });
    logger.info("Added job to email queue successfully");
}