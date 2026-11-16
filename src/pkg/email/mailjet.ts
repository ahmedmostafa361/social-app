import mailjet from "node-mailjet";
import type { MailProvider } from "./mail.interface.js";

export interface IMailjetConfig {
    apiKey: string;
    apiSecret: string;
    fromEmail: string;
    fromName: string;
}

export class MailjetProvider implements MailProvider {
    private readonly client: InstanceType<typeof mailjet.Client>;
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(config: IMailjetConfig) {
        this.client = new mailjet.Client({
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
        });
        this.fromEmail = config.fromEmail;
        this.fromName = config.fromName;
    }

    async send(email: string, subject: string, html: string): Promise<void> {
        await this.client.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    From: { Email: this.fromEmail, Name: this.fromName },
                    To: [{ Email: email }],
                    Subject: subject,
                    HTMLPart: html,
                },
            ],
        });
    }
}
