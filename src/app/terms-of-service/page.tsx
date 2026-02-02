import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | E2W Lead Management Platform',
  description: 'Terms of Service for E2W Lead Management Platform',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        
        <p className="text-sm text-gray-600 mb-8">
          Last Updated: November 29, 2025
        </p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using E2W Lead Management Platform ("Service", "Platform", "we", "us", or "our"), 
              you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these 
              terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              E2W Lead Management Platform is a business application that helps organizations manage leads 
              collected through various sources, including Facebook Lead Ads. The Service includes:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Lead capture and storage</li>
              <li>Lead assignment and distribution</li>
              <li>Follow-up tracking and scheduling</li>
              <li>Call logging and notes management</li>
              <li>Reporting and analytics</li>
              <li>Integration with Meta/Facebook Lead Ads</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">3.1 Account Creation</h3>
            <p>
              To use the Service, you must create an account. You agree to provide accurate, current, and 
              complete information during registration and to update such information to keep it accurate.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">3.2 Account Security</h3>
            <p>
              You are responsible for safeguarding your password and for all activities that occur under 
              your account. You must notify us immediately upon becoming aware of any breach of security.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">3.3 Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms or 
              engage in fraudulent, illegal, or harmful activities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p className="mb-2">You agree NOT to use the Service to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Send spam, unsolicited communications, or harassment</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use the Service for any unlawful or fraudulent purpose</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Facebook Integration</h2>
            <p>
              When using our Facebook Lead Ads integration, you also agree to comply with:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Meta's Platform Terms: https://developers.facebook.com/terms</li>
              <li>Facebook Terms of Service</li>
              <li>Meta's Business Tools Terms</li>
              <li>All applicable advertising and lead generation policies</li>
            </ul>
            <p className="mt-3">
              You are responsible for obtaining necessary consents from leads collected through Facebook 
              and for complying with all applicable privacy and marketing laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <a href="https://e2wleadmanager.vercel.app/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              . By using the Service, you consent to our collection, use, and disclosure of your data 
              as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">7.1 Our Rights</h3>
            <p>
              The Service and its original content, features, and functionality are owned by Baleen Media 
              and are protected by international copyright, trademark, patent, trade secret, and other 
              intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">7.2 Your Content</h3>
            <p>
              You retain ownership of any content you submit to the Service ("Your Content"). By 
              submitting Your Content, you grant us a worldwide, non-exclusive, royalty-free license 
              to use, store, and process Your Content solely for providing and improving the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Payment Terms</h2>
            <p>
              If you subscribe to a paid plan:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>We reserve the right to modify pricing with 30 days notice</li>
              <li>Failure to pay may result in account suspension or termination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">9. Service Availability</h2>
            <p>
              We strive to provide reliable service but do not guarantee that:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>The Service will be uninterrupted, timely, secure, or error-free</li>
              <li>Results obtained from the Service will be accurate or reliable</li>
              <li>The quality of the Service will meet your expectations</li>
              <li>Any errors in the Service will be corrected</li>
            </ul>
            <p className="mt-3">
              We may modify, suspend, or discontinue the Service at any time with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">10. Disclaimers</h2>
            <p className="uppercase font-semibold mb-2">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
            </p>
            <p>
              We disclaim all warranties, express or implied, including but not limited to implied 
              warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Baleen Media shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other 
              intangible losses resulting from:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Your access to or use of or inability to access or use the Service</li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Baleen Media, its officers, directors, 
              employees, agents, and third parties, from and against any losses, damages, liabilities, 
              claims, or expenses arising out of:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your violation of any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, 
              without regard to its conflict of law provisions. Any disputes arising from these Terms 
              shall be subject to the exclusive jurisdiction of the courts in [Your City/State].
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">14. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. Material changes will 
              be notified at least 30 days in advance. Your continued use of the Service after changes 
              take effect constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">15. Severability</h2>
            <p>
              If any provision of these Terms is held to be unenforceable or invalid, such provision 
              will be changed and interpreted to accomplish the objectives of such provision to the 
              greatest extent possible under applicable law, and the remaining provisions will continue 
              in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">16. Entire Agreement</h2>
            <p>
              These Terms constitute the entire agreement between you and Baleen Media regarding the 
              Service and supersede all prior agreements and understandings, whether written or oral.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">17. Contact Information</h2>
            <p className="mb-2">
              For questions about these Terms, please contact us:
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
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            By using E2W Lead Management Platform, you acknowledge that you have read, understood, 
            and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
