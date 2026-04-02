import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingCapabilities } from "@/components/landing/landing-capabilities";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingUseCases } from "@/components/landing/landing-use-cases";
import { LandingExamples } from "@/components/landing/landing-examples";
import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingCTA } from "@/components/landing/landing-cta";

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <LandingCapabilities />
      <LandingHowItWorks />
      <LandingUseCases />
      <LandingExamples />
      <LandingBenefits />
      <LandingCTA />
    </>
  );
}
