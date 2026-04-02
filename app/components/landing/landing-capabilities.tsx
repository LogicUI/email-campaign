import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export function LandingCapabilities() {
  const capabilities = [
    {
      title: "AI-Powered Campaign Creation",
      items: [
        "Multi-Provider AI Support: Choose from OpenAI (GPT-4o-mini), Anthropic (Claude 3.5 Sonnet), DeepSeek, or Google (Gemini 2.0 Flash)",
        "Global Template AI Regeneration: Describe what you want to say, and AI rewrites your entire campaign template",
        "Individual Email Enhancement: Let AI personalize specific recipient emails based on their data",
        "Smart Placeholder Preservation: AI keeps your {{field_name}} personalization tokens intact during regeneration",
      ],
    },
    {
      title: "Flexible Data Management",
      items: [
        "Spreadsheet Import: Upload CSV, Excel, or other spreadsheet formats with automatic email detection",
        "Google Sheets Integration: Connect directly to Google Drive and import from live spreadsheets",
        "Database Connections: Pull data from PostgreSQL or Supabase with SSL-secure connections",
        "Intelligent Validation: Flags missing, invalid, or duplicate emails before you send",
      ],
    },
    {
      title: "Intelligent Campaign Workflow",
      items: [
        "Template-Based Personalization: Use {{field_name}} placeholders to dynamically insert recipient data",
        "Real-Time Preview: See exactly how each personalized email will look before sending",
        "Test Emails: Send test emails to yourself to verify formatting and deliverability",
        "Bulk Sending: Send up to 100 emails per batch with automatic retry and error handling",
      ],
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="secondary">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Key Capabilities
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features for modern email marketing
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {capabilities.map((capability, index) => (
            <div key={index} className="bg-background rounded-lg p-6 border">
              <h3 className="text-xl font-bold mb-4">{capability.title}</h3>
              <ul className="space-y-3">
                {capability.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
