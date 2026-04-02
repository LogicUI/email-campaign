import { Badge } from "@/components/ui/badge";
import { Building2, Megaphone, Users } from "lucide-react";

export function LandingExamples() {
  const examples = [
    {
      icon: Building2,
      title: "B2B Sales Example",
      content: `Subject: Partnership opportunity for {{company_name}}

Hi {{contact_name}},

I noticed {{company_name}} is expanding in {{industry}}.
I'd love to explore how we could support {{company_name}}'s growth
in the {{region}} market.

Would you be open to a brief call next week?`,
    },
    {
      icon: Megaphone,
      title: "Event Marketing Example",
      content: `Subject: Your exclusive pass to {{event_name}}

Hi {{attendee_name}},

Based on your interest in {{topic}}, I thought you'd love
{{session_name}} featuring {{speaker_name}}.

Your exclusive discount code: {{discount_code}}`,
    },
    {
      icon: Users,
      title: "Customer Success Example",
      content: `Subject: How {{company_name}} can get more from {{product_name}}

Hi {{customer_name}},

Your team has achieved {{milestone}} with {{product_name}}!
I wanted to share some advanced features that could help
{{company_name}} reach {{next_goal}} even faster.`,
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="secondary">
            Examples
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Personalization in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            EmailAI uses simple {`{{field_name}}`} placeholders that automatically pull from your data
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {examples.map((example, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <example.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">{example.title}</h3>
                </div>
              </div>
              <div className="p-6">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded p-4">
                  {example.content}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">How It Works:</span> Import headers are automatically normalized (e.g., {"Company Name"} becomes {`company_name`}), ensuring your templates work regardless of source data format.
          </p>
        </div>
      </div>
    </section>
  );
}
