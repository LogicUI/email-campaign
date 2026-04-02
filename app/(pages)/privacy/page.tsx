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
                  <span>Share your data with third parties</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Storage */}
          <Card>
            <CardHeader>
              <CardTitle>Data Storage</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <ul className="space-y-2">
                <li>• All actions are performed on behalf of the authenticated user</li>
                <li>• We only store necessary campaign data such as recipient lists and draft messages</li>
                <li>• Campaign data is stored in your browser during your session</li>
              </ul>
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
