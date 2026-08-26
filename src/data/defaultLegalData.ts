export interface LegalSection {
  id: string;
  title: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export interface LegalSettings {
  terms: LegalDocument;
  privacy: LegalDocument;
  governingLaw: string;
  contactEmail: string;
}

export const DEFAULT_LEGAL_SETTINGS: LegalSettings = {
  governingLaw: 'India / International jurisdiction',
  contactEmail: 'probitianofficial@gmail.com',
  terms: {
    title: 'Terms of Service',
    subtitle: 'Please review the terms and conditions governing the use of ProBitian educational resources, code templates, and services.',
    effectiveDate: 'August 9, 2026',
    lastUpdated: '2026-08-09T00:00:00.000Z',
    sections: [
      {
        id: 'terms-1',
        title: '1. Acceptance of Terms',
        body: 'By accessing or using ProBitian (accessible via https://probitian.ai.studio/), you agree to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site.'
      },
      {
        id: 'terms-2',
        title: '2. Educational Use License',
        body: 'Permission is granted to temporarily download and review one copy of the materials (information or software) on ProBitian for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title. You may freely use the public code snippets, DAX formulas, and SQL scripts in your own personal and commercial BI projects with appropriate attribution.'
      },
      {
        id: 'terms-3',
        title: '3. Intellectual Property Rights',
        body: 'All tutorial content, video lectures, proprietary datasets, brand graphics, and written curriculum on ProBitian are the intellectual property of ProBitian and Shivam Singh unless otherwise specified. Unauthorized commercial resale or distribution of full course curriculum without express permission is strictly prohibited.'
      },
      {
        id: 'terms-4',
        title: '4. Disclaimer of Warranties',
        body: 'The materials on ProBitian are provided on an "as is" basis. ProBitian makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.'
      },
      {
        id: 'terms-5',
        title: '5. Limitations of Liability',
        body: 'In no event shall ProBitian or its contributors be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ProBitian.'
      },
      {
        id: 'terms-6',
        title: '6. Modifications and Contact',
        body: 'ProBitian may revise these Terms of Service at any time without prior notice. By using this website you are agreeing to be bound by the then current version of these Terms of Service. For questions regarding these terms, contact probitianofficial@gmail.com.'
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Learn how ProBitian collects, handles, stores, and protects your personal information and learning preferences.',
    effectiveDate: 'August 9, 2026',
    lastUpdated: '2026-08-09T00:00:00.000Z',
    sections: [
      {
        id: 'privacy-1',
        title: '1. Information We Collect',
        body: 'We collect information you provide directly to us, such as when you subscribe to our newsletter, fill out our contact inquiry form, or interact with our community learning portal. This may include your name, email address, phone number, and areas of interest in Business Intelligence.'
      },
      {
        id: 'privacy-2',
        title: '2. How We Use Your Information',
        body: 'We use the collected information solely to: provide, maintain, and improve our educational resources; respond to your comments, questions, and consultation requests; send you technical updates, new tutorials, and curriculum announcements; and monitor trends and usage on the website via aggregated analytics.'
      },
      {
        id: 'privacy-3',
        title: '3. Cookies and Analytics',
        body: 'We use industry-standard analytics tools (such as Google Analytics 4) to understand how visitors interact with our content. These tools utilize cookies to collect aggregated, non-personally identifiable traffic metrics, helping us optimize page performance, navigation, and educational value.'
      },
      {
        id: 'privacy-4',
        title: '4. Information Sharing and Disclosure',
        body: 'We respect your privacy and never sell, rent, or trade your personal information to third parties. We may disclose information only if required by law or in good faith belief that such action is necessary to comply with legal obligations or protect the rights and safety of ProBitian users.'
      },
      {
        id: 'privacy-5',
        title: '5. Data Security & Storage',
        body: 'We implement reasonable physical, technical, and administrative security measures to protect the confidentiality and security of personal information submitted to us. Form submissions and communications are encrypted in transit via HTTPS/TLS.'
      },
      {
        id: 'privacy-6',
        title: '6. Your Rights and Contact',
        body: 'You may unsubscribe from our educational newsletter at any time using the unsubscribe link in our emails, or request access to and deletion of your submitted contact details by emailing us directly at probitianofficial@gmail.com.'
      }
    ]
  }
};
