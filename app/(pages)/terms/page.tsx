import { FileText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using EmailAI",
};

export default function TermsPage() {
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
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Agreement */}
          <Card>
            <CardHeader>
              <CardTitle>Agreement</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <p>
                By using this application, you agree to the following terms and conditions.
                If you do not agree with these terms, please do not use this application.
              </p>
            </CardContent>
          </Card>

          {/* Acceptable Use */}
          <Card>
            <CardHeader>
              <CardTitle>Acceptable Use</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">You agree to use this platform for:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Legitimate outreach purposes only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Complying with applicable email and data protection laws</span>
                </li>
              </ul>
              <p className="mt-4 mb-2">You agree NOT to:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Send spam or abusive content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Violate any applicable laws or regulations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card>
            <CardHeader>
              <CardTitle>Disclaimer</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <ul className="space-y-2">
                <li>• We are not responsible for how users choose to use the platform</li>
                <li>• We reserve the right to suspend access if misuse is detected</li>
                <li>• This service is provided {"as is"} without warranties of any kind</li>
                <li>• We are not liable for any damages arising from your use of this service</li>
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
                If you have any questions about these Terms of Service, please contact us at:
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
