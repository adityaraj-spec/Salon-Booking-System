import * as Brevo from "@getbrevo/brevo";
import logger from "../lib/logger.js";

const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

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

const getSender = () => {
    return {
        name: process.env.SENDER_NAME?.trim() || "SalonNow",
        email: process.env.SENDER_EMAIL?.trim() || "noreply@salonnow.com",
    };
};

const normalizeRecipients = (recipients) => {
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];
    return recipientList
        .map((recipient) => {
            if (typeof recipient === "string") {
                const email = recipient.trim().toLowerCase();
                return email ? { email } : null;
            }
            if (recipient?.email) {
                return { email: recipient.email.trim().toLowerCase(), ...(recipient.name ? { name: recipient.name } : {}) };
            }
            return null;
        })
        .filter(Boolean);
};

const htmlToText = (html = "") => html
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

export const verifyEmailService = async () => {
    try {
        const apiKey = process.env.BREVO_API_KEY?.trim();
        const sender = getSender();

        if (!apiKey) {
            logger.warn(
                { senderEmail: sender.email },
                "[Mailer] BREVO_API_KEY is not set — transactional emails will be skipped"
            );
            return { configured: false };
        }

        if (!apiKey.startsWith("xkeysib-")) {
            logger.warn(
                { senderEmail: sender.email },
                "[Mailer] BREVO_API_KEY does not start with 'xkeysib-'. Please verify this is a Brevo REST API v3 key."
            );
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

export const sendBrevoEmail = async ({
    to,
    subject,
    html,
    text,
    cc,
    bcc,
    replyTo,
    attachments,
} = {}) => {
    try {
        const client = getBrevoClient();
        if (!client) {
            logger.warn({ subject }, "[Mailer] BREVO_API_KEY is not configured — email skipped");
            return { success: false, error: "Email service not configured" };
        }

        const normalizedTo = normalizeRecipients(to);
        if (normalizedTo.length === 0) {
            logger.error({ subject }, "[Mailer] Email skipped — recipient address is empty");
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
    header: "#222222",
    text: "#222222",
    warm: "#F7F4EE",
    gold: "#C5A05A",
    muted: "#73777B",
    border: "#E4E0D8",
    success: "#287747",
    danger: "#A34B4B",
    pending: "#9A6A20",
    page: "#F1F1EF",
};

const SOCIAL_LINKS = [
    { label: "Instagram", href: "https://www.instagram.com/aaditya_raj_2310?igsh=enRtZmpvN3RnZTV4" },
    { label: "X", href: "https://x.com/Aaditya_raj_70?t=qvI4FEr3TKf1D2lPsHRWow&s=09" },
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

const frontendLink = (path) => `${FRONTEND_URL()}${path}`;

const supportEmail = () => process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_REPLY_TO?.trim() || "support@salonnow.in";

const renderDetailCard = (rows = []) => {
    const safeRows = rows
        .filter((row) => row && hasValue(row.value))
        .map((row) => ({
            label: displayValue(row.label, "Details"),
            value: displayValue(row.value),
            emphasis: Boolean(row.emphasis),
        }));

    if (!safeRows.length) return { html: "", lines: [] };

    return {
        html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${COLORS.warm};border:1px solid ${COLORS.border};border-radius:5px;overflow:hidden;margin:24px 0;">
          ${safeRows.map((row, index) => `<tr${index < safeRows.length - 1 ? ` style="border-bottom:1px solid ${COLORS.border};"` : ""}>
            <td style="padding:13px 16px;color:${COLORS.muted};font-size:10px;line-height:1.4;letter-spacing:1.1px;text-transform:uppercase;vertical-align:top;width:36%;">${escapeHtml(row.label)}</td>
            <td style="padding:13px 16px;color:${row.emphasis ? COLORS.text : "#41464B"};font-size:${row.emphasis ? "17px" : "13px"};font-weight:${row.emphasis ? "700" : "600"};line-height:1.5;text-align:right;word-break:break-word;">${escapeHtml(row.value)}</td>
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
}) => {
    const safeSalonName = displayValue(salonName, "Salon");
    const hasAppointmentDetails = hasValue(bookingTime) || hasValue(stylist) || hasValue(services);
    const hasTotal = hasValue(price);
    const hasBookingReference = hasValue(bookingReference);
    const hasCustomer = hasValue(customerName);
    const serviceText = hasValue(services) ? displayServices(services) : "";
    const bookingStatus = hasValue(status) ? displayValue(status) : "";
    const appointmentValue = hasValue(bookingTime) ? displayValue(bookingTime) : "";

    return {
        html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid ${COLORS.border};border-radius:5px;overflow:hidden;margin:24px 0;">
          ${hasBookingReference ? `<tr style="background:${COLORS.warm};border-bottom:1px solid ${COLORS.border};">
            <td style="padding:13px 16px;">
              <p style="margin:0 0 4px;color:${COLORS.muted};font-size:10px;letter-spacing:1.1px;text-transform:uppercase;">Booking reference</p>
              <p style="margin:0;color:${COLORS.text};font-size:16px;font-weight:700;">${escapeHtml(displayValue(bookingReference))}</p>
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:18px 16px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td width="44" valign="top">
                    <span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:${COLORS.header};color:#ffffff;font-size:14px;line-height:34px;text-align:center;">${escapeHtml(getInitials(safeSalonName))}</span>
                  </td>
                  <td valign="top" style="padding-left:10px;">
                    <p style="margin:0;color:${COLORS.text};font-size:14px;font-weight:700;line-height:1.4;">${escapeHtml(safeSalonName)}</p>
                    ${hasValue(salonAddress) ? `<p style="margin:3px 0 0;color:${COLORS.muted};font-size:11px;line-height:1.5;">${escapeHtml(displayValue(salonAddress))}</p>` : ""}
                  </td>
                  ${bookingStatus ? `<td align="right" valign="top" style="padding-left:8px;"><span style="display:inline-block;padding:5px 9px;border:1px solid ${statusColor};border-radius:20px;color:${statusColor};font-size:10px;font-weight:700;">${escapeHtml(bookingStatus)}</span></td>` : ""}
                </tr>
              </table>
            </td>
          </tr>
          ${hasCustomer ? `<tr>
            <td style="padding:12px 16px;border-top:1px solid ${COLORS.border};">
              <p style="margin:0 0 4px;color:${COLORS.muted};font-size:10px;letter-spacing:1.1px;text-transform:uppercase;">Customer</p>
              <p style="margin:0;color:${COLORS.text};font-size:14px;font-weight:700;">${escapeHtml(displayValue(customerName))}</p>
            </td>
          </tr>` : ""}
          ${hasAppointmentDetails ? `<tr>
            <td style="padding:14px 16px 16px;border-top:1px solid ${COLORS.border};">
              <p style="margin:0 0 11px;color:${COLORS.text};font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;">Appointment details</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  ${appointmentValue ? `<td width="50%" valign="top" style="padding-right:16px;${serviceText || hasValue(stylist) ? `border-right:1px solid ${COLORS.border};` : ""}">
                    <p style="margin:0 0 4px;color:${COLORS.muted};font-size:10px;">Date &amp; Time</p>
                    <p style="margin:0;color:#41464B;font-size:12px;line-height:1.5;">${escapeHtml(appointmentValue)}</p>
                  </td>` : ""}
                  ${(serviceText || hasValue(stylist)) ? `<td valign="top" style="padding-left:${appointmentValue ? "16px" : "0"};">
                    <p style="margin:0 0 4px;color:${COLORS.muted};font-size:10px;">Service</p>
                    ${serviceText ? `<p style="margin:0;color:#41464B;font-size:12px;line-height:1.5;">${escapeHtml(serviceText)}</p>` : ""}
                    ${hasValue(stylist) ? `<p style="margin:4px 0 0;color:${COLORS.muted};font-size:10px;line-height:1.5;">Stylist: <span style="color:#41464B;">${escapeHtml(displayValue(stylist))}</span></p>` : ""}
                  </td>` : ""}
                </tr>
              </table>
            </td>
          </tr>` : ""}
          ${hasTotal ? `<tr>
            <td style="padding:14px 16px;background:${COLORS.warm};border-top:1px solid ${COLORS.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
                <td style="color:${COLORS.text};font-size:12px;font-weight:700;">Total amount</td>
                <td align="right" style="color:${COLORS.text};font-size:16px;font-weight:700;">₹${escapeHtml(displayValue(price, "0"))}</td>
              </tr></table>
            </td>
          </tr>` : ""}
        </table>`,
        lines: [
            ...(hasBookingReference ? [`Booking reference: ${displayValue(bookingReference)}`] : []),
            `Salon: ${safeSalonName}`,
            ...(hasCustomer ? [`Customer: ${displayValue(customerName)}`] : []),
            ...(appointmentValue ? [`Date & Time: ${appointmentValue}`] : []),
            ...(serviceText ? [`Service: ${serviceText}`] : []),
            ...(hasValue(stylist) ? [`Stylist: ${displayValue(stylist)}`] : []),
            ...(bookingStatus ? [`Status: ${bookingStatus}`] : []),
            ...(hasTotal ? [`Total amount: ₹${displayValue(price, "0")}`] : []),
        ],
    };
};

const renderPaymentDetails = ({ status, reference, method }) => {
    const cells = [
        { label: "Payment status", value: status, color: COLORS.success },
        { label: "Payment reference", value: reference },
        { label: "Payment method", value: method },
    ].filter((cell) => hasValue(cell.value));

    if (!cells.length) return { html: "", lines: [] };

    return {
        html: `
        <p style="margin:26px 0 10px;color:${COLORS.text};font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;">Payment details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px;">
          <tr>
            ${cells.map((cell, index) => `<td width="${Math.floor(100 / cells.length)}%" valign="top" style="padding:${index ? "0 0 0 12px" : "0 12px 0 0"};${index < cells.length - 1 ? `border-right:1px solid ${COLORS.border};` : ""}">
              <p style="margin:0 0 5px;color:${COLORS.muted};font-size:10px;line-height:1.4;">${escapeHtml(cell.label)}</p>
              <p style="margin:0;color:${cell.color || "#41464B"};font-size:11px;font-weight:700;line-height:1.5;word-break:break-word;">${escapeHtml(displayValue(cell.value))}</p>
            </td>`).join("")}
          </tr>
        </table>`,
        lines: cells.map((cell) => `${cell.label}: ${displayValue(cell.value)}`),
    };
};

const renderSupportLine = () => {
    const email = supportEmail();
    const contact = email
        ? `<a href="mailto:${escapeHtml(email)}" style="color:${COLORS.gold};text-decoration:underline;">Contact us</a>`
        : `<span style="color:${COLORS.gold};">Contact support</span>`;
    return {
        html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0 4px;">
          <tr>
            <td width="28" valign="top" style="color:${COLORS.header};font-size:17px;line-height:1.4;">◉</td>
            <td style="color:${COLORS.muted};font-size:11px;line-height:1.6;">Need help? Our support team is here for you. ${contact}</td>
          </tr>
        </table>`,
        text: `Need help? Our support team is here for you. ${email ? `Contact us at ${email}.` : "Contact support."}`,
    };
};

const renderEmail = ({
    preheader,
    category,
    icon = "•",
    heading,
    greeting,
    paragraphs = [],
    rows = [],
    booking,
    payment,
    notice,
    code,
    cta,
    accent = COLORS.gold,
    footer = "SalonNow",
}) => {
    const safeHeading = displayValue(heading, "SalonNow");
    const safePreheader = displayValue(preheader, safeHeading);
    const safeCategory = displayValue(category, "SalonNow");
    const safeGreeting = hasValue(greeting) ? displayValue(greeting) : "";
    const safeParagraphs = paragraphs.map((paragraph) => displayValue(paragraph, "")).filter(Boolean);
    const safeNotice = notice && hasValue(notice.text) ? {
        label: displayValue(notice.label, "Update"),
        text: displayValue(notice.text),
        color: notice.color || accent,
    } : null;
    const safeCode = code === undefined || code === null ? "" : String(code);
    const safeCta = cta ? {
        label: displayValue(cta.label, "Open SalonNow"),
        href: String(cta.href),
    } : null;
    const detailCard = renderDetailCard(rows);
    const support = renderSupportLine();
    const noticeHtml = safeNotice ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0;">
      <tr><td style="border-left:4px solid ${safeNotice.color};background:${COLORS.warm};padding:13px 15px;">
        <p style="margin:0 0 4px;color:${safeNotice.color};font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;">${escapeHtml(safeNotice.label)}</p>
        <p style="margin:0;color:#41464B;font-size:12px;line-height:1.6;">${escapeHtml(safeNotice.text)}</p>
      </td></tr>
    </table>` : "";
    const codeHtml = safeCode ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0;">
      <tr><td align="center" style="background:${COLORS.warm};border:1px dashed ${accent};padding:18px 12px;">
        <p style="margin:0 0 8px;color:${COLORS.muted};font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;">Your verification code</p>
        <p style="margin:0;color:${COLORS.text};font-size:30px;font-weight:700;letter-spacing:8px;line-height:1.2;">${escapeHtml(safeCode)}</p>
      </td></tr>
    </table>` : "";
    const ctaHtml = safeCta ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0 8px;">
      <tr><td align="center" bgcolor="${COLORS.header}" style="background:${COLORS.header};border-radius:4px;">
        <a href="${escapeHtml(safeCta.href)}" style="display:block;padding:13px 18px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.3px;text-decoration:none;">${escapeHtml(safeCta.label)} &nbsp;→</a>
      </td></tr>
    </table>` : "";
    const footerHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.warm}" style="border-collapse:collapse;background:${COLORS.warm};">
      <tr>
        <td style="padding:18px 28px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
            <td valign="top"><p style="margin:0;color:${COLORS.text};font-size:17px;font-weight:700;letter-spacing:-.3px;">salon<span style="color:${COLORS.gold};">now</span></p><p style="margin:4px 0 0;color:${COLORS.muted};font-size:9px;letter-spacing:.8px;text-transform:uppercase;">Hair / Beauty / Wellness</p></td>
            <td align="right" valign="top"><p style="margin:3px 0 0;color:${COLORS.muted};font-size:10px;line-height:1.5;">${SOCIAL_LINKS.map((link) => `<a href="${escapeHtml(link.href)}" style="color:${COLORS.muted};text-decoration:none;">${escapeHtml(link.label)}</a>`).join(" &nbsp;·&nbsp; ")}</p></td>
          </tr></table>
          <p style="margin:17px 0 0;padding-top:10px;border-top:1px solid ${COLORS.border};color:#9A9A95;font-size:9px;line-height:1.6;text-align:center;">This email was sent by SalonNow because of an action on your account. © ${new Date().getFullYear()} SalonNow.</p>
        </td>
      </tr>
    </table>`;

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${COLORS.page};color:${COLORS.text};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(safePreheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.page}" style="border-collapse:collapse;width:100%;background:${COLORS.page};">
      <tr><td align="center" style="padding:22px 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px;background:#ffffff;">
          <tr><td bgcolor="${COLORS.header}" style="padding:17px 20px;background:${COLORS.header};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
              <td valign="middle"><p style="margin:0;color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-.4px;">salon<span style="color:${COLORS.gold};">now</span></p></td>
              <td align="right" valign="middle"><p style="margin:0;color:#D5C59E;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Hair / Beauty / Wellness</p></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:28px 30px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 10px;"><tr>
              <td valign="middle"><span style="display:inline-block;width:25px;height:25px;border:1px solid ${accent};border-radius:50%;color:${accent};font-size:13px;line-height:25px;text-align:center;">${escapeHtml(icon)}</span></td>
              <td valign="middle" style="padding-left:10px;"><p style="margin:0;color:${COLORS.muted};font-size:9px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(safeCategory)}</p></td>
            </tr></table>
            <h1 style="margin:0 0 13px;color:${COLORS.text};font-size:25px;line-height:1.2;font-weight:700;letter-spacing:-.3px;">${escapeHtml(safeHeading)}</h1>
            ${safeGreeting ? `<p style="margin:0 0 8px;color:#41464B;font-size:12px;line-height:1.6;">${escapeHtml(safeGreeting)}</p>` : ""}
            ${safeParagraphs.map((paragraph) => `<p style="margin:0 0 10px;color:${COLORS.muted};font-size:12px;line-height:1.7;">${escapeHtml(paragraph)}</p>`).join("")}
            ${noticeHtml}
            ${safeCode ? codeHtml : ""}
            ${booking?.html || ""}
            ${payment?.cardHtml || ""}
            ${detailCard.html}
            ${payment?.detailsHtml || ""}
            ${ctaHtml}
            ${support.html}
          </td></tr>
          <tr><td>${footerHtml}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

    const textLines = [safeCategory, safeHeading, ...(safeGreeting ? [safeGreeting] : []), ...safeParagraphs];
    if (safeNotice) textLines.push(`${safeNotice.label}: ${safeNotice.text}`);
    if (safeCode) textLines.push(`Verification code: ${safeCode}`);
    if (booking?.lines) textLines.push(...booking.lines);
    if (payment?.cardLines) textLines.push(...payment.cardLines);
    textLines.push(...detailCard.lines);
    if (payment?.detailsLines) textLines.push(...payment.detailsLines);
    if (safeCta) textLines.push(`${safeCta.label}: ${safeCta.href}`);
    textLines.push(support.text, footer);

    return { html, text: textLines.join("\n\n") };
};

const renderPaymentCard = ({ shopName, bookingTime, amount, paymentId }) => {
    const cells = [
        { label: "Amount paid", value: hasValue(amount) ? `₹${displayValue(amount, "0")}` : "", emphasis: true },
        { label: "Payment reference", value: paymentId },
        { label: "Salon", value: shopName },
        { label: "Appointment", value: bookingTime },
    ].filter((cell) => hasValue(cell.value));
    const rows = [];

    for (let index = 0; index < cells.length; index += 2) {
        const left = cells[index];
        const right = cells[index + 1];
        rows.push(`<tr${index + 2 < cells.length ? ` style="border-bottom:1px solid ${COLORS.border};"` : ""}>
          <td width="50%" valign="top" style="padding:13px 14px 13px 16px;${right ? `border-right:1px solid ${COLORS.border};` : ""}">
            <p style="margin:0 0 5px;color:${COLORS.muted};font-size:10px;line-height:1.4;">${escapeHtml(left.label)}</p>
            <p style="margin:0;color:${left.emphasis ? COLORS.text : "#41464B"};font-size:${left.emphasis ? "17px" : "12px"};font-weight:${left.emphasis ? "700" : "600"};line-height:1.5;word-break:break-word;">${escapeHtml(displayValue(left.value))}</p>
          </td>
          ${right ? `<td width="50%" valign="top" style="padding:13px 16px 13px 14px;">
            <p style="margin:0 0 5px;color:${COLORS.muted};font-size:10px;line-height:1.4;">${escapeHtml(right.label)}</p>
            <p style="margin:0;color:${right.emphasis ? COLORS.text : "#41464B"};font-size:${right.emphasis ? "17px" : "12px"};font-weight:${right.emphasis ? "700" : "600"};line-height:1.5;word-break:break-word;">${escapeHtml(displayValue(right.value))}</p>
          </td>` : ""}
        </tr>`);
    }

    return {
        cardHtml: cells.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${COLORS.warm};border:1px solid ${COLORS.border};border-radius:5px;overflow:hidden;margin:24px 0;">${rows.join("")}</table>` : "",
        cardLines: cells.map((cell) => `${cell.label}: ${displayValue(cell.value)}`),
    };
};

export const testEmailConfiguration = async (targetEmail) => {
    const rendered = renderEmail({
        preheader: "SalonNow email configuration test",
        category: "Email configuration test",
        icon: "✓",
        heading: "Test email from SalonNow.",
        greeting: "Hi there,",
        paragraphs: ["This message confirms that the SalonNow transactional email service is configured to deliver messages."],
        rows: [
            { label: "Recipient", value: targetEmail },
            { label: "Brevo API key", value: process.env.BREVO_API_KEY ? (process.env.BREVO_API_KEY.startsWith("xkeysib-") ? "Configured REST API key" : "Configured, but prefix should be xkeysib-") : "Missing" },
            { label: "Sender email", value: process.env.SENDER_EMAIL || "noreply@salonnow.com (default)" },
        ],
        footer: "SalonNow configuration test",
    });
    return sendTemplateEmail(targetEmail, "SalonNow - Brevo REST API Configuration Test", rendered.html, rendered.text);
};

export const sendWelcomeEmail = async (email, name) => {
    const rendered = renderEmail({
        preheader: "Welcome to SalonNow",
        category: "Welcome to SalonNow",
        icon: "✦",
        heading: "Welcome to SalonNow.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: ["Your account is ready. Discover salons, choose a service, and book a time that works for you."],
        cta: { label: "Explore salons", href: frontendLink("/home") },
        footer: "The SalonNow Team",
    });
    return sendTemplateEmail(email, "Welcome to SalonNow!", rendered.html, rendered.text);
};

export const sendLoginEmail = async (email, name) => {
    const rendered = renderEmail({
        preheader: "A sign-in to your SalonNow account occurred",
        category: "Account notification",
        icon: "●",
        heading: "A sign-in to your account occurred.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: ["This email confirms that your SalonNow account was accessed successfully."],
        notice: { label: "Sign-in notification", text: "Your account was accessed successfully.", color: COLORS.success },
        cta: { label: "Go to account settings", href: frontendLink("/home") },
        footer: "The SalonNow Account Team",
    });
    return sendTemplateEmail(email, "Successfully Logged In to SalonNow", rendered.html, rendered.text);
};

export const sendLogoutEmail = async (email, name) => {
    const rendered = renderEmail({
        preheader: "You have signed out of SalonNow",
        category: "Account notification",
        icon: "↗",
        heading: "You've signed out.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: ["You have successfully signed out of SalonNow. You can sign in again whenever you are ready."],
        cta: { label: "Sign in again", href: frontendLink("/home") },
        footer: "The SalonNow Account Team",
    });
    return sendTemplateEmail(email, "Logged Out of SalonNow", rendered.html, rendered.text);
};

export const sendShopAddedEmail = async (email, name, shopName) => {
    const safeShopName = displayValue(shopName, "Your salon");
    const rendered = renderEmail({
        preheader: `${safeShopName} is now live on SalonNow`,
        category: "Listing update",
        icon: "▥",
        heading: "Your salon is now live.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: [`${safeShopName} is now live on SalonNow. Customers can discover your salon and book appointments through the platform.`],
        rows: [{ label: "Salon", value: safeShopName, emphasis: true }],
        cta: { label: "Manage salon listing", href: frontendLink("/home") },
        footer: "The SalonNow Team",
    });
    return sendTemplateEmail(email, `Your shop "${shopName}" is now live on SalonNow!`, rendered.html, rendered.text);
};

export const sendBookingConfirmationEmail = async (email, name, shopName, bookingTime, price, stylist, services) => {
    const safeShopName = displayValue(shopName, "Salon");
    const booking = renderBookingPanel({
        bookingTime,
        salonName: safeShopName,
        stylist,
        services,
        price,
        status: "Confirmed",
        statusColor: COLORS.success,
    });
    const rendered = renderEmail({
        preheader: `Your appointment at ${safeShopName} is confirmed`,
        category: "Booking confirmation",
        icon: "✓",
        heading: "Your appointment is confirmed!",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: [`We're ready for you at ${safeShopName}. Here are the details you'll need for your visit.`],
        booking,
        cta: { label: "View booking details", href: frontendLink("/bookings") },
        footer: "The SalonNow Team",
    });
    return sendTemplateEmail(email, "Your SalonNow Booking is Confirmed!", rendered.html, rendered.text);
};

export const sendPaymentReceiptEmail = async (email, name, shopName, bookingTime, amount, paymentId) => {
    const safeShopName = displayValue(shopName, "Salon");
    const payment = renderPaymentCard({ shopName: safeShopName, bookingTime, amount, paymentId });
    const paymentDetails = renderPaymentDetails({ status: "Paid", reference: paymentId });
    const rendered = renderEmail({
        preheader: `Payment received for your appointment at ${safeShopName}`,
        category: "Payment receipt",
        icon: "▣",
        heading: "Payment received.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: [`Your payment for the ${safeShopName} appointment was received successfully.`],
        payment: { ...payment, detailsHtml: paymentDetails.html, detailsLines: paymentDetails.lines },
        footer: "The SalonNow Payments Team",
    });
    return sendTemplateEmail(email, "Payment successful - SalonNow booking confirmed", rendered.html, rendered.text);
};

export const sendOwnerPaymentNotificationEmail = async (email, ownerName, customerName, shopName, bookingTime, amount, paymentId) => {
    const safeShopName = displayValue(shopName, "your salon");
    const payment = renderPaymentCard({ shopName: safeShopName, bookingTime, amount, paymentId });
    const paymentDetails = renderPaymentDetails({ status: "Paid", reference: paymentId });
    const rendered = renderEmail({
        preheader: `Payment recorded for a booking at ${safeShopName}`,
        category: "Owner payment notification",
        icon: "▣",
        heading: "Payment recorded for a booking.",
        greeting: `Hi ${displayValue(ownerName, "there")},`,
        paragraphs: [`${displayValue(customerName, "A customer")} paid for an appointment at ${safeShopName}.`],
        payment: { ...payment, detailsHtml: paymentDetails.html, detailsLines: paymentDetails.lines },
        footer: "The SalonNow Dashboard Team",
    });
    return sendTemplateEmail(email, "New paid booking - SalonNow", rendered.html, rendered.text);
};

export const sendBookingStatusEmail = async (email, name, shopName, date, time, status) => {
    const safeStatus = displayValue(status, "updated");
    const statusKey = safeStatus.toLowerCase();
    const statusCopy = {
        confirmed: { category: "Booking confirmation", icon: "✓", heading: "Your appointment is confirmed!", color: COLORS.success, message: "Your appointment has been confirmed." },
        completed: { category: "Booking update", icon: "✓", heading: "Your appointment is complete.", color: COLORS.success, message: "Your appointment has been marked complete." },
        cancelled: { category: "Appointment cancelled", icon: "×", heading: "Your appointment has been cancelled.", color: COLORS.danger, message: "Your appointment has been cancelled. Here are the details for your records." },
        rejected: { category: "Booking update", icon: "×", heading: "Your appointment was not accepted.", color: COLORS.danger, message: "Your appointment request was not accepted by the salon." },
        pending: { category: "Booking pending", icon: "◷", heading: "Your booking request is pending.", color: COLORS.pending, message: "The salon is reviewing your booking request." },
    }[statusKey] || { category: "Booking update", icon: "↻", heading: "An update to your appointment.", color: COLORS.gold, message: `The current booking status is ${safeStatus}.` };
    const booking = renderBookingPanel({
        bookingTime: `${displayValue(date)} at ${displayValue(time)}`,
        salonName: shopName,
        status: safeStatus,
        statusColor: statusCopy.color,
    });
    const rendered = renderEmail({
        preheader: `Your appointment at ${displayValue(shopName, "the salon")} is ${safeStatus}`,
        category: statusCopy.category,
        icon: statusCopy.icon,
        heading: statusCopy.heading,
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: [statusCopy.message],
        booking,
        cta: { label: "View booking details", href: frontendLink("/bookings") },
        accent: statusCopy.color,
        footer: "The SalonNow Team",
    });
    return sendTemplateEmail(email, `Your booking at ${shopName} is ${status}`, rendered.html, rendered.text);
};

export const sendBookingPendingEmail = async (email, name, shopName, bookingTime, price, stylist, services) => {
    const safeShopName = displayValue(shopName, "Salon");
    const booking = renderBookingPanel({
        bookingTime,
        salonName: safeShopName,
        stylist,
        services,
        price,
        status: "Pending",
        statusColor: COLORS.pending,
    });
    const rendered = renderEmail({
        preheader: `Your booking request at ${safeShopName} is pending`,
        category: "Booking pending",
        icon: "◷",
        heading: "Your booking request has been sent.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: [`${safeShopName} has received your appointment request. We'll notify you once the booking status changes.`],
        booking,
        cta: { label: "View booking details", href: frontendLink("/bookings") },
        accent: COLORS.pending,
        footer: "The SalonNow Team",
    });
    return sendTemplateEmail(email, "Your SalonNow booking request is pending review", rendered.html, rendered.text);
};

export const sendOwnerNewBookingEmail = async (email, ownerName, customerName, shopName, bookingDate, bookingTime, price, stylist, services) => {
    const safeShopName = displayValue(shopName, "your salon");
    const booking = renderBookingPanel({
        bookingTime: `${displayValue(bookingDate)} at ${displayValue(bookingTime)}`,
        salonName: safeShopName,
        customerName,
        stylist,
        services,
        price,
        status: "Pending",
        statusColor: COLORS.pending,
    });
    const rendered = renderEmail({
        preheader: `A new booking request has arrived at ${safeShopName}`,
        category: "New booking request",
        icon: "▣",
        heading: "A new booking request has arrived.",
        greeting: `Hi ${displayValue(ownerName, "there")},`,
        paragraphs: [`${displayValue(customerName, "A customer")} has requested an appointment at ${safeShopName}. Review the details below and take the next action.`],
        booking,
        cta: { label: "Open owner dashboard", href: frontendLink("/owner/dashboard") },
        accent: COLORS.pending,
        footer: "The SalonNow Dashboard Team",
    });
    return sendTemplateEmail(email, `New Booking at ${shopName}: ${customerName} (${bookingDate} at ${bookingTime})`, rendered.html, rendered.text);
};

export const sendProfileUpdateEmail = async (email, name, salonName) => {
    const safeSalonName = displayValue(salonName, "your salon");
    const rendered = renderEmail({
        preheader: `Your profile for ${safeSalonName} has been updated`,
        category: "Profile update",
        icon: "●",
        heading: "Your profile has been updated.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: [`The profile information for ${safeSalonName} has been updated.`],
        rows: [{ label: "Updated profile", value: safeSalonName, emphasis: true }],
        cta: { label: "View profile", href: frontendLink("/salon/manage") },
        footer: "The SalonNow Security Team",
    });
    return sendTemplateEmail(email, `Profile Updated: ${salonName}`, rendered.html, rendered.text);
};

export const sendManagementUpdateEmail = async (email, name, action, itemName, category) => {
    const safeCategory = displayValue(category, "Salon");
    const rendered = renderEmail({
        preheader: `${safeCategory} management update`,
        category: "Management update",
        icon: "⚙",
        heading: "An update to your salon management.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: ["A change was recorded on your salon dashboard."],
        rows: [
            { label: "Action", value: action, emphasis: true },
            { label: "Item", value: itemName },
            { label: "Category", value: safeCategory },
        ],
        footer: "The SalonNow Dashboard Team",
    });
    return sendTemplateEmail(email, `${category} Alert: ${action}`, rendered.html, rendered.text);
};

export const sendVerificationEmail = async (email, name, code) => {
    logger.info({ email, code }, "🔐 [AUTH] Verification OTP generated");
    console.log(`\n======================================================`);
    console.log(`🔐 [VERIFICATION CODE] For: ${email}`);
    console.log(`🔐 Code: ${code} (expires in 5 minutes)`);
    console.log(`======================================================\n`);

    const rendered = renderEmail({
        preheader: "Your SalonNow verification code expires in 5 minutes",
        category: "Email verification",
        icon: "✓",
        heading: "Verify your email address.",
        greeting: `Hi ${displayValue(name, "there")},`,
        paragraphs: ["Use the code below to verify your email address and complete your SalonNow signup. It expires in 5 minutes."],
        code,
        rows: [{ label: "Security note", value: "If you did not request this code, you can ignore this email." }],
        footer: "The SalonNow Security Team",
    });
    return sendTemplateEmail(email, "Verify your email - SalonNow", rendered.html, rendered.text);
};
