import { getGmailUser, getGmailPass, getTransporter, sanitizeError } from './emailService';
import { PROBITIAN_LOGO_URL } from '../constants/branding';

export const campaignEmailService = {
  isConfigured(): boolean {
    const gmailPass = getGmailPass();
    return Boolean(gmailPass && gmailPass.length > 0);
  },

  getSenderInfo(): string {
    const gmailUser = getGmailUser();
    return `ProBitian Newsletter <${gmailUser}> (via Gmail SMTP)`;
  },

  getLeadSenderInfo(): string {
    const gmailUser = getGmailUser();
    return `Shivam from ProBitian <${gmailUser}> (via Gmail SMTP)`;
  },

  interpolateLeadVariables(template: string, lead: Record<string, any> = {}): string {
    if (!template) return '';
    let result = template;

    const company = lead.company_name || lead.company || lead.companyname || 'your company';
    const contact = lead.contact_person || lead.contactperson || lead.name || lead.fullname || lead.person || 'Team';
    const industry = lead.industry || lead.sector || 'your industry';
    const location = lead.location || lead.city || lead.region || 'your region';
    const useCase = lead.powerbi_use_case || lead.power_bi_use_case || lead.powerbiusecase || lead.use_case || lead.usecase || 'business analytics & Power BI reporting';
    const phone = lead.phone || lead.mobile || lead.tel || '';
    const linkedin = lead.linkedin || lead.linkedin_url || lead.linkedinurl || '';
    const priority = lead.lead_priority || lead.leadpriority || lead.priority || 'Standard';
    const email = lead.email || '';
    const status = lead.status || lead.lead_status || '';
    const notes = lead.notes || '';
    const followUpDate = lead.follow_up_date || lead.followup_date || lead.followupdate || '';

    const mapping: Record<string, string> = {
      company_name: company,
      company: company,
      companyname: company,
      contact_person: contact,
      contactperson: contact,
      contact: contact,
      name: contact,
      fullname: contact,
      person: contact,
      industry: industry,
      sector: industry,
      location: location,
      city: location,
      region: location,
      powerbi_use_case: useCase,
      power_bi_use_case: useCase,
      powerbiusecase: useCase,
      use_case: useCase,
      usecase: useCase,
      phone: phone,
      mobile: phone,
      tel: phone,
      linkedin: linkedin,
      linkedin_url: linkedin,
      linkedinurl: linkedin,
      lead_priority: priority,
      leadpriority: priority,
      priority: priority,
      email: email,
      status: status,
      lead_status: status,
      notes: notes,
      follow_up_date: followUpDate,
      followup_date: followUpDate,
      followupdate: followUpDate
    };

    for (const [key, val] of Object.entries(mapping)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(regex, String(val ?? ''));
    }

    // Clean up any remaining unmatched template variables
    result = result.replace(/{{\s*[\w_]+\s*}}/g, '');

    return result;
  },

  generateCampaignHtml(params: {
    subject: string;
    previewText?: string;
    contentHtml: string;
    unsubscribeUrl: string;
  }): string {
    const gmailUser = getGmailUser();
    const { previewText, contentHtml, unsubscribeUrl } = params;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProBitian Newsletter</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
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
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="${PROBITIAN_LOGO_URL}" alt="ProBitian" width="48" height="48" style="display: inline-block; width: 48px; height: 48px; object-fit: contain; border-radius: 50%;" />
      </div>
      <h1 class="header-title">ProBitian Community Bulletin</h1>
      <p class="header-subtitle">Master Business Intelligence, SQL & Power BI</p>
    </div>
    
    <div class="body-content">
      ${contentHtml}
    </div>

    <div class="footer">
      <p style="margin: 0; font-weight: 600; color: #475569;">ProBitian Global BI Community Hub</p>
      <p style="margin: 4px 0;">Salaiya, Madhya Pradesh 486440, India</p>
      <p style="margin: 4px 0;">Official Support: <a href="mailto:${gmailUser}" style="color: #7c3aed;">${gmailUser}</a></p>
      
      <div class="footer-links">
        <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer">Unsubscribe from Newsletter</a> &bull; 
        <a href="https://probitian.ai.studio/#/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
      </div>
      <p style="margin-top: 12px; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} ProBitian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  },

  generateLeadOutreachHtml(params: {
    subject: string;
    preheader?: string;
    contentHtml: string;
    lead?: Record<string, any>;
  }): string {
    const gmailUser = getGmailUser();
    const { preheader, contentHtml, lead = {} } = params;
    let interpolatedBody = this.interpolateLeadVariables(contentHtml, lead);
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(interpolatedBody);
    if (!hasHtmlTags) {
      interpolatedBody = interpolatedBody
        .split(/\n\s*\n/)
        .map(para => `<p style="margin-top: 0; margin-bottom: 16px;">${para.replace(/\n/g, '<br/>')}</p>`)
        .join('');
    }
    const interpolatedPreheader = preheader ? this.interpolateLeadVariables(preheader, lead) : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProBitian Business Intelligence</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 24px; display: flex; align-items: center; border-bottom: 2px solid #f59e0b; }
    .logo-badge { display: inline-block; background-color: #f59e0b; color: #0f172a; font-weight: 900; padding: 4px 10px; border-radius: 6px; font-size: 14px; margin-right: 12px; }
    .header-text { display: inline-block; vertical-align: middle; }
    .header-title { color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; }
    .header-tagline { color: #94a3b8; font-size: 12px; margin: 2px 0 0 0; }
    .body-content { padding: 32px 28px; font-size: 15px; color: #334155; line-height: 1.7; }
    .body-content h1, .body-content h2, .body-content h3 { color: #0f172a; margin-top: 20px; margin-bottom: 12px; font-weight: 700; }
    .body-content p { margin-top: 0; margin-bottom: 16px; }
    .body-content a { color: #7c3aed; text-decoration: underline; font-weight: 600; }
    .body-content ul, .body-content ol { padding-left: 20px; margin-bottom: 16px; }
    .body-content li { margin-bottom: 6px; }
    .btn-cta { display: inline-block; background-color: #7c3aed; color: #ffffff !important; font-weight: 700; text-decoration: none !important; padding: 12px 24px; border-radius: 8px; margin: 16px 0; font-size: 14px; text-align: center; }
    .footer { background-color: #f1f5f9; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
    .preview-text { display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; }
  </style>
</head>
<body>
  ${interpolatedPreheader ? `<div class="preview-text">${interpolatedPreheader}</div>` : ''}
  <div class="container">
    <div class="header">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="46" style="vertical-align: middle;">
            <img src="${PROBITIAN_LOGO_URL}" alt="ProBitian" width="38" height="38" style="display: block; width: 38px; height: 38px; object-fit: contain; border-radius: 50%;" />
          </td>
          <td style="vertical-align: middle; padding-left: 8px;">
            <div class="header-title">ProBitian</div>
            <div class="header-tagline">Enterprise Power BI & MIS Automation</div>
          </td>
        </tr>
      </table>
    </div>
    
    <div class="body-content">
      ${interpolatedBody}
    </div>

    <div class="footer">
      <p style="margin: 0; font-weight: 600; color: #475569;">Shivam Baghel &bull; ProBitian Analytics</p>
      <p style="margin: 4px 0;">Salaiya, Madhya Pradesh, India &bull; Direct: <a href="mailto:${gmailUser}" style="color: #7c3aed;">${gmailUser}</a></p>
      <p style="margin: 4px 0;"><a href="https://probitian.com" style="color: #7c3aed; text-decoration: none;">www.probitian.com</a> &bull; Power BI &amp; Data Engineering Solutions</p>
      <p style="margin-top: 12px; font-size: 11px; color: #94a3b8;">If you prefer not to receive business intelligence insights from us, simply reply with "Unsubscribe".</p>
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
    const gmailUser = getGmailUser();
    const gmailPass = getGmailPass();
    const html = this.generateCampaignHtml({
      subject: params.subject,
      previewText: params.previewText,
      contentHtml: params.contentHtml,
      unsubscribeUrl: params.unsubscribeUrl
    });

    if (gmailPass) {
      try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({
          from: `"ProBitian Newsletter" <${gmailUser}>`,
          to: params.testEmail,
          subject: `[TEST CAMPAIGN] ${params.subject}`,
          html: html
        });
        return {
          success: true,
          message: `Test campaign email dispatched via Gmail SMTP to ${params.testEmail}`,
          messageId: info.messageId
        };
      } catch (err: any) {
        const sanitized = sanitizeError(err);
        return {
          success: false,
          message: `Gmail SMTP Error: ${sanitized || 'Failed to dispatch test email.'}`
        };
      }
    }

    return {
      success: false,
      message: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
    };
  },

  async sendSingleRecipient(params: {
    toEmail: string;
    subject: string;
    previewText?: string;
    contentHtml: string;
    unsubscribeUrl: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const gmailUser = getGmailUser();
    const gmailPass = getGmailPass();
    const html = this.generateCampaignHtml({
      subject: params.subject,
      previewText: params.previewText,
      contentHtml: params.contentHtml,
      unsubscribeUrl: params.unsubscribeUrl
    });

    if (gmailPass) {
      try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({
          from: `"ProBitian Newsletter" <${gmailUser}>`,
          to: params.toEmail,
          subject: params.subject,
          html: html
        });
        return {
          success: true,
          messageId: info.messageId
        };
      } catch (err: any) {
        const sanitized = sanitizeError(err);
        return {
          success: false,
          error: sanitized || 'SMTP delivery error via Gmail.'
        };
      }
    }

    return {
      success: false,
      error: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
    };
  },

  async sendLeadTestEmail(params: {
    testEmail: string;
    subject: string;
    preheader?: string;
    contentHtml: string;
    lead?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; messageId?: string }> {
    const gmailUser = getGmailUser();
    const gmailPass = getGmailPass();
    const leadData = params.lead || {
      company_name: 'Sample Enterprise Corp',
      industry: 'Manufacturing & Distribution',
      location: 'Indore, MP',
      contact_person: 'Shivam Baghel',
      email: params.testEmail,
      phone: '+91 98765 43210',
      linkedin: 'https://linkedin.com/in/probitian',
      powerbi_use_case: 'Plant Operations & Inventory MIS Dashboard',
      lead_priority: 'High'
    };

    const personalizedSubject = this.interpolateLeadVariables(params.subject, leadData);
    const html = this.generateLeadOutreachHtml({
      subject: personalizedSubject,
      preheader: params.preheader,
      contentHtml: params.contentHtml,
      lead: leadData
    });

    if (gmailPass) {
      try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({
          from: `"Shivam from ProBitian" <${gmailUser}>`,
          to: params.testEmail,
          subject: `[TEST OUTREACH] ${personalizedSubject}`,
          html: html
        });
        return {
          success: true,
          message: `Test lead outreach email dispatched via Gmail SMTP to ${params.testEmail}`,
          messageId: info.messageId
        };
      } catch (err: any) {
        const sanitized = sanitizeError(err);
        return {
          success: false,
          message: `Gmail SMTP Error: ${sanitized || 'Failed to dispatch test lead email.'}`
        };
      }
    }

    return {
      success: false,
      message: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
    };
  },

  async sendLeadSingleRecipient(params: {
    toEmail: string;
    subject: string;
    preheader?: string;
    contentHtml: string;
    lead: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const gmailUser = getGmailUser();
    const gmailPass = getGmailPass();
    const personalizedSubject = this.interpolateLeadVariables(params.subject, params.lead);
    const html = this.generateLeadOutreachHtml({
      subject: personalizedSubject,
      preheader: params.preheader,
      contentHtml: params.contentHtml,
      lead: params.lead
    });

    if (gmailPass) {
      try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({
          from: `"Shivam from ProBitian" <${gmailUser}>`,
          to: params.toEmail,
          subject: personalizedSubject,
          html: html
        });
        return {
          success: true,
          messageId: info.messageId
        };
      } catch (err: any) {
        const sanitized = sanitizeError(err);
        return {
          success: false,
          error: sanitized || 'SMTP delivery error via Gmail.'
        };
      }
    }

    return {
      success: false,
      error: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
    };
  }
};
