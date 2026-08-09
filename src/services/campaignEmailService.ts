import { Resend } from 'resend';

const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
const fromEmail = (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'ProBitian Newsletter <newsletter@probitian.com>').trim();

const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

export const campaignEmailService = {
  isConfigured(): boolean {
    return Boolean(resendApiKey && resendApiKey.length > 5);
  },

  getSenderInfo(): string {
    return fromEmail;
  },

  generateCampaignHtml(params: {
    subject: string;
    previewText?: string;
    contentHtml: string;
    unsubscribeUrl: string;
  }): string {
    const { previewText, contentHtml, unsubscribeUrl } = params;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProBitian Newsletter</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 24px; margin-bottom: 24px; shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 32px 24px; text-align: center; }
    .logo-badge { display: inline-block; background-color: #f59e0b; color: #0f172a; font-weight: 900; padding: 6px 12px; border-radius: 8px; font-size: 16px; letter-spacing: -0.5px; margin-bottom: 8px; }
    .header-title { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .header-subtitle { color: #c7d2fe; font-size: 13px; margin-top: 4px; margin-bottom: 0; }
    .body-content { padding: 32px 24px; font-size: 15px; color: #334155; }
    .body-content h1, .body-content h2, .body-content h3 { color: #0f172a; margin-top: 20px; margin-bottom: 12px; font-weight: 700; }
    .body-content p { margin-top: 0; margin-bottom: 16px; }
    .body-content a { color: #7c3aed; text-decoration: underline; font-weight: 600; }
    .body-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
    .btn-cta { display: inline-block; background-color: #7c3aed; color: #ffffff !important; font-weight: 700; text-decoration: none !important; padding: 12px 24px; border-radius: 8px; margin: 16px 0; font-size: 14px; text-align: center; }
    .footer { background-color: #f1f5f9; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
    .footer-links { margin-top: 12px; }
    .footer-links a { color: #64748b; text-decoration: underline; margin: 0 8px; }
    .preview-text { display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; }
  </style>
</head>
<body>
  ${previewText ? `<div class="preview-text">${previewText}</div>` : ''}
  <div class="container">
    <div class="header">
      <div class="logo-badge">PB</div>
      <h1 class="header-title">ProBitian Community Bulletin</h1>
      <p class="header-subtitle">Master Business Intelligence, SQL & Power BI</p>
    </div>
    
    <div class="body-content">
      ${contentHtml}
    </div>

    <div class="footer">
      <p style="margin: 0; font-weight: 600; color: #475569;">ProBitian Global BI Community Hub</p>
      <p style="margin: 4px 0;">Salaiya, Madhya Pradesh 486440, India</p>
      <p style="margin: 4px 0;">Official Support: <a href="mailto:probitianofficial@gmail.com" style="color: #7c3aed;">probitianofficial@gmail.com</a></p>
      
      <div class="footer-links">
        <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer">Unsubscribe from Newsletter</a> &bull; 
        <a href="https://probitian.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
      </div>
      <p style="margin-top: 12px; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} ProBitian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  },

  async sendTestEmail(params: {
    testEmail: string;
    subject: string;
    previewText?: string;
    contentHtml: string;
    unsubscribeUrl: string;
  }): Promise<{ success: boolean; message: string; messageId?: string }> {
    if (!resendClient) {
      console.log(`[RESEND INFO] Test campaign email to ${params.testEmail} recorded. RESEND_API_KEY environment variable is not configured.`);
      return {
        success: false,
        message: 'RESEND_API_KEY environment variable is not set on the server. Set RESEND_API_KEY to send live test emails.'
      };
    }

    try {
      const html = this.generateCampaignHtml({
        subject: params.subject,
        previewText: params.previewText,
        contentHtml: params.contentHtml,
        unsubscribeUrl: params.unsubscribeUrl
      });

      const response = await resendClient.emails.send({
        from: fromEmail,
        to: params.testEmail,
        subject: `[TEST CAMPAIGN] ${params.subject}`,
        html
      });

      if (response.error) {
        return {
          success: false,
          message: `Resend API Error: ${response.error.message}`
        };
      }

      return {
        success: true,
        message: `Test email dispatched successfully to ${params.testEmail}`,
        messageId: response.data?.id
      };
    } catch (err: any) {
      console.error('Error sending test campaign email:', err);
      return {
        success: false,
        message: err?.message || 'Failed to dispatch test email via Resend.'
      };
    }
  },

  async sendSingleRecipient(params: {
    toEmail: string;
    subject: string;
    previewText?: string;
    contentHtml: string;
    unsubscribeUrl: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!resendClient) {
      return {
        success: false,
        error: 'RESEND_API_KEY environment variable is missing on server.'
      };
    }

    try {
      const html = this.generateCampaignHtml({
        subject: params.subject,
        previewText: params.previewText,
        contentHtml: params.contentHtml,
        unsubscribeUrl: params.unsubscribeUrl
      });

      const response = await resendClient.emails.send({
        from: fromEmail,
        to: params.toEmail,
        subject: params.subject,
        html
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message
        };
      }

      return {
        success: true,
        messageId: response.data?.id
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error delivering via Resend.'
      };
    }
  }
};
