import { ArrowRight, Upload, FileEdit, Sparkles, Eye, Send } from "lucide-react";

export function LandingHowItWorks() {
  const steps = [
    {
      icon: Upload,
      number: "01",
      title: "Import Your Data",
      description: "Upload from CSV/Excel, connect to Google Sheets, or pull from your database. EmailAI automatically detects email columns and validates your data.",
    },
    {
      icon: FileEdit,
      number: "02",
      title: "Craft Your Message",
      description: "Create a global template with personalization fields. Use placeholders like {{company_name}}, {{contact_name}}, or any column from your data.",
    },
    {
      icon: Sparkles,
      number: "03",
      title: "Let AI Enhance",
      description: "Use AI to generate your initial template, refine your messaging, or personalize individual emails. Just describe what you want, and AI handles the rest.",
    },
    {
      icon: Eye,
      number: "04",
      title: "Review and Test",
      description: "Preview personalized emails for specific recipients. Send test emails to verify everything looks perfect.",
    },
    {
      icon: Send,
      number: "05",
      title: "Send at Scale",
      description: "Select recipients and send through your Gmail account. Track delivery status and handle errors in real-time.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Five simple steps to launch your campaign
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-6 mb-12 last:mb-0">
              {/* Step Number */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute top-16 left-1/2 w-0.5 h-24 bg-border -translate-x-1/2" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3 mb-2">
                  <step.icon className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-bold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
