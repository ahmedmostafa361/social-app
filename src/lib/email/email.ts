import { env } from "../config/env.js";
import { MailjetProvider } from "../../pkg/email/mailjet.js";
import { NodemailerProvider } from "../../pkg/email/nodemailer.js";
import type { MailProvider } from "../../pkg/email/mail.interface.js";
import { logger } from "../../pkg/logger/logger.js";
import { AppError } from "../errors/app.error.js";
import { runInBackground } from "../utils/background.js";

const createProvider = (): MailProvider => {
    if (env.mail.provider === "mailjet") {
        return new MailjetProvider({
            apiKey: env.mail.mailjetApiKey ?? "",
            apiSecret: env.mail.mailjetSecretKey ?? "",
            fromEmail: env.mail.mailjetFromEmail ?? "",
            fromName: env.mail.fromName,
        });
    }

    return new NodemailerProvider({
        host: env.mail.host,
        port: env.mail.port,
        secure: env.mail.secure,
        user: env.mail.user ?? "",
        pass: env.mail.pass ?? "",
        fromName: env.mail.fromName,
    });
};

const emailProvider = createProvider();

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
    try {
        await emailProvider.send(to, subject, html);
    } catch (error) {
        logger.error("Email sending failed", {
            subject,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new AppError("We couldn't send the email right now. Please try again shortly", 503, {
            code: "EMAIL_FAILED",
        });
    }
};

export const sendEmailInBackground = (to: string, subject: string, html: string): void => {
    runInBackground(() => sendEmail(to, subject, html));
};
