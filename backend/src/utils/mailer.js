import nodemailer from 'nodemailer';

const createTransporter = async () => {
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();

    if (smtpUser && smtpPass) {
        console.log(`Mail transporter: using Gmail (${smtpUser})`);
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: { user: smtpUser, pass: smtpPass },
        });
    } else {
        console.log("No SMTP credentials found. Generating Ethereal test account...");
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
        });
    }
};

const sendMail = async (to, subject, htmlContent) => {
    try {
        const mailTransporter = await createTransporter();
        const smtpUser = process.env.SMTP_USER?.trim();
        const info = await mailTransporter.sendMail({
            from: `"SalonNow" <${smtpUser || 'no-reply@salonnow.app'}>`,
            to,
            subject,
            html: htmlContent,
        });
        console.log(`Email sent: "${subject}" to ${to}`);
        if (!smtpUser) {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
        return info;
    } catch (error) {
        console.error("Error sending email:", error.message);
        return null;
    }
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
          <a href="http://localhost:5174/home" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">EXPLORE SALONS</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Making every day a good hair day</p>
      </div>
    </div>`;
    return sendMail(email, "Welcome to SalonNow!", html);
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
          <a href="http://localhost:5174/home" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">BROWSE SALONS</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Making every day a good hair day</p>
      </div>
    </div>`;
    return sendMail(email, "Successfully Logged In to SalonNow", html);
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
          <a href="http://localhost:5174/home" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">VIEW YOUR SHOP</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; We can't wait to see your business grow!</p>
      </div>
    </div>`;
    return sendMail(email, `Your shop "${shopName}" is now live on SalonNow!`, html);
};

// ─── Booking Confirmation Email ───────────────────────────────────────────────
export const sendBookingConfirmationEmail = async (email, name, shopName, bookingTime) => {
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
              <td style="color:#1a1a1a;font-size:15px;font-weight:700;text-align:right;">${shopName}</td>
            </tr>
            <tr>
              <td style="color:#999;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">TIME</td>
              <td style="color:#D4AF37;font-size:15px;font-weight:700;text-align:right;">${bookingTime}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="http://localhost:5174/home" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:2px;">VIEW BOOKING</a>
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;"/>
        <p style="color:#aaaaaa;font-size:12px;text-align:center;margin:0;">The SalonNow Team &nbsp;&bull;&nbsp; Enjoy your visit!</p>
      </div>
    </div>`;
    return sendMail(email, "Your SalonNow Booking is Confirmed!", html);
};
