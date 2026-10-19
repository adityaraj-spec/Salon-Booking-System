import * as Brevo from "@getbrevo/brevo";
import logger from "../lib/logger.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

// ─── Brevo Client Singleton (lazy-initialized, safe) ─────────────────────────

let _brevoClient = null;

/**
 * Returns a cached TransactionalEmailsApi instance, or null when unconfigured.
 * Uses Brevo's v3.x setApiKey() method with an 'xkeysib-...' REST API key.
 * Never throws — callers receive null and handle it gracefully.
 */
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

/**
 * Non-blocking startup probe.
 * Checks whether Brevo REST API credentials are configured.
 * Never throws or calls process.exit().
 */
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

/**
 * Central email dispatcher using Brevo's HTTPS REST API.
 *
 * Returns `{ success: true, id }` on delivery, or `{ success: false, error }` on
 * any failure — it NEVER throws. Controllers can safely fire-and-forget.
 */
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

// Alias sendEmail to sendBrevoEmail for backwards compatibility
export const sendEmail = sendBrevoEmail;

export const sendTemplateEmail = (to, subject, htmlContent, textContent) => sendBrevoEmail({
    to,
    subject,
    html: htmlContent,
    text: textContent,
});

// ─── Diagnostic Function ──────────────────────────────────────────────────────
export const testEmailConfiguration = async (targetEmail) => {
    const html = `
    <div style="font-family:sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #D4AF37;">Brevo REST API Configuration Test</h2>
        <p>If you are reading this, your Brevo REST API mailing system is operational and delivering emails successfully over HTTPS!</p>
        <hr/>
        <p><strong>Environment Check:</strong></p>
        <ul>
            <li><strong>BREVO_API_KEY:</strong> ${process.env.BREVO_API_KEY ? (process.env.BREVO_API_KEY.startsWith('xkeysib-') ? 'Valid REST API Key (Active)' : 'WARNING: Key does not start with xkeysib-') : 'MISSING'}</li>
            <li><strong>SENDER_NAME:</strong> ${process.env.SENDER_NAME || 'SalonNow (default)'}</li>
            <li><strong>SENDER_EMAIL:</strong> ${process.env.SENDER_EMAIL || 'noreply@salonnow.com (default)'}</li>
            <li><strong>FRONTEND_URL:</strong> ${process.env.FRONTEND_URL || 'NOT SET'}</li>
        </ul>
    </div>`;
    return sendTemplateEmail(targetEmail, "SalonNow - Brevo REST API Configuration Test", html);
};

// ─── Welcome Email ────────────────────────────────────────────────────────────
export const sendWelcomeEmail = async (email, name) => {
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#9986;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <div style="text-align:center;margin-bottom:20px;">
          <span style="font-size:36px;color:#D4AF37;">&#9733;&#9733;&#9733;</span>
        </div>
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Welcome aboard, ${name}!</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 28px;">
          Thank you for joining <strong>SalonNow</strong>. You're now part of a community of beauty lovers and top salons. Ready to discover your perfect look?
        </p>
        <div style="text-align:center;margin:0 0 28px;">
          <span style="display:inline-block;width:40px;height:2px;background:#D4AF37;vertical-align:middle;"></span>
          &nbsp;&#9670;&nbsp;
          <span style="display:inline-block;width:40px;height:2px;background:#D4AF37;vertical-align:middle;"></span>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/home" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">EXPLORE SALONS</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Making every day a good hair day</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, "Welcome to SalonNow!", html);
};

// ─── Login Email ──────────────────────────────────────────────────────────────
export const sendLoginEmail = async (email, name) => {
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:32px;color:#1a1a1a;font-weight:900;">&#10003;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <div style="background:#f9f5e8;border:2px solid #D4AF37;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#D4AF37;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Login Successful</p>
        </div>
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Welcome back, ${name}!</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 28px;">
          You've successfully logged in to your SalonNow account. Your next perfect salon experience is just a click away!
        </p>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/home" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">BROWSE SALONS</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Making every day a good hair day</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, "Successfully Logged In to SalonNow", html);
};

// ─── Logout Email ─────────────────────────────────────────────────────────────
export const sendLogoutEmail = async (email, name) => {
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:32px;color:#1a1a1a;font-weight:900;">&#10005;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">See you soon, ${name}!</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 28px;">
          You've successfully logged out of your SalonNow account. We've enjoyed having you! Don't forget to check back for new services and deals.
        </p>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/home" style="display:inline-block;background:#D4AF37;color:#1a1a1a;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">RETURN TO SITE</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Always here for your style needs</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, "Logged Out of SalonNow", html);
};

// ─── Shop Added Email ─────────────────────────────────────────────────────────
export const sendShopAddedEmail = async (email, name, shopName) => {
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#127978;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <div style="text-align:center;margin-bottom:20px;">
          <span style="font-size:40px;">&#127942;</span>
        </div>
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Your shop is live!</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 20px;">
          Hi <strong>${name}</strong>, congratulations! Your shop has been successfully registered on SalonNow. You are ready to receive bookings!
        </p>
        <div style="background:#f9f5e8;border-left:4px solid #D4AF37;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 28px;">
          <p style="margin:0 0 4px;color:#999;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Your Shop</p>
          <p style="margin:0;color:#1a1a1a;font-size:18px;font-weight:700;">${shopName}</p>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/home" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">VIEW YOUR SHOP</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; We can't wait to see your business grow!</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, `Your shop "${shopName}" is now live on SalonNow!`, html);
};

// ─── Booking Confirmation Email ───────────────────────────────────────────────
export const sendBookingConfirmationEmail = async (email, name, shopName, bookingTime, price, stylist, services) => {
    const servicesList = Array.isArray(services) ? services.join(", ") : services;
    
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#128197;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <div style="background:#f9f5e8;border:2px solid #D4AF37;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#D4AF37;font-weight:700;letter-spacing:2px;text-transform:uppercase;">&#10003; &nbsp; Booking Confirmed</p>
        </div>
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">You're all set, ${name}!</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 20px;">
          Your appointment has been successfully booked. We look forward to seeing you!
        </p>
        <div style="background:#f9f5e8;border-radius:12px;padding:20px 24px;margin:0 0 28px;">
          <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">SALON</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${shopName}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">TIME</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${bookingTime}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">STYLIST</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${stylist}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">SERVICES</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${servicesList}</td>
            </tr>
            <tr>
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">TOTAL PRICE</td>
              <td style="color:#D4AF37;font-size:18px;font-weight:900;text-align:right;">₹${price}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/bookings" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">VIEW BOOKING</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Enjoy your visit!</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, "Your SalonNow Booking is Confirmed!", html);
};

export const sendPaymentReceiptEmail = async (email, name, shopName, bookingTime, amount, paymentId) => {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #eee;border-radius:12px;">
      <h1 style="color:#1a1a1a;">Salon<span style="color:#D4AF37;">Now</span></h1>
      <h2>Payment successful</h2>
      <p>Hi <strong>${name}</strong>, your payment and appointment at <strong>${shopName}</strong> are confirmed.</p>
      <p><strong>Appointment:</strong> ${bookingTime}</p>
      <p><strong>Amount paid:</strong> ₹${amount}</p>
      <p><strong>Payment ID:</strong> ${paymentId}</p>
      <p>Thank you for booking with SalonNow.</p>
    </div>`;
    return sendTemplateEmail(email, "Payment successful - SalonNow booking confirmed", html);
};

export const sendOwnerPaymentNotificationEmail = async (email, ownerName, customerName, shopName, bookingTime, amount, paymentId) => {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #eee;border-radius:12px;">
      <h1 style="color:#1a1a1a;">Salon<span style="color:#D4AF37;">Now</span></h1>
      <h2>New paid booking</h2>
      <p>Hi <strong>${ownerName}</strong>, <strong>${customerName}</strong> paid for an appointment at <strong>${shopName}</strong>.</p>
      <p><strong>Appointment:</strong> ${bookingTime}</p>
      <p><strong>Amount received:</strong> ₹${amount}</p>
      <p><strong>Payment ID:</strong> ${paymentId}</p>
    </div>`;
    return sendTemplateEmail(email, "New paid booking - SalonNow", html);
};

// ─── Booking Status Update Email ──────────────────────────────────────────────
export const sendBookingStatusEmail = async (email, name, shopName, date, time, status) => {
    const statusColors = {
        confirmed: "#22c55e",
        completed: "#D4AF37",
        rejected: "#ef4444",
        cancelled: "#6b7280"
    };
    const color = statusColors[status.toLowerCase()] || "#1a1a1a";
    
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:${color};border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#ffffff;">&#128365;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <div style="background:${color}11;border:2px solid ${color};border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:${color};font-weight:700;letter-spacing:2px;text-transform:uppercase;">Booking ${status}</p>
        </div>
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Important Update for ${name}</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 24px;">
          Your appointment status at <strong>${shopName}</strong> has been updated to <strong>${status}</strong>.
        </p>
        <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
          <p style="margin:0 0 8px;color:#999;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Appointment Details</p>
          <p style="margin:0;color:#1a1a1a;font-size:16px;font-weight:700;">${date} at ${time}</p>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/bookings" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">GO TO BOOKINGS</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Making every visit special</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, `Your booking at ${shopName} is ${status}`, html);
};

// ─── Booking Pending Email ─────────────────────────────────────────────────────
export const sendBookingPendingEmail = async (email, name, shopName, bookingTime, price, stylist, services) => {
    const servicesList = Array.isArray(services) ? services.join(", ") : services;
    
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#128366;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <div style="background:#fefce8;border:2px solid #facc15;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#ca8a04;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Request Received &bull; Pending Approval</p>
        </div>
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Almost there, ${name}!</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 20px;">
          We have received your booking request for <strong>${shopName}</strong>. Since the salon is currently at high capacity for this slot, the owner needs to review your request manually. 
        </p>
        <p style="color:#555555;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;background:#f9f9f9;padding:12px;border-radius:8px;">
          <strong>What happens next?</strong><br/>
          You will receive another email as soon as the salon owner reviews and updates your booking status.
        </p>
        <div style="background:#f9f5e8;border-radius:12px;padding:20px 24px;margin:0 0 28px;">
          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">SALON</td>
              <td style="color:#1a1a1a;font-size:13px;font-weight:700;text-align:right;">${shopName}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">TIME</td>
              <td style="color:#1a1a1a;font-size:13px;font-weight:700;text-align:right;">${bookingTime}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">STYLIST</td>
              <td style="color:#1a1a1a;font-size:13px;font-weight:700;text-align:right;">${stylist}</td>
            </tr>
            <tr>
              <td style="color:#999;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">ESTIMATED PRICE</td>
              <td style="color:#D4AF37;font-size:16px;font-weight:900;text-align:right;">₹${price}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/bookings" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">CHECK MY REQUEST</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; We'll notify you soon!</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, "Your SalonNow booking request is pending review", html);
};

// ─── Owner New Booking Notification Email ──────────────────────────────────────
export const sendOwnerNewBookingEmail = async (email, ownerName, customerName, shopName, bookingDate, bookingTime, price, stylist, services) => {
    const servicesList = Array.isArray(services) ? services.join(", ") : (services || "Salon Services");
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#128197;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <div style="background:#f9f5e8;border:2px solid #D4AF37;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#D4AF37;font-weight:700;letter-spacing:2px;text-transform:uppercase;">New Booking Received!</p>
        </div>
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Hi ${ownerName}, you have a new appointment!</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 20px;">
          <strong>${customerName}</strong> has booked an appointment at <strong>${shopName}</strong>.
        </p>
        <div style="background:#f9f5e8;border-radius:12px;padding:20px 24px;margin:0 0 28px;">
          <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">CUSTOMER</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${customerName}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">DATE &amp; TIME</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${bookingDate} at ${bookingTime}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">STYLIST</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${stylist}</td>
            </tr>
            <tr style="border-bottom:1px solid #e8dfc0;">
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">SERVICES</td>
              <td style="color:#1a1a1a;font-size:14px;font-weight:700;text-align:right;">${servicesList}</td>
            </tr>
            <tr>
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">TOTAL AMOUNT</td>
              <td style="color:#D4AF37;font-size:18px;font-weight:900;text-align:right;">₹${price}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/owner/dashboard" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">MANAGE APPOINTMENTS</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Dashboard Team &nbsp;&bull;&nbsp; Making appointments effortless</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, `New Booking at ${shopName}: ${customerName} (${bookingDate} at ${bookingTime})`, html);
};

// ─── Profile Update Email ─────────────────────────────────────────────────────
export const sendProfileUpdateEmail = async (email, name, salonName) => {
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#9881;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Salon Profile Updated</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 24px;">
          Hi <strong>${name}</strong>, this is a confirmation that the profile for <strong>${salonName}</strong> has been successfully updated on the platform.
        </p>
        <div style="background:#f9f9f9;padding:20px;border-radius:12px;text-align:center;margin-bottom:28px;">
          <p style="margin:0;color:#666;font-size:13px;">If you did not perform this action, please contact support immediately.</p>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${FRONTEND_URL()}/salon/manage" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">REVIEW CHANGES</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Security Team</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, `Profile Updated: ${salonName}`, html);
};

// ─── Management Update Email (Services/Staff) ─────────────────────────────────
export const sendManagementUpdateEmail = async (email, name, action, itemName, category) => {
    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#128203;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">${category} Management Update</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 24px;">
          Hi <strong>${name}</strong>, a ${category.toLowerCase()} action was performed on your salon dashboard:
        </p>
        <div style="background:#f9f5e8;border-left:4px solid #D4AF37;padding:16px 20px;margin-bottom:28px;">
          <p style="margin:0 0 4px;color:#999;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Action</p>
          <p style="margin:0 0 12px;color:#1a1a1a;font-size:16px;font-weight:700;">${action}</p>
          <p style="margin:0 0 4px;color:#999;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Item</p>
          <p style="margin:0;color:#1a1a1a;font-size:16px;font-weight:700;">${itemName}</p>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Dashboard Team</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, `${category} Alert: ${action}`, html);
};

// ─── Verification Email ───────────────────────────────────────────────────────
export const sendVerificationEmail = async (email, name, code) => {
    // Console log safeguard: always print OTP to terminal for local debugging
    logger.info({ email, code }, "🔐 [AUTH] Verification OTP generated");
    console.log(`\n======================================================`);
    console.log(`🔐 [VERIFICATION CODE] For: ${email}`);
    console.log(`🔐 Code: ${code} (expires in 5 minutes)`);
    console.log(`======================================================\n`);

    const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0f0f0;">
      <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
        <div style="display:inline-block;background:#D4AF37;border-radius:50%;width:64px;height:64px;text-align:center;line-height:64px;margin-bottom:16px;font-size:28px;color:#1a1a1a;">&#9993;</div>
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:1px;">Salon<span style="color:#D4AF37;">Now</span></h1>
      </div>
      <div style="padding:40px;">
        <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;text-align:center;">Verify Your Email Address</h2>
        <p style="color:#555555;font-size:15px;line-height:1.7;text-align:center;margin:0 0 28px;">
          Hi <strong>${name}</strong>, thank you for registering with SalonNow. Please enter the following 4-digit verification code to complete your signup process. This code will expire in <strong>5 minutes</strong>.
        </p>
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-block;background:#f9f5e8;border:2px dashed #D4AF37;border-radius:12px;padding:16px 40px;font-size:36px;font-weight:900;letter-spacing:8px;color:#1a1a1a;text-align:center;">
            ${code}
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Security Team</p>
      </div>
    </div>`;
    return sendTemplateEmail(email, "Verify your email - SalonNow", html);
};
