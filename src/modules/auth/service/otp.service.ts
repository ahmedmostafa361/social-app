import { env } from "../../../lib/config/env.js";
import { AUTH_LIMITS } from "../../../lib/config/constants.js";
import { sendEmail } from "../../../lib/email/email.js";
import { getOtpEmail } from "../../../lib/email/templates/email.templates.js";
import { generateOTP } from "../../../lib/utils/otp.js";
import { hmacHash } from "../../../pkg/utils/hash.js";
import { addTime } from "../../../pkg/utils/time.js";
import type { OtpPurpose } from "../enum/enum.js";
import { invalidCode, otpExpired, otpResendCooldown, tooManyOtpAttempts } from "../errors.js";
import type { IOtp } from "../model/otp.model.js";
import { otpRepository } from "../repository/otp.repository.js";

export type SendOtpResult = { sent: true; expiresInMinutes: number } | { sent: false; retryAfterSeconds: number };

class OtpService {
    private hashCode(email: string, purpose: OtpPurpose, code: string): string {
        return hmacHash(`${email}:${purpose}:${code}`, env.tokens.otpSecret);
    }

    private cooldownRemaining(otp: IOtp | null): number {
        if (!otp || otp.expiresAt <= new Date()) return 0;
        const elapsedSeconds = Math.floor((Date.now() - otp.sentAt.getTime()) / 1000);
        return Math.max(AUTH_LIMITS.otpResendCooldownSeconds - elapsedSeconds, 0);
    }

    async send(email: string, purpose: OtpPurpose, options: { skipIfCoolingDown?: boolean } = {}): Promise<SendOtpResult> {
        const existing = await otpRepository.find(email, purpose);
        const remaining = this.cooldownRemaining(existing);

        if (remaining > 0) {
            if (options.skipIfCoolingDown) return { sent: false, retryAfterSeconds: remaining };
            throw otpResendCooldown(remaining);
        }

        const code = generateOTP();
        await otpRepository.upsert({
            email,
            purpose,
            codeHash: this.hashCode(email, purpose, code),
            expiresAt: addTime(AUTH_LIMITS.otpExpiresMinutes, "minutes"),
        });

        const { subject, html } = getOtpEmail(purpose, code);

        try {
            await sendEmail(email, subject, html);
        } catch (error) {
            await otpRepository.remove(email, purpose);
            throw error;
        }

        return { sent: true, expiresInMinutes: AUTH_LIMITS.otpExpiresMinutes };
    }

    async verify(email: string, purpose: OtpPurpose, code: string): Promise<void> {
        const consumed = await otpRepository.consume({
            email,
            purpose,
            codeHash: this.hashCode(email, purpose, code),
            maxAttempts: AUTH_LIMITS.otpMaxAttempts,
        });
        if (consumed) return;

        const otp = await otpRepository.find(email, purpose);

        if (!otp || otp.expiresAt <= new Date()) {
            if (otp) await otpRepository.remove(email, purpose);
            throw otpExpired();
        }

        if (otp.attempts >= AUTH_LIMITS.otpMaxAttempts) {
            await otpRepository.remove(email, purpose);
            throw tooManyOtpAttempts();
        }

        const updated = await otpRepository.incrementAttempts(otp._id);
        const attemptsLeft = AUTH_LIMITS.otpMaxAttempts - (updated?.attempts ?? AUTH_LIMITS.otpMaxAttempts);

        if (attemptsLeft <= 0) {
            await otpRepository.remove(email, purpose);
            throw tooManyOtpAttempts();
        }

        throw invalidCode(attemptsLeft);
    }
}

export const otpService = new OtpService();
