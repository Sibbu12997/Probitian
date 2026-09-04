import { sanitizeCmsHtml, escapeHtml } from '../../../../lib/htmlSanitizer';
import { Lead } from '../../../../types';
import { DEFAULT_SAMPLE_LEAD } from './constants';

export function sanitizePreviewHtml(rawHtml?: string): string {
  return sanitizeCmsHtml(rawHtml);
}

export function interpolatePreviewText(
  text: string,
  sampleLead: Partial<Lead> = DEFAULT_SAMPLE_LEAD,
  isHtml: boolean = false
): string {
  if (!text) return '';
  let res = text;
  const company = sampleLead.company_name || 'Tata Motors Commercial';
  const contact = sampleLead.contact_person || 'Amit Deshmukh';
  const industry = sampleLead.industry || 'Automotive Manufacturing';
  const location = sampleLead.location || 'Pune, Maharashtra';
  const useCase = sampleLead.powerbi_use_case || 'Plant Assembly Line OEE, Downtime Analysis & Scrap Costing Dashboard';
  const phone = sampleLead.phone || '+91 98220 11223';
  const linkedin = sampleLead.linkedin || 'https://linkedin.com/in/amit-deshmukh';
  const priority = sampleLead.lead_priority || 'High';
  const email = sampleLead.email || 'amit.deshmukh@tatamotors.com';

  const rawMapping: Record<string, string> = {
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
    email: email
  };

  for (const [key, rawVal] of Object.entries(rawMapping)) {
    const val = isHtml ? escapeHtml(rawVal) : rawVal;
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    res = res.replace(regex, val);
  }
  return res.replace(/{{\s*[\w_]+\s*}}/g, '');
}
