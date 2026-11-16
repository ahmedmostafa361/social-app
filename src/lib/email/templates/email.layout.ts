import { env } from "../../config/env.js";
import { escapeHtml } from "../../../pkg/utils/string.js";

export const baseEmailLayout = ({ title, bodyContent }: { title: string; bodyContent: string }): string => {
    const appName = escapeHtml(env.appName);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155;">
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899); border-top-left-radius: 16px; border-top-right-radius: 16px;"></td>
          </tr>
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); padding: 10px 20px; border-radius: 30px; margin-bottom: 24px;">
                <span style="color: #818cf8; font-weight: 700; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">${appName}</span>
              </div>
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 24px 0 0 0; color: #475569; font-size: 12px;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
