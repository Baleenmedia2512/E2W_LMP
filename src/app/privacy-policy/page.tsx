import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | E2W Lead Management Platform',
  description: 'Privacy Policy for E2W Lead Management Platform - Facebook Lead Integration',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <p className="text-sm text-gray-600 mb-8">
          Last Updated: November 29, 2025
        </p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to E2W Lead Management Platform ("we," "our," or "us"). This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our lead management 
              platform, including our integration with Facebook Lead Ads.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.1 Information from Facebook Lead Ads</h3>
            <p className="mb-2">When you submit a lead form through Facebook, we collect:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Full name</li>
              <li>Phone number</li>
              <li>Email address</li>
              <li>Any custom questions answered in the lead form</li>
              <li>Facebook Page ID and Lead ID</li>
              <li>Campaign, Ad Set, and Ad information</li>
              <li>Timestamp of form submission</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use the collected information to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Manage and respond to leads submitted through Facebook Lead Ads</li>
              <li>Contact you regarding your inquiry or interest in our services/products</li>
              <li>Assign leads to appropriate sales agents for follow-up</li>
              <li>Track lead status and manage sales pipeline</li>
              <li>Analyze campaign performance and improve our services</li>
              <li>Send follow-up communications related to your inquiry</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Data Storage and Security</h2>
            <p className="mb-2">
              We implement appropriate technical and organizational security measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Encrypted data transmission (HTTPS/SSL)</li>
              <li>Secure database storage with access controls</li>
              <li>Regular security audits and updates</li>
              <li>Role-based access for team members</li>
              <li>Data backup and disaster recovery procedures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined 
              in this Privacy Policy, unless a longer retention period is required or permitted by law. 
              Typically, lead data is retained for:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Active leads: Until converted or marked as closed</li>
              <li>Closed leads: Up to 2 years for business records and analytics</li>
              <li>You may request deletion at any time (see Section 8)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Data Sharing and Disclosure</h2>
            <p className="mb-2">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Internal Team:</strong> Sales agents and managers assigned to handle your inquiry</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate (hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Facebook Integration</h2>
            <p>
              Our platform integrates with Facebook Lead Ads using Meta's official API. When you submit 
              a lead form on Facebook:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Your data is transmitted securely from Facebook to our platform via webhook</li>
              <li>We receive only the information you explicitly provided in the lead form</li>
              <li>This integration is authorized and complies with Meta's Platform Terms</li>
              <li>You can review Facebook's Data Policy at: https://www.facebook.com/privacy/policy/</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data we hold</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (see Data Deletion section below)</li>
              <li><strong>Restriction:</strong> Request limitation of processing your data</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Object:</strong> Object to processing of your personal data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Data Deletion</h2>
            <p className="mb-2">
              To request deletion of your data collected through Facebook Lead Ads, please visit our{' '}
              <a href="/data-deletion" className="text-blue-600 hover:underline">
                Data Deletion Request page
              </a>{' '}
              or contact us directly at the information below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to improve user experience and analyze 
              platform usage. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Children's Privacy</h2>
            <p>
              Our service is not intended for individuals under the age of 18. We do not knowingly 
              collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">12. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country 
              of residence. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">13. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">14. Contact Us</h2>
            <p className="mb-2">
              If you have questions or concerns about this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              <p className="font-semibold">E2W Lead Management Platform</p>
              <p>Baleen Media</p>
              <p className="mt-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:support@baleenmedia.com" className="text-blue-600 hover:underline">
                  support@baleenmedia.com
                </a>
              </p>
              <p>
                <strong>Phone:</strong> +91-XXXXXXXXXX
              </p>
              <p className="mt-2">
                <strong>Address:</strong> [Your Business Address]
              </p>
            </div>
          </section>

          <section className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Compliance</h2>
            <p>
              This Privacy Policy is designed to comply with applicable data protection laws including:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>General Data Protection Regulation (GDPR)</li>
              <li>California Consumer Privacy Act (CCPA)</li>
              <li>Meta Platform Terms and Policies</li>
              <li>Information Technology Act, 2000 (India)</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            By using our service, you acknowledge that you have read and understood this Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
