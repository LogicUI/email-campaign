import { Brain, Database, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingFeatures() {
  const features = [
    {
      icon: Brain,
      title: "AI-First Personalization",
      description: "Harness multiple AI providers (OpenAI, Anthropic, DeepSeek, Google) to generate, refine, and personalize your email content automatically. Let AI craft compelling messages while you maintain full control.",
    },
    {
      icon: Database,
      title: "Universal Data Import",
      description: "Connect to any data source—CSV, Excel, Google Sheets, or your PostgreSQL/Supabase database. If you have your contacts in a spreadsheet or database, EmailAI can work with it.",
    },
    {
      icon: Mail,
      title: "Send From Your Gmail",
      description: "Deliver campaigns through your existing Gmail account with full tracking and error handling. No new infrastructure required.",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            What Makes EmailAI Different
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create powerful, personalized email campaigns
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
