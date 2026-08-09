export interface LegalSection {
  id: string;
  title: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  effectiveDate: string;
  jurisdiction?: string;
  sections: LegalSection[];
}

export interface LegalSettings {
  terms: LegalDocument;
  privacy: LegalDocument;
  contactEmail: string;
  governingLaw: string;
}

export const DEFAULT_TERMS_DOCUMENT: LegalDocument = {
  title: "Terms of Service",
  subtitle: "Terms governing your use of the ProBitian website, learning resources and services.",
  lastUpdated: "2026-08-09T00:00:00.000Z",
  effectiveDate: "August 9, 2026",
  jurisdiction: "[Configure applicable jurisdiction]",
  sections: [
    {
      id: "terms-1",
      title: "1. Introduction",
      body: "Welcome to ProBitian. These Terms of Service (\"Terms\") govern your access to and use of the ProBitian website, learning modules, code samples, templates, and related educational services."
    },
    {
      id: "terms-2",
      title: "2. Acceptance of Terms",
      body: "By accessing or using ProBitian, you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree with any part of these Terms, please discontinue using our website and learning resources."
    },
    {
      id: "terms-3",
      title: "3. About ProBitian",
      body: "ProBitian is an online educational platform dedicated to Business Intelligence, Power BI, SQL, Excel, Power Query, Microsoft Fabric, and AI analytics tools. We provide learning guides, project portfolio templates, and technical tutorials for aspiring data analysts and professionals."
    },
    {
      id: "terms-4",
      title: "4. Use of the Website",
      body: "You are granted a non-exclusive, non-transferable, revocable license to access and use our public website and educational resources for personal, non-commercial learning purposes. You agree not to misuse or disrupt our services."
    },
    {
      id: "terms-5",
      title: "5. Educational Content",
      body: "All tutorials, code snippets, DAX patterns, SQL scripts, and Power BI dashboard templates provided on ProBitian are created for skill-building and educational purposes. ProBitian does not issue official university degrees or accredited academic certifications unless explicitly specified."
    },
    {
      id: "terms-6",
      title: "6. Accounts and Access",
      body: "Access to public learning resources on ProBitian does not require account registration. Where administrative access or specific user portals are available, users are responsible for maintaining the confidentiality of their credentials."
    },
    {
      id: "terms-7",
      title: "7. User Submissions and Enquiries",
      body: "When you submit an enquiry through our Contact form or subscribe to our newsletter, you agree to provide accurate and truthful contact information. All user enquiries are processed in accordance with our Privacy Policy."
    },
    {
      id: "terms-8",
      title: "8. Intellectual Property",
      body: "All original website design, branding, logos, graphics, source code, and written tutorials on ProBitian are the intellectual property of ProBitian and Shivam Baghel. You may not republish, sell, or commercially redistribute our starter datasets or proprietary templates without prior written permission."
    },
    {
      id: "terms-9",
      title: "9. Third-Party Links and Services",
      body: "ProBitian contains links to external third-party platforms, including YouTube, Instagram, Facebook, GitHub, and documentation sites. ProBitian is not responsible for the content, uptime, or privacy practices of external third-party services."
    },
    {
      id: "terms-10",
      title: "10. Accuracy of Information",
      body: "While we make every effort to maintain accurate, up-to-date code examples and tutorials, software frameworks and APIs evolve continuously. ProBitian provides information on an \"as is\" basis without warranty of error-free execution."
    },
    {
      id: "terms-11",
      title: "11. Website Availability",
      body: "We strive to maintain continuous website availability. However, ProBitian may undergo maintenance, updates, or temporary technical downtime without prior notice."
    },
    {
      id: "terms-12",
      title: "12. Prohibited Activities",
      body: "You agree not to engage in malicious activities, including scraping site content at excessive automated scale, injecting malicious scripts, attempting unauthorized administrative portal access, or misusing contact forms for unsolicited marketing spam."
    },
    {
      id: "terms-13",
      title: "13. Disclaimer",
      body: "Educational materials on ProBitian are provided on an \"AS IS\" and \"AS AVAILABLE\" basis. ProBitian makes no express or implied guarantees regarding employment outcomes, salary promises, or specific commercial business results achieved using our tutorials."
    },
    {
      id: "terms-14",
      title: "14. Limitation of Liability",
      body: "To the maximum extent permitted by applicable law, ProBitian shall not be liable for any indirect, incidental, or consequential damages resulting from your use of or inability to use the website or learning materials."
    },
    {
      id: "terms-15",
      title: "15. Indemnification",
      body: "You agree to indemnify and hold harmless ProBitian, its creators, and administrative operators from any claims, liabilities, or expenses arising out of your violation of these Terms or misuse of the website."
    },
    {
      id: "terms-16",
      title: "16. Changes to the Terms",
      body: "We reserve the right to modify or update these Terms of Service at any time. Any changes become effective immediately upon being published to this page with an updated \"Last Updated\" date."
    },
    {
      id: "terms-17",
      title: "17. Governing Law",
      body: "Governing Law: [Configure applicable jurisdiction]. These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles."
    },
    {
      id: "terms-18",
      title: "18. Contact Information",
      body: "If you have questions regarding these Terms of Service, please contact Shivam Baghel directly at probitianofficial@gmail.com."
    }
  ]
};

export const DEFAULT_PRIVACY_DOCUMENT: LegalDocument = {
  title: "Privacy Policy",
  subtitle: "How ProBitian collects, uses, stores and protects personal information.",
  lastUpdated: "2026-08-09T00:00:00.000Z",
  effectiveDate: "August 9, 2026",
  sections: [
    {
      id: "priv-1",
      title: "1. Introduction",
      body: "ProBitian (\"we\", \"our\", or \"us\") respects your privacy. This Privacy Policy explains how we collect, use, store, and protect personal information when you visit our website, submit contact enquiries, or subscribe to our newsletter."
    },
    {
      id: "priv-2",
      title: "2. Information We Collect",
      body: "We collect information that you voluntarily provide to us when filling out website forms, as well as standard technical analytics information collected automatically during your visit."
    },
    {
      id: "priv-3",
      title: "3. Information You Provide",
      body: "When you submit a message through our Contact form or subscribe to our newsletter, we collect personal details including your Full Name, Email Address, Contact Phone Number, Interested Course, Subject, and Inquiry Message."
    },
    {
      id: "priv-4",
      title: "4. Automatically Collected Information",
      body: "When you navigate our website, Google Analytics 4 (GA4) may automatically collect standard technical parameters such as IP address, browser type, device category, referring URL, pages viewed, and session engagement duration."
    },
    {
      id: "priv-5",
      title: "5. How We Use Information",
      body: "Information collected is used strictly to respond to your contact enquiries, deliver requested course details or newsletter updates, maintain website security, analyze platform usage patterns, and improve our Business Intelligence learning content."
    },
    {
      id: "priv-6",
      title: "6. Newsletter Communications",
      body: "If you subscribe to our newsletter, we store your email address to send free DAX, SQL, and Power BI guides. You may request unsubscription at any time by contacting us."
    },
    {
      id: "priv-7",
      title: "7. Contact Enquiries",
      body: "Enquiries submitted through our Contact form are stored securely to enable our administrative team to review and respond to your inquiry via email."
    },
    {
      id: "priv-8",
      title: "8. Analytics and Google Analytics",
      body: "We use Google Analytics 4 (GA4) to understand aggregate website visitor traffic. GA4 processes technical usage data in accordance with Google's service privacy standards without collecting sensitive personal identity files."
    },
    {
      id: "priv-9",
      title: "9. Cookies / Similar Technologies",
      body: "ProBitian uses minimal browser storage (such as LocalStorage for theme preferences) and standard essential cookies associated with analytics services to ensure seamless site performance."
    },
    {
      id: "priv-10",
      title: "10. Third-Party Services",
      body: "Our website relies on secure third-party service infrastructure, including Supabase (data storage), Google Workspace / Gmail API (email processing), and Google Analytics."
    },
    {
      id: "priv-11",
      title: "11. Supabase / Data Storage",
      body: "Contact enquiries and newsletter subscription records are stored in encrypted Supabase database collections protected by administrative credentials and row-level access policies."
    },
    {
      id: "priv-12",
      title: "12. Gmail / Email Processing",
      body: "When our team replies to your contact enquiry, the email is dispatched via secure Google Workspace / Gmail API server integrations."
    },
    {
      id: "priv-13",
      title: "13. YouTube / External Content",
      body: "Embedded YouTube tutorial cards and channel links on ProBitian operate in accordance with YouTube's standard terms and privacy policies."
    },
    {
      id: "priv-14",
      title: "14. Data Retention",
      body: "We retain personal enquiry information only for as long as necessary to fulfill the communication purpose or as required for legitimate website administrative logging."
    },
    {
      id: "priv-15",
      title: "15. Data Security",
      body: "We implement appropriate administrative and technical security measures, including HTTPS SSL encryption, environment variable secret management, and access-controlled administrative endpoints."
    },
    {
      id: "priv-16",
      title: "16. Data Sharing",
      body: "ProBitian does NOT sell, rent, or trade your personal information to third parties, advertising networks, or data brokers."
    },
    {
      id: "priv-17",
      title: "17. Your Privacy Rights",
      body: "Under applicable privacy laws (including India's Digital Personal Data Protection Act, 2023 / DPDP Rules), you have the right to request access to, correction of, or deletion of your personal data stored on our platform."
    },
    {
      id: "priv-18",
      title: "18. Consent and Withdrawal",
      body: "By submitting information on our forms, you consent to its processing for the intended enquiry response. You may withdraw consent or request deletion at any time by sending an email request."
    },
    {
      id: "priv-19",
      title: "19. Children's Privacy",
      body: "ProBitian is designed for adult learners, university students, and working professionals. We do not knowingly collect personal data from children under 13."
    },
    {
      id: "priv-20",
      title: "20. International Data Transfers",
      body: "As ProBitian serves learners worldwide, technical data may be processed on secure cloud server nodes adhering to industry-standard data protection standards."
    },
    {
      id: "priv-21",
      title: "21. Changes to This Privacy Policy",
      body: "We may update this Privacy Policy periodically. Updated versions will be published to this page with a revised \"Last Updated\" timestamp."
    },
    {
      id: "priv-22",
      title: "22. Contact Us",
      body: "For any privacy questions, data correction requests, or privacy concerns, please contact Shivam Baghel at probitianofficial@gmail.com."
    }
  ]
};

export const DEFAULT_LEGAL_SETTINGS: LegalSettings = {
  terms: DEFAULT_TERMS_DOCUMENT,
  privacy: DEFAULT_PRIVACY_DOCUMENT,
  contactEmail: "probitianofficial@gmail.com",
  governingLaw: "[Configure applicable jurisdiction]"
};
