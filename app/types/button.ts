import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button-variants";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };
