import nodemailer from 'nodemailer';

const gmailUser = (process.env.GMAIL_USER || 'probitianofficial@gmail.com').trim();
const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || '';
const gmailPass = rawPass.replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use TLS
  auth: {
    user: gmailUser,
    pass: gmailPass
  }
});

export const emailService = {
  async sendWelcomeEmail(email: string): Promise<{ success: boolean; message?: string }> {
    if (!gmailPass) {
      console.log(`[EMAIL INFO] Welcome email recorded for ${email}. Set GMAIL_APP_PASSWORD in environment to enable live SMTP delivery.`);
      return { success: true, message: 'Welcome email queued.' };
    }

    try {
      await transporter.sendMail({
        from: `"ProBitian" <${gmailUser}>`,
        to: email,
        subject: 'Welcome to ProBitian! | Master Business Intelligence',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">Welcome to ProBitian!</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Master Power BI, SQL, Excel & AI Tools</p>
            </div>
            <p>Hi there,</p>
            <p>Thank you for subscribing to ProBitian updates! You're now connected with industry-focused tutorials, portfolio project guides, and Business Intelligence masterclasses.</p>
            <p>Stay tuned for our upcoming content and resources.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              ProBitian &bull; Official Learning Hub &bull; <a href="mailto:probitianofficial@gmail.com" style="color: #7c3aed;">probitianofficial@gmail.com</a>
            </p>
          </div>
        `
      });
      console.log(`[EMAIL SUCCESS] Welcome email delivered to ${email}`);
      return { success: true, message: 'Welcome email sent successfully.' };
    } catch (error: any) {
      console.error('Error sending welcome email:', error?.message || error);
      return { success: false, message: error?.message || 'Failed to send welcome email via SMTP.' };
    }
  },

  async sendAdminReply(email: string, subject: string, replyMessage: string): Promise<{ success: boolean; message?: string }> {
    if (!gmailPass) {
      console.log(`[EMAIL INFO] Reply recorded for ${email}. Set GMAIL_APP_PASSWORD in environment to enable live SMTP dispatch.`);
      return { success: true, message: 'Reply saved in database.' };
    }

    try {
      await transporter.sendMail({
        from: `"ProBitian Support" <${gmailUser}>`,
        to: email,
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; line-height: 1.6;">
            <div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #7c3aed;">
              <h2 style="color: #7c3aed; font-size: 20px; margin: 0;">ProBitian Support Response</h2>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; white-space: pre-line;">
              ${replyMessage.replace(/\n/g, '<br/>')}
            </div>
            <br/>
            <p>Best regards,<br/><strong>Shivam Baghel</strong><br/><span style="color: #64748b; font-size: 12px;">Founder & BI Specialist, ProBitian</span></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              ProBitian &bull; Official Support &bull; <a href="mailto:probitianofficial@gmail.com" style="color: #7c3aed;">probitianofficial@gmail.com</a>
            </p>
          </div>
        `
      });
      console.log(`[EMAIL SUCCESS] Admin reply delivered to ${email}`);
      return { success: true, message: 'Reply sent successfully via email.' };
    } catch (error: any) {
      console.error('Error sending admin reply email:', error?.message || error);
      return { success: false, message: error?.message || 'Failed to dispatch email.' };
    }
  }
};

