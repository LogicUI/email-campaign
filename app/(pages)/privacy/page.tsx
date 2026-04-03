import { Shield, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy",
  description: "Learn how EmailAI protects your data and privacy",
};

export default function PrivacyPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <p>
                This application allows users to send email outreach campaigns using
                their own Google account. We take your privacy seriously and are committed
                to protecting your personal information.
              </p>
            </CardContent>
          </Card>

          {/* Google Account Access */}
          <Card>
            <CardHeader>
              <CardTitle>Google Account Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">We access your Google account only with your permission to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Authenticate your identity</strong> - Verify who you are</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Send emails on your behalf via Gmail</strong> - Deliver campaigns through your account</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Google Data Accessed */}
          <Card>
            <CardHeader>
              <CardTitle>Google Data We Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">With your explicit permission, we access the following Google data:</p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Authentication Data</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email address (for account identification and sender identity)</li>
                    <li>Google User ID (for account linking)</li>
                    <li>Basic profile information (name)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Gmail API Access</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Send emails</strong> - Deliver your outreach campaigns through your Gmail account</li>
                    <li><strong>Scope</strong>: gmail.send only (does NOT read your emails)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Google Sheets API Access</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Import recipients</strong> - Read email lists from your Google Sheets</li>
                    <li><strong>Export results</strong> - Write campaign delivery results back to your Google Sheets</li>
                    <li><strong>Scope</strong>: Full spreadsheet read/write access (only to sheets you select)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Google Drive API Access</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>List spreadsheets</strong> - Display your Google Sheets files for selection</li>
                    <li><strong>Scope</strong>: Metadata only (file names, IDs, links) - does NOT access file contents except through Sheets API</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What We Do NOT Do */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">What We Do NOT Do</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">✕</span>
                  </div>
                  <span>Store your email password</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">✕</span>
                  </div>
                  <span>Read or store your personal emails</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">✕</span>
                  </div>
                  <span>Access your Gmail inbox or read your personal emails</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">✕</span>
                  </div>
                  <span>Store your Google Sheets data on our servers</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">✕</span>
                  </div>
                  <span>Access Google Drive file contents (except through Sheets API for files you explicitly select)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">✕</span>
                  </div>
                  <span>Share your data with third parties</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Storage & Security */}
          <Card>
            <CardHeader>
              <CardTitle>Data Storage & Security</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <h4 className="font-semibold mb-2">What We Store</h4>
              <ul className="space-y-2 mb-4">
                <li>• <strong>Database</strong>: Your email address and Google User ID for account identification</li>
                <li>• <strong>Session Storage</strong>: OAuth access tokens and refresh tokens (required to interact with Google APIs on your behalf)</li>
                <li>• <strong>Browser Session</strong>: Campaign drafts, recipient lists, and campaign results during your active session</li>
              </ul>

              <h4 className="font-semibold mb-2">What We Do NOT Store</h4>
              <ul className="space-y-2 mb-4">
                <li>• Your Gmail password or Google account credentials</li>
                <li>• Access to read your personal emails</li>
                <li>• Long-term storage of your campaign data (data persists in your browser session only)</li>
              </ul>

              <h4 className="font-semibold mb-2">Token Storage & Security</h4>
              <p className="mb-2">
                OAuth access and refresh tokens are stored securely in your session to authorize API calls to Google services.
                These tokens:
              </p>
              <ul className="space-y-2">
                <li>• Are required to send emails via Gmail API</li>
                <li>• Are required to access your Google Sheets for import/export</li>
                <li>• Automatically refresh when expired</li>
                <li>• Are cleared when you sign out</li>
              </ul>
            </CardContent>
          </Card>

          {/* How We Use Google User Data */}
          <Card>
            <CardHeader>
              <CardTitle>How We Use Google User Data</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <h4 className="font-semibold mb-2">Primary Purpose</h4>
              <p className="mb-4">
                Your Google data is used exclusively to enable email outreach campaigns through your own Google account.
                All actions are performed on your behalf using your authorized Google account.
              </p>

              <h4 className="font-semibold mb-2">Specific Use Cases</h4>
              <div className="space-y-3 ml-4">
                <div>
                  <strong>Authentication & Account Management:</strong>
                  <p className="ml-4 text-muted-foreground">
                    Your email address and Google User ID are used to identify your account and maintain your session.
                  </p>
                </div>

                <div>
                  <strong>Email Campaign Delivery:</strong>
                  <p className="ml-4 text-muted-foreground">
                    Your Gmail account is used to send emails to recipients you specify. Each email is sent individually
                    through the Gmail API using your authorized access token.
                  </p>
                </div>

                <div>
                  <strong>Recipient List Management:</strong>
                  <p className="ml-4 text-muted-foreground">
                    Google Sheets integration allows you to import recipient lists from your spreadsheets and export
                    campaign delivery results (status, timestamps, message IDs) back to your sheets.
                  </p>
                </div>

                <div>
                  <strong>File Selection:</strong>
                  <p className="ml-4 text-muted-foreground">
                    Google Drive metadata is used only to display your available spreadsheet files for selection.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Sharing & Disclosure */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sharing & Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <h4 className="font-semibold mb-2">Third-Party Services</h4>
              <p className="mb-4">
                Your data is shared with Google services solely to execute the functions you request:
              </p>
              <ul className="space-y-2 mb-4">
                <li>• <strong>Gmail API</strong>: Emails you send are delivered through Google's email infrastructure</li>
                <li>• <strong>Google Sheets API</strong>: Recipient lists and campaign results are stored in your Google Sheets</li>
                <li>• <strong>Google Drive API</strong>: Spreadsheet metadata is retrieved to display your available files</li>
              </ul>

              <h4 className="font-semibold mb-2">No Other Sharing</h4>
              <p className="mb-2">We do not sell, rent, or share your data with any third parties except:</p>
              <ul className="space-y-2">
                <li>• Google services (as described above) when you explicitly authorize an action</li>
                <li>• Service providers who assist in operating our service (under strict confidentiality obligations)</li>
                <li>• As required by law</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Retention & Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>Data Retention & Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <h4 className="font-semibold mb-2">Data Retention</h4>
              <ul className="space-y-2 mb-4">
                <li>• <strong>Account Data</strong>: Your email and Google User ID are retained until you delete your account</li>
                <li>• <strong>Session Tokens</strong>: OAuth tokens are cleared when you sign out or expire after inactivity</li>
                <li>• <strong>Campaign Data</strong>: Stored in your browser session only and cleared when the session ends</li>
              </ul>

              <h4 className="font-semibold mb-2">Your Rights</h4>
              <p className="mb-2">You have the right to:</p>
              <ul className="space-y-2 mb-4">
                <li>• <strong>Access</strong> - Request a copy of your data</li>
                <li>• <strong>Delete</strong> - Request deletion of your account and associated data</li>
                <li>• <strong>Revoke Authorization</strong> - Disconnect your Google account at any time</li>
              </ul>

              <h4 className="font-semibold mb-2">How to Revoke Google Access</h4>
              <p className="mb-2">To revoke this application's access to your Google account:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to <a href="https://myaccount.google.com/permissions" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a></li>
                <li>Find this application in the list of third-party apps</li>
                <li>Click "Remove Access"</li>
              </ol>

              <h4 className="font-semibold mb-2 mt-4">To Delete Your Account</h4>
              <p>Contact us at the email address below to request account deletion.</p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <a
                href="mailto:johnwee35@gmail.com"
                className="text-primary hover:underline font-medium"
              >
                johnwee35@gmail.com
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
