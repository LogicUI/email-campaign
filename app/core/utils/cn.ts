import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional class names and resolves Tailwind conflicts.
 *
 * This is the standard utility used across the UI layer to keep component class
 * composition readable while avoiding duplicated/conflicting Tailwind utilities.
 *
 * @param inputs Class name fragments and conditional values.
 * @returns Final merged class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
