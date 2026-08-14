import nodemailer from 'nodemailer';

export function getGmailUser(): string {
  return (process.env.GMAIL_USER || 'probitianofficial@gmail.com').trim();
}

export function getGmailPass(): string {
  const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || '';
  return rawPass.replace(/\s+/g, '');
}

export function getTransporter() {
  const user = getGmailUser();
  const pass = getGmailPass();
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use TLS
    auth: {
      user,
      pass
    }
  });
}

export function sanitizeError(error: any): string {
  if (!error) return 'Unknown email error';
  const rawMsg = typeof error === 'string' ? error : (error?.message || String(error));
  const pass = getGmailPass();
  if (pass && pass.length > 0 && rawMsg.includes(pass)) {
    return rawMsg.replaceAll(pass, '[REDACTED_PASSWORD]');
  }
  return rawMsg;
}

export const emailService = {
  getDiagnostics() {
    const user = getGmailUser();
    const pass = getGmailPass();
    const userConfigured = Boolean(user && user.length > 0);
    const passConfigured = Boolean(pass && pass.length > 0);
    const isConfigured = userConfigured && passConfigured;

    return {
      GMAIL_CONFIGURED: isConfigured,
      GMAIL_USER_CONFIGURED: userConfigured,
      GMAIL_APP_PASSWORD_CONFIGURED: passConfigured,
      GMAIL_USER: user
    };
  },

  getMissingCredentialsError() {
    return {
      error: 'Gmail SMTP is not configured',
      details: 'GMAIL_USER or GMAIL_APP_PASSWORD is missing',
      message: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
    };
  },

  async verifySmtp(): Promise<{ success: boolean; message: string }> {
    const diag = this.getDiagnostics();
    if (!diag.GMAIL_CONFIGURED) {
      return {
        success: false,
        message: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
      };
    }

    try {
      const transporter = getTransporter();
      await new Promise<void>((resolve, reject) => {
        transporter.verify((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return { success: true, message: 'SMTP transporter verified successfully.' };
    } catch (err: any) {
      const sanitized = sanitizeError(err);
      console.error('SMTP Transporter verification error:', sanitized);
      return { success: false, message: `SMTP verification failed: ${sanitized}` };
    }
  },

  async sendWelcomeEmail(email: string, unsubscribeUrl?: string): Promise<{ success: boolean; message?: string }> {
    const user = getGmailUser();
    const pass = getGmailPass();
    if (!pass) {
      console.log(`[EMAIL INFO] Welcome email recorded for ${email}. Set GMAIL_APP_PASSWORD in environment to enable live SMTP delivery.`);
      return { success: true, message: 'Welcome email queued.' };
    }

    const unsubFooter = unsubscribeUrl
      ? `<br/><a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>`
      : '';

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"ProBitian" <${user}>`,
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
              ProBitian &bull; Official Learning Hub &bull; <a href="mailto:${user}" style="color: #7c3aed;">${user}</a>${unsubFooter}
            </p>
          </div>
        `
      });
      console.log(`[EMAIL SUCCESS] Welcome email delivered to ${email}`);
      return { success: true, message: 'Welcome email sent successfully.' };
    } catch (error: any) {
      const sanitized = sanitizeError(error);
      console.error('Error sending welcome email:', sanitized);
      return { success: false, message: sanitized || 'Failed to send welcome email via SMTP.' };
    }
  },

  async sendAdminReply(email: string, subject: string, replyMessage: string): Promise<{ success: boolean; message?: string }> {
    const user = getGmailUser();
    const pass = getGmailPass();
    if (!pass) {
      console.log(`[EMAIL INFO] Reply recorded for ${email}. Set GMAIL_APP_PASSWORD in environment to enable live SMTP dispatch.`);
      return { success: true, message: 'Reply saved in database.' };
    }

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"ProBitian Support" <${user}>`,
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
            <p>Best regards,<br/><strong>Shivam Singh</strong><br/><span style="color: #64748b; font-size: 12px;">Founder & BI Specialist, ProBitian</span></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              ProBitian &bull; Official Support &bull; <a href="mailto:${user}" style="color: #7c3aed;">${user}</a>
            </p>
          </div>
        `
      });
      console.log(`[EMAIL SUCCESS] Admin reply delivered to ${email}`);
      return { success: true, message: 'Reply sent successfully via email.' };
    } catch (error: any) {
      const sanitized = sanitizeError(error);
      console.error('Error sending admin reply email:', sanitized);
      return { success: false, message: sanitized || 'Failed to dispatch email.' };
    }
  },

  async sendContactNotification(params: {
    name: string;
    email: string;
    phone?: string;
    course_interested?: string;
    subject?: string;
    message: string;
  }): Promise<{ success: boolean; message?: string }> {
    const user = getGmailUser();
    const pass = getGmailPass();
    if (!pass) {
      console.log(`[EMAIL INFO] Contact enquiry recorded from ${params.email}. Set GMAIL_APP_PASSWORD in environment to enable live SMTP dispatch.`);
      return { success: true, message: 'Contact enquiry recorded.' };
    }

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"ProBitian Contact System" <${user}>`,
        to: user, // Notify admin
        replyTo: params.email,
        subject: `[NEW CONTACT INQUIRY] ${params.subject || 'Website Inquiry'} from ${params.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; line-height: 1.6;">
            <div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #7c3aed;">
              <h2 style="color: #7c3aed; font-size: 20px; margin: 0;">New Contact Enquiry Received</h2>
            </div>
            <table style="width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td><td>${params.name}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${params.email}">${params.email}</a></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>${params.phone || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Interest:</td><td>${params.course_interested || 'General'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Subject:</td><td>${params.subject || 'N/A'}</td></tr>
            </table>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; white-space: pre-line;">
              <strong>Message:</strong><br/>
              ${params.message.replace(/\n/g, '<br/>')}
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              ProBitian Notification System &bull; <a href="mailto:${user}" style="color: #7c3aed;">${user}</a>
            </p>
          </div>
        `
      });
      console.log(`[EMAIL SUCCESS] Contact enquiry notification delivered for ${params.email}`);
      return { success: true, message: 'Notification sent successfully.' };
    } catch (error: any) {
      const sanitized = sanitizeError(error);
      console.error('Error sending contact notification email:', sanitized);
      return { success: false, message: sanitized || 'Failed to dispatch contact email.' };
    }
  }
};


