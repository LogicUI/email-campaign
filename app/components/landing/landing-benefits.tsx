import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LandingBenefits() {
  const benefits = [
    "No Infrastructure Required: Browser-based platform—nothing to install or host",
    "Your Data, Your Control: Data stays in your browser and Google account",
    "AI Flexibility: Switch between OpenAI, Anthropic, DeepSeek, or Google",
    "Database-Ready: Direct PostgreSQL/Supabase connections—no export needed",
    "Gmail Integration: Send from your existing email address with full tracking",
    "Cost-Effective: Use your own AI provider keys—no per-email surcharges",
    "Fast Setup: From data import to sent emails in under 5 minutes",
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Marketers Love EmailAI
            </h2>
            <p className="text-xl text-muted-foreground">
              Built for modern marketing teams
            </p>
          </div>

          <Card className="border-2">
            <CardContent className="p-8">
              <ul className="space-y-4">
                {benefits.map((benefit, index) => {
                  const [title, ...description] = benefit.split(": ");
                  return (
                    <li key={index} className="flex gap-4">
                      <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">{title}</span>
                        {description.length > 0 && (
                          <>
                            <span className="text-muted-foreground">: </span>
                            <span className="text-muted-foreground">{description.join(": ")}</span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
