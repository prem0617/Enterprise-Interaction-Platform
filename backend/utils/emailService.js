import nodemailer from "nodemailer";

let _etherealTransporter = null;

// Create transporter — uses Gmail when credentials are set, falls back to Ethereal for dev
const createTransporter = async () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Fallback: Ethereal test account (dev only)
  if (_etherealTransporter) return _etherealTransporter;

  const testAccount = await nodemailer.createTestAccount();
  _etherealTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log("📧 Using Ethereal test email account:", testAccount.user);
  return _etherealTransporter;
};

// Send email function
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = await createTransporter();

    const fromAddress = process.env.EMAIL_USER || transporter.options?.auth?.user || "noreply@example.com";
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || "Enterprise Platform",
        address: fromAddress,
      },
      to,
      subject,
      html,
      text: text || "",
    };

    const info = await transporter.sendMail(mailOptions);

    // Log Ethereal preview URL when available
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("📧 Preview email:", previewUrl);
    }

    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send bulk emails
export const sendBulkEmails = async (emails) => {
  try {
    const transporter = await createTransporter();
    const fromAddress = process.env.EMAIL_USER || transporter.options?.auth?.user || "noreply@example.com";
    const results = [];

    for (const email of emails) {
      try {
        const info = await transporter.sendMail({
          from: {
            name: process.env.EMAIL_FROM_NAME || "Enterprise Platform",
            address: fromAddress,
          },
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text || "",
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`📧 Preview email to ${email.to}:`, previewUrl);
        }

        results.push({
          to: email.to,
          success: true,
          messageId: info.messageId,
        });
      } catch (error) {
        results.push({
          to: email.to,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Bulk email sending error:", error);
    throw new Error(`Failed to send bulk emails: ${error.message}`);
  }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    console.log("Email service is ready");
    return true;
  } catch (error) {
    console.error("Email configuration error:", error);
    return false;
  }
};
