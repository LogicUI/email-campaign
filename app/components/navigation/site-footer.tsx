import Link from "next/link";
import { Mail } from "lucide-react";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-slate-950 text-slate-50">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Branding */}
          <div className="space-y-4">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              EmailAI
            </Link>
            <p className="text-sm text-slate-400">
              AI-powered email campaigns that connect with your audience at scale.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-400 hover:text-slate-50 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-slate-400 hover:text-slate-50 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contact</h3>
            <a
              href="mailto:johnwee35@gmail.com"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-50 transition-colors"
            >
              <Mail className="h-4 w-4" />
              johnwee35@gmail.com
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-400">
          <p>&copy; {currentYear} EmailAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
