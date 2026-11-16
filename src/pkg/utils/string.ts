export const escapeHtml = (value: string = ""): string => {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

export const escapeRegex = (value: string = ""): string => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const maskEmail = (email: string = ""): string => {
    const [local, domain] = String(email).split("@");
    if (!domain || !local) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${"*".repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
};