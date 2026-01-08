import { Queue } from "bullmq";
import { getBullConnection } from "../config/bullmq.config";

export const emailQueue = new Queue("email-queue", {
    connection: getBullConnection(),
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
        removeOnComplete: {
            age: 300, // Keep completed jobs for 1 hour
            count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
            age:300, // Keep failed jobs for 5 minutes
        },
    },
});
