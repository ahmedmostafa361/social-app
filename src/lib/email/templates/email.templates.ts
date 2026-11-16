import { baseEmailLayout } from "./email.layout.js";
import { escapeHtml } from "../../../pkg/utils/string.js";
import { AUTH_LIMITS } from "../../config/constants.js";
import { OtpPurpose } from "../../../modules/auth/enum/enum.js";

export interface EmailContent {
    subject: string;
    html: string;
}

const heading = (text: string): string =>
    `<h1 style="margin: 0 0 12px 0; color: #f8fafc; font-size: 24px; font-weight: 700;">${escapeHtml(text)}</h1>`;

const paragraph = (html: string): string =>
    `<p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 15px; line-height: 1.6;">${html}</p>`;

const note = (html: string): string => `<p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">${html}</p>`;

const codeBox = (code: string): string => `
    <div style="background: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 32px;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #38bdf8; letter-spacing: 8px;">${escapeHtml(code)}</span>
    </div>`;

const otpContent: Record<OtpPurpose, { subject: string; title: string; intro: string; ignore: string }> = {
    [OtpPurpose.VERIFY_EMAIL]: {
        subject: "Verify your email",
        title: "Verify Your Email",
        intro: "Use the one-time code below to verify your email and activate your account.",
        ignore: "If you didn't create an account, you can safely ignore this email.",
    },
    [OtpPurpose.RESET_PASSWORD]: {
        subject: "Password reset code",
        title: "Reset Your Password",
        intro: "We received a request to reset your password. Use the one-time code below to continue.",
        ignore: "If you didn't request a password reset, ignore this email. Your password stays the same.",
    },
};

export const getOtpEmail = (purpose: OtpPurpose, code: string): EmailContent => {
    const content = otpContent[purpose];
    const bodyContent = `
    ${heading(content.title)}
    ${paragraph(content.intro)}
    ${codeBox(code)}
    ${note(`This code expires in <strong>${AUTH_LIMITS.otpExpiresMinutes} minutes</strong> and can only be used once.`)}
    ${note(content.ignore)}`;

    return { subject: content.subject, html: baseEmailLayout({ title: content.title, bodyContent }) };
};

export const getAccountLockedEmail = (userName: string, minutes: number): EmailContent => {
    const bodyContent = `
    ${heading("Login Attempts Blocked")}
    ${paragraph(`Hi ${escapeHtml(userName)}, we noticed ${AUTH_LIMITS.maxFailedLogins} failed login attempts on your account in a row. To protect you, logging in is paused for <strong>${minutes} minutes</strong>.`)}
    ${note("If this wasn't you, we recommend resetting your password.")}`;

    return {
        subject: "Suspicious login attempts on your account",
        html: baseEmailLayout({ title: "Login Attempts Blocked", bodyContent }),
    };
};

export const getPasswordChangedEmail = (userName: string): EmailContent => {
    const bodyContent = `
    ${heading("Your Password Was Changed")}
    ${paragraph(`Hi ${escapeHtml(userName)}, the password for your account was just changed and you were logged out of your other devices.`)}
    ${note("If you didn't do this, reset your password right away.")}`;

    return {
        subject: "Your password was changed",
        html: baseEmailLayout({ title: "Your Password Was Changed", bodyContent }),
    };
};
