import { Building2, Megaphone, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingUseCases() {
  const useCases = [
    {
      icon: Building2,
      title: "B2B Sales & Lead Generation",
      description: "Drive revenue with personalized outreach",
      cases: [
        "Prospect Outreach: Personalize emails with company-specific details from your CRM",
        "Event Follow-Ups: Reference attendee sessions and interests post-event",
        "Partnership Proposals: Tailor messaging based on prospect industry and size",
      ],
    },
    {
      icon: Megaphone,
      title: "Marketing & Customer Engagement",
      description: "Engage customers with relevant, timely messages",
      cases: [
        "Product Launches: Segment customers and send personalized announcements",
        "Newsletter Campaigns: Dynamic content based on customer preferences",
        "Re-Engagement: Win back inactive customers with personalized offers",
      ],
    },
    {
      icon: Calendar,
      title: "Events & Conferences",
      description: "Boost attendance and engagement",
      cases: [
        "Pre-Event Invitations: Personalized invitations with speaker-specific content",
        "Post-Event Follow-Ups: Reference sessions attended and next steps",
        "Sponsor Outreach: Custom proposals based on sponsor profile data",
      ],
    },
    {
      icon: Users,
      title: "Customer Success",
      description: "Build stronger customer relationships",
      cases: [
        "Onboarding Sequences: Account-specific setup guides and milestones",
        "Check-In Emails: Usage-based recommendations and tips",
        "Renewal Reminders: Personalized terms based on account history",
      ],
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Use Cases Across Industries
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how teams use EmailAI to drive results
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {useCases.map((useCase, index) => (
            <Card key={index} className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <useCase.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{useCase.title}</CardTitle>
                </div>
                <CardDescription className="text-base">
                  {useCase.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {useCase.cases.map((caseItem, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">• {caseItem.split(": ")[0]}:</span>{" "}
                      {caseItem.split(": ").slice(1).join(": ")}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
