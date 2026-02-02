import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Request | E2W Lead Management Platform',
  description: 'Request deletion of your data collected through Facebook Lead Ads',
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Data Deletion Request</h1>
        
        <p className="text-sm text-gray-600 mb-8">
          Last Updated: November 29, 2025
        </p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Your Right to Data Deletion</h2>
            <p>
              If you have submitted information through a Facebook Lead Ad that is processed by our platform, 
              you have the right to request deletion of your personal data. We are committed to respecting 
              your privacy and will process your request in accordance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">What Data Will Be Deleted</h2>
            <p className="mb-2">Upon your request, we will delete:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Your name, email address, and phone number</li>
              <li>Any information you provided in the lead form</li>
              <li>Associated notes, call logs, and follow-up history</li>
              <li>Campaign and source tracking information</li>
              <li>All other personal data related to your lead record</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Information We May Retain</h2>
            <p>
              We may retain certain information if required for legitimate business purposes or legal compliance:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Anonymized data for analytics (with all personal identifiers removed)</li>
              <li>Records required for legal, tax, or regulatory compliance</li>
              <li>Information necessary to resolve disputes or enforce agreements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to Request Data Deletion</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 my-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Method 1: Email Request</h3>
              <p className="mb-3">Send an email to:</p>
              <p className="text-lg">
                <a 
                  href="mailto:support@baleenmedia.com?subject=Facebook Data Deletion Request"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  support@baleenmedia.com
                </a>
              </p>
              
              <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                <p className="font-semibold mb-2">Please include in your email:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li><strong>Subject:</strong> Facebook Data Deletion Request</li>
                  <li><strong>Your Full Name:</strong> (as submitted in the lead form)</li>
                  <li><strong>Email Address:</strong> (used in the lead form)</li>
                  <li><strong>Phone Number:</strong> (used in the lead form)</li>
                  <li><strong>Facebook Page Name:</strong> (where you submitted the form, if known)</li>
                  <li><strong>Approximate Date:</strong> (when you submitted the form)</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Method 2: Phone Request</h3>
              <p className="mb-2">Call us at:</p>
              <p className="text-lg font-semibold">+91-XXXXXXXXXX</p>
              <p className="mt-2 text-sm">
                Business Hours: Monday - Friday, 9:00 AM - 6:00 PM IST
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Method 3: Written Request</h3>
              <p className="mb-2">Send a letter to:</p>
              <div className="mt-2">
                <p className="font-semibold">Baleen Media</p>
                <p>E2W Lead Management Platform - Data Protection Officer</p>
                <p className="mt-1">[Your Business Address]</p>
                <p>[City, State, PIN Code]</p>
                <p>India</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Processing Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
                  1
                </div>
                <div>
                  <p className="font-semibold">Request Receipt</p>
                  <p className="text-sm">We will acknowledge receipt of your request within 48 hours</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
                  2
                </div>
                <div>
                  <p className="font-semibold">Identity Verification</p>
                  <p className="text-sm">We may ask for additional information to verify your identity</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
                  3
                </div>
                <div>
                  <p className="font-semibold">Data Deletion</p>
                  <p className="text-sm">Your data will be deleted within 30 days of verification</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
                  4
                </div>
                <div>
                  <p className="font-semibold">Confirmation</p>
                  <p className="text-sm">We will send you confirmation once deletion is complete</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Identity Verification</h2>
            <p>
              To protect your privacy and prevent unauthorized deletion requests, we may require 
              verification of your identity. This may include:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>Matching the email address used in the original lead form</li>
              <li>Phone number verification via OTP</li>
              <li>Additional identifying information from the lead form</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Frequently Asked Questions</h2>
            
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-semibold text-gray-900">Q: Is there a fee for data deletion?</h4>
                <p className="text-gray-700 mt-1">A: No, data deletion requests are processed free of charge.</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">Q: How long does the deletion process take?</h4>
                <p className="text-gray-700 mt-1">
                  A: We aim to complete deletions within 30 days of verifying your identity, though 
                  it may be completed sooner in most cases.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">Q: Can I retrieve my data after deletion?</h4>
                <p className="text-gray-700 mt-1">
                  A: No, once deleted, your data cannot be recovered. Please be certain before submitting 
                  a deletion request.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">Q: Will deletion affect ongoing services?</h4>
                <p className="text-gray-700 mt-1">
                  A: If you have an active inquiry or ongoing relationship with the business that collected 
                  your lead, deletion may impact their ability to provide services. Consider contacting them 
                  directly first.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">Q: What about my Facebook data?</h4>
                <p className="text-gray-700 mt-1">
                  A: This process only deletes data stored in our platform. To delete data on Facebook, 
                  please visit Facebook's{' '}
                  <a 
                    href="https://www.facebook.com/help/contact/261149227954100" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    data deletion request page
                  </a>.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Other Data Rights</h2>
            <p className="mb-2">In addition to deletion, you also have the right to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Restriction:</strong> Request limitation of data processing</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, use the same contact methods listed above.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Privacy Policy</h2>
            <p>
              For more information about how we collect, use, and protect your data, please read our{' '}
              <a href="https://e2wleadmanager.vercel.app/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>.
            </p>
          </section>

          <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Important Note</h3>
            <p className="text-sm">
              We take data protection seriously and are committed to processing your deletion request 
              promptly. If you experience any issues or delays, please contact our Data Protection 
              Officer directly at the email address provided above.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            For immediate assistance, email{' '}
            <a 
              href="mailto:support@baleenmedia.com?subject=Facebook Data Deletion Request" 
              className="text-blue-600 hover:underline"
            >
              support@baleenmedia.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
