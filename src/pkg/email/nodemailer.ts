import { createTransport, type Transporter } from "nodemailer";
import type { MailProvider } from "./mail.interface.js";

export interface INodemailerConfig {
    host?: string;
    port?: number;
    secure?: boolean;
    user: string;
    pass: string;
    fromEmail?: string;
    fromName: string;
}

export class NodemailerProvider implements MailProvider {
    private readonly client: Transporter;
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(config: INodemailerConfig) {
        this.client = createTransport({
            host: config.host ?? "smtp.gmail.com",
            port: config.port ?? 587,
            secure: config.secure ?? false,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });
        this.fromName = config.fromName;
        this.fromEmail = config.fromEmail ?? config.user;
    }

    async send(email: string, subject: string, html: string): Promise<void> {
        await this.client.sendMail({
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: email,
            subject,
            html,
        });
    }
}
