import * as Brevo from "@getbrevo/brevo";
import logger from "../lib/logger.js";

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");

let _brevoClient = null;

const getBrevoClient = () => {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!apiKey) return null;

    if (!_brevoClient) {
        try {
            const client = new Brevo.TransactionalEmailsApi();
            client.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
            _brevoClient = client;
        } catch (err) {
            logger.error({ err: err?.message }, "[Mailer] Failed to initialise Brevo client");
            return null;
        }
    }

    return _brevoClient;
};

const getSender = () => ({
    name: process.env.SENDER_NAME?.trim() || "SalonNow",
    email: process.env.SENDER_EMAIL?.trim() || "noreply@salonnow.com",
});

const normalizeRecipients = (recipients) => {
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];
    return recipientList
        .map((recipient) => {
            if (typeof recipient === "string") {
                const email = recipient.trim().toLowerCase();
                return email ? { email } : null;
            }
            if (recipient?.email) {
                return {
                    email: recipient.email.trim().toLowerCase(),
                    ...(recipient.name ? { name: recipient.name } : {}),
                };
            }
            return null;
        })
        .filter(Boolean);
};

const htmlToText = (html = "") => html
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>(?=\s*)/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#8377;/gi, "Rs ")
    .replace(/&#8594;/gi, "->")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

export const verifyEmailService = async () => {
    try {
        const apiKey = process.env.BREVO_API_KEY?.trim();
        const sender = getSender();

        if (!apiKey) {
            logger.warn({ senderEmail: sender.email }, "[Mailer] BREVO_API_KEY is not set - transactional emails will be skipped");
            return { configured: false };
        }

        if (!apiKey.startsWith("xkeysib-")) {
            logger.warn({ senderEmail: sender.email }, "[Mailer] BREVO_API_KEY should be a Brevo REST API v3 key");
        }

        const client = getBrevoClient();
        if (!client) {
            logger.warn("[Mailer] Brevo client could not be initialised");
            return { configured: false };
        }

        logger.info({ senderEmail: sender.email }, "[Mailer] Brevo REST API email service configured");
        return { configured: true };
    } catch (err) {
        logger.error({ err: err?.message }, "[Mailer] Unexpected error during email service verification");
        return { configured: false };
    }
};

export const sendBrevoEmail = async ({ to, subject, html, text, cc, bcc, replyTo, attachments } = {}) => {
    try {
        const client = getBrevoClient();
        if (!client) {
            logger.warn({ subject }, "[Mailer] BREVO_API_KEY is not configured - email skipped");
            return { success: false, error: "Email service not configured" };
        }

        const normalizedTo = normalizeRecipients(to);
        if (normalizedTo.length === 0) {
            logger.error({ subject }, "[Mailer] Email skipped - recipient address is empty");
            return { success: false, error: "Recipient email is required" };
        }

        const message = new Brevo.SendSmtpEmail();
        message.sender = getSender();
        message.to = normalizedTo;
        message.subject = subject;
        message.htmlContent = html;
        message.textContent = text || htmlToText(html);

        if (cc) message.cc = normalizeRecipients(cc);
        if (bcc) message.bcc = normalizeRecipients(bcc);

        const replyToAddr = replyTo || process.env.EMAIL_REPLY_TO?.trim();
        if (replyToAddr) message.replyTo = { email: replyToAddr };
        if (attachments) message.attachment = attachments;

        const response = await client.sendTransacEmail(message);
        const info = response?.body || response || {};
        const messageId = info.messageId || info.message_id;

        logger.info({ subject, messageId }, "[Mailer] Email accepted by Brevo REST API");
        return { success: true, id: messageId, info: { messageId } };
    } catch (error) {
        const code = error?.response?.statusCode || error?.statusCode || error?.code;
        const msg = error?.response?.body?.message || error?.message;
        logger.error({ subject, code, err: msg }, "[Mailer] Brevo REST API error");
        return { success: false, error: "Email delivery failed" };
    }
};

export const sendEmail = sendBrevoEmail;

export const sendTemplateEmail = (to, subject, htmlContent, textContent) => sendBrevoEmail({
    to,
    subject,
    html: htmlContent,
    text: textContent,
});

const COLORS = {
    header: "#1A1A1A",
    text: "#1A1A1A",
    body: "#4C5358",
    warm: "#F9F8F6",
    gold: "#C59B27",
    muted: "#7C8388",
    border: "#EAE8E3",
    success: "#237443",
    danger: "#A34B4B",
    pending: "#9A6A20",
    page: "#F1F2F0",
};

const ICON_PATHS = {
    check: '<path d="M5 12.5 9.2 17 19 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    receipt: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M7 3.5v4M17 3.5v4M4 9.5h16"/>',
    scissors: '<circle cx="7" cy="8" r="2.2"/><circle cx="7" cy="16" r="2.2"/><path d="m9 9.5 9 7M9 14.5l9-7"/>',
    card: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 9.5h16M7 14h4"/>',
    person: '<circle cx="12" cy="8" r="3"/><path d="M5.5 20c.7-3.5 2.8-5.2 6.5-5.2s5.8 1.7 6.5 5.2"/>',
    store: '<path d="M4 10v9.5h16V10M3 10l2-5h14l2 5M8 19.5v-5h8v5M3 10c0 1.5 1 2.5 2.5 2.5S8 11.5 8 10c0 1.5 1 2.5 2.5 2.5S13 11.5 13 10c0 1.5 1 2.5 2.5 2.5S18 11.5 18 10c0 1.5 1 2.5 2 2.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18"/>',
    shield: '<path d="M12 3.5 19 6v5.2c0 4.2-2.6 7.5-7 9.3-4.4-1.8-7-5.1-7-9.3V6z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/>',
    support: '<path d="M5 13v-1a7 7 0 0 1 14 0v1"/><path d="M5 13H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2v-4M19 13h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2v-4M17 18c-.8 1.3-2.1 2-4 2"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
};

const CATEGORY_ICONS = {
    "booking confirmation": "check",
    "booking pending": "clock",
    "appointment cancelled": "close",
    "payment receipt": "receipt",
    "owner payment notification": "receipt",
    "new booking request": "calendar",
    "account notification": "shield",
    "booking update": "clock",
    "listing update": "store",
    "profile update": "person",
    "management update": "settings",
    "email verification": "shield",
    "email configuration test": "check",
    "welcome to salonnow": "check",
};

const SOCIAL_LINKS = [
    { type: "instagram", title: "Instagram", href: process.env.INSTAGRAM_URL || "https://www.instagram.com/aaditya_raj_2310" },
    { type: "youtube", title: "YouTube", href: process.env.YOUTUBE_URL || "https://www.youtube.com/" },
    { type: "x", title: "X", href: process.env.X_URL || "https://x.com/Aaditya_raj_70" },
];

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const displayValue = (value, fallback = "Not provided") => {
    const normalized = value === null || value === undefined ? "" : String(value).trim();
    return normalized || fallback;
};

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";

const displayServices = (services) => {
    if (Array.isArray(services)) {
        const items = services.map((service) => displayValue(service, "")).filter(Boolean);
        return items.length ? items.join(", ") : "Salon services";
    }
    return displayValue(services, "Salon services");
};

const getInitials = (value) => displayValue(value, "SN")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const renderIcon = (name, color = COLORS.gold, size = 16, circle = false) => {
    const path = ICON_PATHS[name] || ICON_PATHS.dot;
    const circleMarkup = circle ? `<circle cx="12" cy="12" r="10" stroke="${color}" fill="none"/>` : "";
    return `<span aria-hidden="true" style="display:inline-block;width:${size}px;height:${size}px;line-height:0;vertical-align:middle;margin-right:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${escapeHtml(name)} icon" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${circleMarkup}${path}</svg></span>`;
};

const getFieldIcon = (label) => {
    const value = String(label || "").toLowerCase();
    if (value.includes("amount") || value.includes("payment")) return "receipt";
    if (value.includes("reference") || value.includes("brevo")) return "card";
    if (value.includes("appointment") || value.includes("date") || value.includes("time")) return "calendar";
    if (value.includes("salon") || value.includes("category") || value.includes("shop")) return "store";
    if (value.includes("security") || value.includes("verification")) return "shield";
    if (value.includes("profile") || value.includes("recipient") || value.includes("sender") || value.includes("customer")) return "person";
    if (value.includes("action") || value.includes("management")) return "settings";
    return "receipt";
};

const safeHref = (href) => {
    const value = String(href || "");
    return /^(https?:\/\/|mailto:)/i.test(value) ? value : "#";
};

const renderSocialIcon = (type, href, title) => {
    const paths = {
        instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
        youtube: '<rect x="3" y="5.5" width="18" height="13" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"/>',
        x: '<path d="M5 4.5 19 19.5M19 4.5 5 19.5"/>',
    };
    return `<a href="${escapeHtml(safeHref(href))}" title="${escapeHtml(title)}" style="display:inline-block;margin:0 6px;color:${COLORS.text};text-decoration:none;line-height:0;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" role="img" aria-label="${escapeHtml(title)}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[type] || paths.x}</svg></a>`;
};

const renderAppBadge = (type) => {
    const isApple = type === "apple";
    const href = safeHref(isApple ? process.env.APP_STORE_URL : process.env.GOOGLE_PLAY_URL);
    const icon = isApple
        ? '<path d="M10.8 7.8c-.1-1.2.5-2.2 1.6-2.8.1 1.1-.3 2.2-1.6 2.8ZM12.4 8.8c.8 0 1.7-.8 2.6-.8.9 0 1.7.5 2.2 1.2-1.1.7-1.3 2.5-.2 3.4-.3.8-.7 1.6-1.3 2.4-.6.8-1.2 1.7-2.2 1.7-.9 0-1.2-.6-2.2-.6-1 0-1.3.6-2.2.6-1 0-1.7-.9-2.3-1.7-1.3-1.8-2.3-5-.9-6.6.7-.8 1.7-1.2 2.6-1.2 1 0 1.8.8 2.3.8Z" fill="currentColor" stroke="none"/>'
        : '<path d="m6 4 10 8-10 8z" fill="#36A853" stroke="none"/><path d="m6 4 6 8-6 8z" fill="#4285F4" stroke="none"/><path d="m6 4 10 8-4 0z" fill="#FBBC04" stroke="none"/><path d="m6 20 6-8 4 0z" fill="#EA4335" stroke="none"/>';
    const title = isApple ? "Download on the App Store" : "Get it on Google Play";
    const label = isApple ? "App Store" : "Google Play";
    return `<a href="${escapeHtml(href)}" title="${title}" style="display:inline-block;margin:4px;vertical-align:middle;text-decoration:none;"><svg xmlns="http://www.w3.org/2000/svg" width="110" height="34" viewBox="0 0 78 24" role="img" aria-label="${title}"><rect width="78" height="24" rx="4" fill="#111111"/><g transform="translate(5 4)" fill="#ffffff">${icon}</g><text x="22" y="9" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="4">${isApple ? "Download on the" : "GET IT ON"}</text><text x="22" y="17" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="8" font-weight="700">${label}</text></svg></a>`;
};

const supportEmail = () => process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_REPLY_TO?.trim() || "support@salonnow.in";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateTime = (value) => {
    if (!hasValue(value)) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDateObject(value);

    const source = String(value).trim();
    const normalized = source.replace(/\s+at\s+/i, " ").replace(/\s+/g, " ");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime()) || !/\d{4}/.test(normalized)) return source;
    return formatDateObject(parsed);
};

const formatDateObject = (value) => {
    const hours = value.getHours();
    const minutes = String(value.getMinutes()).padStart(2, "0");
    const meridiem = hours >= 12 ? "PM" : "AM";
    const twelveHour = String(hours % 12 || 12).padStart(2, "0");
    return `${value.getDate()} ${MONTHS[value.getMonth()]} ${value.getFullYear()}, ${twelveHour}:${minutes} ${meridiem}`;
};

const renderDetailCard = (rows = []) => {
    const safeRows = rows
        .filter((row) => row && hasValue(row.value))
        .map((row) => ({
            label: displayValue(row.label, "Details"),
            value: displayValue(row.value),
            emphasis: Boolean(row.emphasis),
            icon: getFieldIcon(row.label),
        }));

    if (!safeRows.length) return { html: "", lines: [] };

    return {
        html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${COLORS.warm};border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;margin:24px 0;">
            ${safeRows.map((row, index) => `<tr${index < safeRows.length - 1 ? ` style="border-bottom:1px solid ${COLORS.border};"` : ""}>
                <td style="padding:14px 16px;color:${COLORS.muted};font-size:12px;font-weight:500;line-height:1.45;letter-spacing:1px;text-transform:uppercase;vertical-align:top;width:40\%;">${renderIcon(row.icon, COLORS.gold, 16)}<span style="vertical-align:middle;">${escapeHtml(row.label)}</span></td>
                <td style="padding:14px 16px;color:${row.emphasis ? COLORS.text : COLORS.body};font-size:${row.emphasis ? "16px" : "14px"};font-weight:${row.emphasis ? "700" : "600"};line-height:1.5;text-align:right;word-break:break-word;">${escapeHtml(row.value)}</td>
            </tr>`).join("")}
        </table>`,
        lines: safeRows.map((row) => `${row.label}: ${row.value}`),
    };
};

const renderBookingPanel = ({
    bookingReference,
    bookingTime,
    salonName,
    salonAddress,
    stylist,
    services,
    price,
    customerName,
    status,
    statusColor = COLORS.pending,
    actionTime = new Date(),
    actionLabel = "Activity time",
}) => {
    const safeSalonName = displayValue(salonName, "Salon");
    const hasAppointmentDetails = hasValue(bookingTime) || hasValue(stylist) || hasValue(services);
    const serviceText = hasValue(services) ? displayServices(services) : "";
    const bookingStatus = hasValue(status) ? displayValue(status) : "";
    const appointmentValue = hasValue(bookingTime) ? formatDateTime(bookingTime) : "";
    const hasTotal = hasValue(price);
    const hasBookingReference = hasValue(bookingReference);
    const hasCustomer = hasValue(customerName);
    const formattedActionTime = hasValue(actionTime) ? formatDateTime(actionTime) : "";

    return {
        html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;margin:24px 0;">
          ${(hasBookingReference || formattedActionTime) ? `<tr style="background:${COLORS.warm};border-bottom:1px solid ${COLORS.border};"><td style="padding:14px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
            ${hasBookingReference ? `<td valign="top"><p style="margin:0 0 4px;color:${COLORS.muted};font-size:11px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">${renderIcon("receipt", COLORS.gold, 16)}<span style="vertical-align:middle;">Booking reference</span></p><p style="margin:0;color:${COLORS.text};font-size:15px;font-weight:700;word-break:break-word;">${escapeHtml(displayValue(bookingReference))}</p></td>` : ""}
            ${formattedActionTime ? `<td align="${hasBookingReference ? "right" : "left"}" valign="top" style="${hasBookingReference ? "padding-left:12px;" : ""}"><p style="margin:0 0 4px;color:${COLORS.muted};font-size:11px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">${renderIcon("clock", COLORS.gold, 14)}<span style="vertical-align:middle;">${escapeHtml(actionLabel)}</span></p><p style="margin:0;color:${COLORS.text};font-size:13px;font-weight:600;">${escapeHtml(formattedActionTime)}</p></td>` : ""}
          </tr></table></td></tr>` : ""}
          <tr><td style="padding:20px 16px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
            <td width="48" valign="top"><span style="display:inline-block;width:40px;height:40px;border-radius:50%;background:${COLORS.header};color:#ffffff;font-size:15px;line-height:40px;text-align:center;font-weight:700;">${escapeHtml(getInitials(safeSalonName))}</span></td>
            <td valign="top" style="padding-left:12px;"><p style="margin:0;color:${COLORS.text};font-size:16px;font-weight:700;line-height:1.35;">${escapeHtml(safeSalonName)}</p>${hasValue(salonAddress) ? `<p style="margin:4px 0 0;color:${COLORS.muted};font-size:12px;line-height:1.5;">${renderIcon("store", COLORS.muted, 14)}<span style="vertical-align:middle;">${escapeHtml(displayValue(salonAddress))}</span></p>` : ""}</td>
            ${bookingStatus ? `<td align="right" valign="top" style="padding-left:8px;"><span style="display:inline-block;padding:4px 10px;border:1px solid ${statusColor};border-radius:20px;color:${statusColor};font-size:11px;font-weight:700;">${escapeHtml(bookingStatus)}</span></td>` : ""}
          </tr></table></td></tr>
          ${hasCustomer ? `<tr><td style="padding:14px 16px;border-top:1px solid ${COLORS.border};"><p style="margin:0 0 4px;color:${COLORS.muted};font-size:11px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">${renderIcon("person", COLORS.gold, 16)}<span style="vertical-align:middle;">Customer</span></p><p style="margin:0;color:${COLORS.text};font-size:14px;font-weight:700;word-break:break-word;">${escapeHtml(displayValue(customerName))}</p></td></tr>` : ""}
          ${hasAppointmentDetails ? `<tr><td style="padding:16px;border-top:1px solid ${COLORS.border};"><p style="margin:0 0 12px;color:${COLORS.text};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Appointment details</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
            ${appointmentValue ? `<td class="sn-stack-cell" width="50%" valign="top" style="padding-right:12px;${serviceText || hasValue(stylist) ? `border-right:1px solid ${COLORS.border};` : ""}"><p style="margin:0 0 6px;color:${COLORS.muted};font-size:12px;font-weight:500;">${renderIcon("calendar", COLORS.gold, 16)}<span style="vertical-align:middle;">Appointment Slot</span></p><p style="margin:0;color:${COLORS.body};font-size:14px;font-weight:600;line-height:1.55;word-break:break-word;">${escapeHtml(appointmentValue)}</p></td>` : ""}
            ${(serviceText || hasValue(stylist)) ? `<td class="sn-stack-cell" valign="top" style="padding-left:${appointmentValue ? "12px" : "0"};"><p style="margin:0 0 6px;color:${COLORS.muted};font-size:12px;font-weight:500;">${renderIcon("scissors", COLORS.gold, 16)}<span style="vertical-align:middle;">Service</span></p>${serviceText ? `<p style="margin:0;color:${COLORS.body};font-size:14px;font-weight:600;line-height:1.55;word-break:break-word;">${escapeHtml(serviceText)}</p>` : ""}${hasValue(stylist) ? `<p style="margin:6px 0 0;color:${COLORS.muted};font-size:12px;line-height:1.5;">Stylist: <span style="color:${COLORS.body};font-weight:600;">${escapeHtml(displayValue(stylist))}</span></p>` : ""}</td>` : ""}
          </tr></table></td></tr>` : ""}
          ${hasTotal ? `<tr><td style="padding:16px;background:${COLORS.warm};border-top:1px solid${COLORS.border};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="color:${COLORS.text};font-size:13px;font-weight:700;">Total amount</td><td align="right" style="color:${COLORS.text};font-size:18px;font-weight:700;">&#8377;${escapeHtml(displayValue(price, "0"))}</td></tr></table></td></tr>` : ""}
        </table>`,
        lines: [
            ...(hasBookingReference ? [`Booking reference: ${displayValue(bookingReference)}`] : []),
            ...(formattedActionTime ? [`${actionLabel}: ${formattedActionTime}`] : []),
            `Salon: ${safeSalonName}`,
            ...(hasCustomer ? [`Customer: ${displayValue(customerName)}`] : []),
            ...(appointmentValue ? [`Appointment Slot: ${appointmentValue}`] : []),
            ...(serviceText ? [`Service: ${serviceText}`] : []),
            ...(hasValue(stylist) ? [`Stylist: ${displayValue(stylist)}`] : []),
            ...(bookingStatus ? [`Status: ${bookingStatus}`] : []),
            ...(hasTotal ? [`Total amount: Rs ${displayValue(price, "0")}`] : []),
        ],
    };
};

const renderSupportLine = () => {
    const email = supportEmail();
    const contact = `<a href="mailto:${escapeHtml(email)}" style="color:${COLORS.gold};text-decoration:underline;font-weight:600;">Contact us</a>`;
    return {
        html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:26px 0 4px;"><tr><td width="28" valign="top">${renderIcon("support", COLORS.header, 18)}</td><td style="color:${COLORS.muted};font-size:13px;line-height:1.6;">Need help? Our support team is here for you. ${contact}</td></tr></table>`,
        text: `Need help? Our support team is here for you. Contact us at ${email}.`,
    };
};

const renderPaymentCard = ({ shopName, bookingTime, amount, paymentId, paidAt }) => {
    const paymentTimestamp = formatDateTime(paidAt || new Date());
    const cells = [
        { label: "Amount paid", value: amount, textValue: hasValue(amount) ? `Rs ${displayValue(amount, "0")}` : "", emphasis: true, currency: true, icon: "receipt" },
        { label: "Payment reference", value: paymentId, textValue: paymentId, icon: "card" },
        { label: "Salon", value: shopName, textValue: shopName, icon: "store" },
        { label: "Appointment Slot", value: hasValue(bookingTime) ? formatDateTime(bookingTime) : "", textValue: hasValue(bookingTime) ? formatDateTime(bookingTime) : "", icon: "calendar" },
        { label: "Payment time", value: paymentTimestamp, textValue: paymentTimestamp, icon: "clock" },
    ].filter((cell) => hasValue(cell.value));
    const rows = [];

    for (let index = 0; index < cells.length; index += 2) {
        const left = cells[index];
        const right = cells[index + 1];
        const leftValue = left.currency ? `&#8377;${escapeHtml(displayValue(left.value, "0"))}` : escapeHtml(displayValue(left.value));
        const rightValue = right ? (right.currency ? `&#8377;${escapeHtml(displayValue(right.value, "0"))}` : escapeHtml(displayValue(right.value))) : "";
        rows.push(`<tr${index + 2 < cells.length ? ` style="border-bottom:1px solid ${COLORS.border};"` : ""}><td class="sn-stack-cell" width="50%" valign="top" style="padding:16px;${right ? `border-right:1px solid ${COLORS.border};` : ""}"><p style="margin:0 0 6px;color:${COLORS.muted};font-size:12px;font-weight:500;line-height:1.4;">${renderIcon(left.icon, COLORS.gold, 16)}<span style="vertical-align:middle;">${escapeHtml(left.label)}</span></p><p style="margin:0;color:${left.emphasis ? COLORS.text : COLORS.body};font-size:${left.emphasis ? "20px" : "14px"};font-weight:${left.emphasis ? "700" : "600"};line-height:1.5;word-break:break-word;">${leftValue}</p></td>${right ? `<td class="sn-stack-cell" width="50%" valign="top" style="padding:16px;"><p style="margin:0 0 6px;color:${COLORS.muted};font-size:12px;font-weight:500;line-height:1.4;">${renderIcon(right.icon, COLORS.gold, 16)}<span style="vertical-align:middle;">${escapeHtml(right.label)}</span></p><p style="margin:0;color:${right.emphasis ? COLORS.text : COLORS.body};font-size:${right.emphasis ? "20px" : "14px"};font-weight:${right.emphasis ? "700" : "600"};line-height:1.5;word-break:break-word;">${rightValue}</p></td>` : ""}</tr>`);
    }

    return {
        cardHtml: cells.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${COLORS.warm};border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;margin:24px 0;">${rows.join("")}</table>` : "",
        cardLines: cells.map((cell) => `${cell.label}: ${cell.textValue || displayValue(cell.value)}`),
    };
};

const renderEmail = ({ preheader, category, icon = "dot", heading, greeting, paragraphs = [], rows = [], booking, payment, notice, code, cta, accent = COLORS.gold }) => {
    const safeHeading = displayValue(heading, "SalonNow");
    const safePreheader = displayValue(preheader, safeHeading);
    const safeCategory = displayValue(category, "SalonNow");
    const categoryKey = safeCategory.toLowerCase();
    const iconName = ICON_PATHS[icon] ? icon : CATEGORY_ICONS[categoryKey] || "dot";
    const safeGreeting = hasValue(greeting) ? displayValue(greeting) : "";
    const safeParagraphs = paragraphs.map((paragraph) => displayValue(paragraph, "")).filter(Boolean);
    const safeNotice = notice && hasValue(notice.text) ? { label: displayValue(notice.label, "Update"), text: displayValue(notice.text), color: notice.color || accent } : null;
    const safeCode = code === undefined || code === null ? "" : String(code);
    const safeCta = cta ? { label: displayValue(cta.label, "Open SalonNow"), href: safeHref(cta.href) } : null;
    const detailCard = renderDetailCard(rows);
    const support = renderSupportLine();
    const noticeHtml = safeNotice ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0;"><tr><td style="border-left:4px solid ${safeNotice.color};background:${COLORS.warm};padding:14px 16px;border-radius:0 8px 8px 0;"><p style="margin:0 0 4px;color:${safeNotice.color};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(safeNotice.label)}</p><p style="margin:0;color:${COLORS.body};font-size:14px;line-height:1.6;">${escapeHtml(safeNotice.text)}</p></td></tr></table>` : "";
    const codeHtml = safeCode ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0;"><tr><td align="center" style="background:${COLORS.warm};border:1px dashed ${accent};border-radius:8px;padding:20px 12px;"><p style="margin:0 0 8px;color:${COLORS.muted};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Your verification code</p><p style="margin:0;color:${COLORS.text};font-size:32px;font-weight:700;letter-spacing:8px;line-height:1.2;">${escapeHtml(safeCode)}</p></td></tr></table>` : "";
    const ctaHtml = safeCta ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:28px 0 12px;"><tr><td align="center"><a href="${escapeHtml(safeCta.href)}" style="display:inline-block;padding:14px 28px;background:${accent};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(safeCta.label)}</a></td></tr></table>` : "";

    const bookingHtml = booking ? booking.html : "";
    const paymentHtml = payment ? payment.cardHtml : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(safeHeading)}</title>
<style>
  body { margin:0; padding:0; background-color:${COLORS.page}; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:${COLORS.text}; -webkit-font-smoothing:antialiased; }
  table { border-collapse:collapse; }
  @media only screen and (max-width: 600px) {
    .email-container { width:100% !important; padding:12px !important; }
    .sn-stack-cell { display:block !important; width:100% !important; padding:12px 0 !important; border-right:none !important; border-bottom:1px solid ${COLORS.border} !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;font-size:1px;color:${COLORS.page};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(safePreheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:${COLORS.page};padding:24px 0;">
<tr>
<td align="center">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#ffffff;border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
<!-- Header Bar -->
<tr>
<td style="background:${COLORS.header};padding:18px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>
<td><span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Salon<span style="color:${COLORS.gold};">Now</span></span></td>
<td align="right"><span style="font-size:11px;font-weight:700;color:${COLORS.gold};letter-spacing:1px;text-transform:uppercase;">HAIR / BEAUTY / WELLNESS</span></td>
</tr>
</table>
</td>
</tr>
<!-- Content Body -->
<tr>
<td style="padding:36px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>
<td>
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
<tr>
<td width="28" valign="middle">${renderIcon(iconName, accent, 20, true)}</td>
<td style="padding-left:6px;font-size:11px;font-weight:700;color:${COLORS.muted};letter-spacing:1px;text-transform:uppercase;">${escapeHtml(safeCategory)}</td>
</tr>
</table>
<h1 style="margin:0 0 16px;font-size:26px;font-weight:700;line-height:1.3;color:${COLORS.text};">${escapeHtml(safeHeading)}</h1>
${safeGreeting ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${COLORS.body};">${escapeHtml(safeGreeting)},</p>` : ""}
${safeParagraphs.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.body};">${escapeHtml(p)}</p>`).join("")}
${noticeHtml}
${codeHtml}
${bookingHtml}
${paymentHtml}
${detailCard.html}
${ctaHtml}
${support.html}
<p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:${COLORS.body};">Best regards,<br><strong style="color:${COLORS.text};">The SalonNow Team</strong></p>
</td>
</tr>
</table>
</td>
</tr>
<!-- Footer -->
<tr>
<td style="background:#F5F4F0;padding:24px;border-top:1px solid ${COLORS.border};text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>
<td align="center" style="padding-bottom:12px;">
<span style="font-size:16px;font-weight:700;color:${COLORS.text};">Salon<span style="color:${COLORS.gold};">Now</span></span>
<p style="margin:4px 0 0;font-size:12px;color:${COLORS.muted};font-style:italic;">Look good. Feel better.</p>
</td>
</tr>
<tr>
<td align="center" style="padding-bottom:16px;">
${renderSocialIcon(SOCIAL_LINKS[0].type, SOCIAL_LINKS[0].href, SOCIAL_LINKS[0].title)}
${renderSocialIcon(SOCIAL_LINKS[1].type, SOCIAL_LINKS[1].href, SOCIAL_LINKS[1].title)}
${renderSocialIcon(SOCIAL_LINKS[2].type, SOCIAL_LINKS[2].href, SOCIAL_LINKS[2].title)}
</td>
</tr>
<tr>
<td align="center" style="font-size:11px;color:${COLORS.muted};line-height:1.5;">
<p style="margin:0 0 8px;">&copy; ${new Date().getFullYear()} SalonNow Technologies Inc. All rights reserved.</p>
<p style="margin:0;"><a href="${escapeHtml(FRONTEND_URL())}/privacy" style="color:${COLORS.muted};text-decoration:underline;">Privacy Policy</a> &bull; <a href="${escapeHtml(FRONTEND_URL())}/terms" style="color:${COLORS.muted};text-decoration:underline;">Terms of Service</a></p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

// ==========================================
// 14 EXPORTED EMAIL TEMPLATES
// ==========================================

export const ownerPaidBooking = (email, ownerName, customerName, shopName, bookingTime, amount, paymentId, paidAt) => {
    const payment = renderPaymentCard({ shopName, bookingTime, amount, paymentId, paidAt: paidAt || new Date() });
    const html = renderEmail({
        preheader: `Payment recorded of ₹${amount} for ${shopName}`,
        category: "Owner Payment Notification",
        icon: "receipt",
        heading: "Payment recorded for a booking.",
        greeting: `Hello ${ownerName}`,
        paragraphs: [
            `A payment has been successfully recorded for your salon ${shopName} from customer ${customerName}.`,
        ],
        payment,
        cta: { label: "View Dashboard", href: `${FRONTEND_URL()}/salon/dashboard` },
    });
    return sendTemplateEmail(email, `Payment Received: ₹${amount} - ${shopName}`, html);
};

export const bookingConfirmation = (email, customerName, salonName, bookingTime, bookingReference, services, amount, confirmedAt) => {
    const booking = renderBookingPanel({
        bookingReference,
        bookingTime,
        salonName,
        services,
        price: amount,
        customerName,
        status: "Confirmed",
        statusColor: COLORS.success,
        actionTime: confirmedAt || new Date(),
        actionLabel: "Confirmed on",
    });
    const html = renderEmail({
        preheader: `Your booking at ${salonName} is confirmed`,
        category: "Booking Confirmation",
        icon: "check",
        heading: "Booking Confirmed!",
        greeting: `Hi ${customerName}`,
        paragraphs: [
            `Your appointment at ${salonName} has been successfully confirmed. We look forward to seeing you.`,
        ],
        booking,
        cta: { label: "View Booking Details", href: `${FRONTEND_URL()}/bookings` },
    });
    return sendTemplateEmail(email, `Booking Confirmed at ${salonName}`, html);
};

export const bookingPending = (email, customerName, salonName, bookingTime, bookingReference, requestedAt) => {
    const booking = renderBookingPanel({
        bookingReference,
        bookingTime,
        salonName,
        customerName,
        status: "Pending Approval",
        statusColor: COLORS.pending,
        actionTime: requestedAt || new Date(),
        actionLabel: "Requested on",
    });
    const html = renderEmail({
        preheader: `Your booking request at ${salonName} is pending`,
        category: "Booking Pending",
        icon: "clock",
        heading: "Booking Request Pending",
        greeting: `Hi ${customerName}`,
        paragraphs: [
            `We have received your booking request for ${salonName}. The salon will review and confirm your appointment shortly.`,
        ],
        booking,
        cta: { label: "Check Status", href: `${FRONTEND_URL()}/bookings` },
    });
    return sendTemplateEmail(email, `Booking Pending at ${salonName}`, html);
};

export const appointmentCancelled = (email, customerName, salonName, bookingTime, bookingReference, reason, cancelledAt) => {
    const booking = renderBookingPanel({
        bookingReference,
        bookingTime,
        salonName,
        customerName,
        status: "Cancelled",
        statusColor: COLORS.danger,
        actionTime: cancelledAt || new Date(),
        actionLabel: "Cancelled on",
    });
    const html = renderEmail({
        preheader: `Your appointment at ${salonName} was cancelled`,
        category: "Appointment Cancelled",
        icon: "close",
        heading: "Appointment Cancelled",
        greeting: `Hi ${customerName}`,
        paragraphs: [
            `Your appointment at ${salonName} scheduled for ${formatDateTime(bookingTime)} has been cancelled.`,
            hasValue(reason) ? `Reason provided: ${reason}` : "",
        ].filter(Boolean),
        booking,
        cta: { label: "Book Again", href: `${FRONTEND_URL()}/home` },
    });
    return sendTemplateEmail(email, `Appointment Cancelled - ${salonName}`, html);
};

export const paymentReceipt = (
    email,
    customerName,
    salonName,
    bookingTimeOrAmount,
    amountOrPaymentId,
    paymentIdOrBookingRef,
    bookingReference
) => {
    let bookingTime = null;
    let amount = null;
    let paymentId = null;
    let bookingRef = null;

    // Detect if called with 7 arguments: (email, customerName, salonName, bookingTime, amount, paymentId, bookingReference)
    if (bookingReference !== undefined) {
        bookingTime = bookingTimeOrAmount;
        amount = amountOrPaymentId;
        paymentId = paymentIdOrBookingRef;
        bookingRef = bookingReference;
    } else {
        // 6 arguments passed:
        // Check if 4th parameter is date-like (contains 'at', '-', ':', 'AM', 'PM', or is a Date)
        const isDateLike = (val) => {
            if (!val) return false;
            if (val instanceof Date) return true;
            const s = String(val).trim();
            return s.includes(" at ") || s.includes("T") || s.includes("AM") || s.includes("PM") || (s.includes("-") && s.length >= 8);
        };

        if (isDateLike(bookingTimeOrAmount)) {
            // (email, customerName, salonName, bookingTime, amount, paymentId)
            bookingTime = bookingTimeOrAmount;
            amount = amountOrPaymentId;
            paymentId = paymentIdOrBookingRef;
        } else {
            // Original signature: (email, customerName, salonName, amount, paymentId, bookingReference)
            amount = bookingTimeOrAmount;
            paymentId = amountOrPaymentId;
            bookingRef = paymentIdOrBookingRef;
        }
    }

    // Safety corrections:
    // If paymentId is a number and amount is a string (e.g. 'pay_...'), swap them
    if (typeof amount === "string" && amount.startsWith("pay_") && (!isNaN(Number(paymentId)) || typeof paymentId === "number")) {
        const temp = amount;
        amount = paymentId;
        paymentId = temp;
    }

    // If bookingRef starts with 'pay_', it was mistakenly passed the payment ID
    if (typeof bookingRef === "string" && bookingRef.startsWith("pay_")) {
        if (!paymentId) paymentId = bookingRef;
        bookingRef = null;
    }

    const payment = renderPaymentCard({
        shopName: salonName,
        bookingTime,
        amount,
        paymentId,
        paidAt: new Date(),
    });

    const rows = [
        { label: "Payment time", value: formatDateTime(new Date()) },
    ];
    if (hasValue(bookingRef)) {
        rows.unshift({ label: "Booking reference", value: bookingRef });
    }

    const ctaHref = `${FRONTEND_URL()}/bookings`;

    const html = renderEmail({
        preheader: `Payment receipt for your visit to ${salonName}`,
        category: "Payment Receipt",
        icon: "receipt",
        heading: "Payment Receipt",
        greeting: `Hi ${customerName}`,
        paragraphs: [
            `Thank you for your payment. Here is the receipt for your transaction at ${salonName}.`,
        ],
        payment,
        rows,
        cta: { label: "View Booking", href: ctaHref },
    });
    return sendTemplateEmail(email, `Payment Receipt - ${salonName}`, html);
};

export const newBookingRequest = (email, ownerName, customerName, salonName, bookingTime, services, bookingReference, requestedAt) => {
    const booking = renderBookingPanel({
        bookingReference,
        bookingTime,
        salonName,
        services,
        customerName,
        status: "Action Required",
        statusColor: COLORS.gold,
        actionTime: requestedAt || new Date(),
        actionLabel: "Received on",
    });
    const html = renderEmail({
        preheader: `New booking request from ${customerName} at ${salonName}`,
        category: "New Booking Request",
        icon: "calendar",
        heading: "New Booking Request",
        greeting: `Hello ${ownerName}`,
        paragraphs: [
            `You have received a new booking request from ${customerName} for ${salonName}. Please review and respond to this request.`,
        ],
        booking,
        cta: { label: "Manage Booking", href: `${FRONTEND_URL()}/salon/dashboard` },
    });
    return sendTemplateEmail(email, `New Booking Request - ${salonName}`, html);
};

export const accountNotification = (email, userName, actionDescription, timestamp) => {
    const html = renderEmail({
        preheader: `Security update regarding your SalonNow account`,
        category: "Account Notification",
        icon: "shield",
        heading: "Account Security Update",
        greeting: `Hello ${userName}`,
        paragraphs: [
            `We wanted to let you know about a recent activity on your SalonNow account:`,
            actionDescription,
        ],
        rows: [
            { label: "Activity time", value: formatDateTime(timestamp || new Date()) },
        ],
        cta: { label: "Review Account", href: `${FRONTEND_URL()}/profile` },
    });
    return sendTemplateEmail(email, `SalonNow Account Notification`, html);
};

export const bookingUpdate = (email, customerName, salonName, oldBookingTime, newBookingTime, bookingReference, rescheduledAt) => {
    const booking = renderBookingPanel({
        bookingReference,
        bookingTime: newBookingTime,
        salonName,
        customerName,
        status: "Rescheduled",
        statusColor: COLORS.gold,
        actionTime: rescheduledAt || new Date(),
        actionLabel: "Rescheduled on",
    });
    const html = renderEmail({
        preheader: `Your appointment at ${salonName} has been rescheduled`,
        category: "Booking Update",
        icon: "clock",
        heading: "Appointment Rescheduled",
        greeting: `Hi ${customerName}`,
        paragraphs: [
            `Your appointment at ${salonName} has been updated from ${formatDateTime(oldBookingTime)} to the new time below.`,
        ],
        booking,
        cta: { label: "View Details", href: `${FRONTEND_URL()}/bookings` },
    });
    return sendTemplateEmail(email, `Appointment Updated - ${salonName}`, html);
};

export const listingUpdate = (email, ownerName, shopName, updateDetails, updatedAt) => {
    const html = renderEmail({
        preheader: `Listing update for ${shopName}`,
        category: "Listing Update",
        icon: "store",
        heading: "Listing Updated Successfully",
        greeting: `Hello ${ownerName}`,
        paragraphs: [
            `Your salon listing for ${shopName} has been successfully updated with the following details:`,
            updateDetails,
        ],
        rows: [
            { label: "Updated on", value: formatDateTime(updatedAt || new Date()) },
        ],
        cta: { label: "View Listing", href: `${FRONTEND_URL()}/salon/manage` },
    });
    return sendTemplateEmail(email, `Listing Updated: ${shopName}`, html);
};

export const profileUpdate = (email, userName, updateType, updatedAt) => {
    const html = renderEmail({
        preheader: `Your SalonNow profile has been updated`,
        category: "Profile Update",
        icon: "person",
        heading: "Profile Updated",
        greeting: `Hello ${userName}`,
        paragraphs: [
            `Your profile details (${updateType}) were successfully updated on your SalonNow account.`,
        ],
        rows: [
            { label: "Updated on", value: formatDateTime(updatedAt || new Date()) },
        ],
        cta: { label: "View Profile", href: `${FRONTEND_URL()}/profile` },
    });
    return sendTemplateEmail(email, `Profile Updated - SalonNow`, html);
};

export const managementUpdate = (email, ownerName, shopName, details, updatedAt) => {
    const html = renderEmail({
        preheader: `Management update for ${shopName}`,
        category: "Management Update",
        icon: "settings",
        heading: "Salon Management Update",
        greeting: `Hello ${ownerName}`,
        paragraphs: [
            `An administrative update has been applied to your salon ${shopName}:`,
            details,
        ],
        rows: [
            { label: "Updated on", value: formatDateTime(updatedAt || new Date()) },
        ],
        cta: { label: "Open Management Panel", href: `${FRONTEND_URL()}/salon/manage` },
    });
    return sendTemplateEmail(email, `Management Update - ${shopName}`, html);
};

export const emailVerification = (email, userName, verificationCode, requestedAt) => {
    const html = renderEmail({
        preheader: `Your SalonNow verification code is ${verificationCode}`,
        category: "Email Verification",
        icon: "shield",
        heading: "Verify Your Email Address",
        greeting: `Hello ${userName}`,
        paragraphs: [
            `Please use the verification code below to complete your registration or sign-in on SalonNow. This code is valid for 10 minutes.`,
        ],
        code: verificationCode,
        rows: [
            { label: "Requested on", value: formatDateTime(requestedAt || new Date()) },
        ],
        cta: { label: "Verify Email", href: `${FRONTEND_URL()}/verify-email` },
    });
    return sendTemplateEmail(email, `Your SalonNow Verification Code`, html);
};

export const emailConfigurationTest = (email, testRecipient) => {
    const html = renderEmail({
        preheader: `Email delivery configuration test successful`,
        category: "Email Configuration Test",
        icon: "check",
        heading: "Email Configuration Test",
        greeting: `Hello`,
        paragraphs: [
            `This is a test email dispatched to verify that your Brevo transactional mailer is correctly configured for SalonNow.`,
        ],
        rows: [
            { label: "Recipient", value: testRecipient },
            { label: "Timestamp", value: formatDateTime(new Date()) },
        ],
        cta: { label: "Go to Dashboard", href: `${FRONTEND_URL()}/home` },
    });
    return sendTemplateEmail(email, `SalonNow Email Test Successful`, html);
};

export const welcomeToSalonNow = (email, name, role = "Customer", registeredAt) => {
    const isOwner = String(role).toLowerCase().includes("owner");
    const html = renderEmail({
        preheader: `Welcome to SalonNow, ${name}!`,
        category: "Welcome to SalonNow",
        icon: "check",
        heading: `Welcome to SalonNow, ${name}!`,
        greeting: `Hi ${name}`,
        paragraphs: [
            isOwner
                ? `Thank you for registering your salon on SalonNow. You can now list your services, manage bookings, and grow your business.`
                : `Thank you for joining SalonNow. Discover and book appointments at the best hair, beauty, and wellness salons near you.`,
        ],
        rows: [
            { label: "Registered on", value: formatDateTime(registeredAt || new Date()) },
            { label: "Account type", value: isOwner ? "Salon Owner" : "Customer" },
        ],
        cta: { label: isOwner ? "Go to Owner Dashboard" : "Explore Salons", href: `${FRONTEND_URL()}/${isOwner ? "salon/dashboard" : "home"}` },
    });
    return sendTemplateEmail(email, `Welcome to SalonNow`, html);
};

// ==========================================
// ALL COMPATIBILITY EXPORT ALIASES
// ==========================================
export const sendWelcomeEmail = (email, name, role, registeredAt) => welcomeToSalonNow(email, name, role, registeredAt);
export const sendVerificationEmail = (email, userName, code, requestedAt) => emailVerification(email, userName, code, requestedAt);
export const sendLoginEmail = (email, userName, details, timestamp) => accountNotification(email, userName, details || "New login detected on your account", timestamp || new Date());
export const sendLogoutEmail = (email, userName, details, timestamp) => accountNotification(email, userName, details || "Account session ended", timestamp || new Date());
export const sendShopAddedEmail = (email, ownerName, shopName, updatedAt) => listingUpdate(email, ownerName, shopName, "Your salon has been successfully added to SalonNow.", updatedAt);
export const sendPaymentReceiptEmail = (email, customerName, salonName, bookingTimeOrAmount, amountOrPaymentId, paymentIdOrBookingRef, bookingReference, paidAt) => paymentReceipt(email, customerName, salonName, bookingTimeOrAmount, amountOrPaymentId, paymentIdOrBookingRef, bookingReference, paidAt);
export const sendOwnerPaymentNotificationEmail = (email, ownerName, customerName, shopName, bookingTime, amount, paymentId, paidAt) => ownerPaidBooking(email, ownerName, customerName, shopName, bookingTime, amount, paymentId, paidAt);
export const sendBookingConfirmationEmail = (email, customerName, salonName, bookingTime, bookingReference, services, amount, confirmedAt) => bookingConfirmation(email, customerName, salonName, bookingTime, bookingReference, services, amount, confirmedAt);
export const sendBookingPendingEmail = (email, customerName, salonName, bookingTime, bookingReference, requestedAt) => bookingPending(email, customerName, salonName, bookingTime, bookingReference, requestedAt);
export const sendAppointmentCancelledEmail = (email, customerName, salonName, bookingTime, bookingReference, reason, cancelledAt) => appointmentCancelled(email, customerName, salonName, bookingTime, bookingReference, reason, cancelledAt);
export const sendBookingUpdateEmail = (email, customerName, salonName, oldBookingTime, newBookingTime, bookingReference, rescheduledAt) => bookingUpdate(email, customerName, salonName, oldBookingTime, newBookingTime, bookingReference, rescheduledAt);
export const sendNewBookingRequestEmail = (email, ownerName, customerName, salonName, bookingTime, services, bookingReference, requestedAt) => newBookingRequest(email, ownerName, customerName, salonName, bookingTime, services, bookingReference, requestedAt);
export const sendAccountNotificationEmail = (email, userName, actionDescription, timestamp) => accountNotification(email, userName, actionDescription, timestamp);
export const sendListingUpdateEmail = (email, ownerName, shopName, updateDetails, updatedAt) => listingUpdate(email, ownerName, shopName, updateDetails, updatedAt);
export const sendProfileUpdateEmail = (email, userName, updateType, updatedAt) => profileUpdate(email, userName, updateType, updatedAt);
export const sendManagementUpdateEmail = (email, ownerName, shopName, details, updatedAt) => managementUpdate(email, ownerName, shopName, details, updatedAt);
export const sendBookingStatusEmail = (email, customerName, salonName, bookingTime, bookingReference, status, reason) => {
    const normalizedStatus = String(status || "").toLowerCase().trim();
    if (normalizedStatus === "cancelled" || normalizedStatus === "rejected") {
        return appointmentCancelled(email, customerName, salonName, bookingTime, bookingReference,
            reason || `Your appointment has been ${normalizedStatus}`);
    }
    if (normalizedStatus === "confirmed") {
        return bookingConfirmation(email, customerName, salonName, bookingTime, bookingReference, [], null);
    }
    // Generic fallback — completed, pending, or any future status
    return accountNotification(
        email, customerName,
        `Your booking at ${salonName || "the salon"} has been updated to: ${status || "unknown"}.`,
        new Date()
    );
};
export const sendOwnerNewBookingEmail = (email, ownerName, customerName, salonName, bookingTime, services, bookingReference) => newBookingRequest(email, ownerName, customerName, salonName, bookingTime, services, bookingReference);
export const testEmailConfiguration = (email, testRecipient) => emailConfigurationTest(email, testRecipient);