export interface GoogleSignInButtonProps {
  callbackUrl: string;
}

export interface LoginPageSearchParams {
  callbackUrl?: string | string[];
  reason?: string | string[];
}

export interface LoginPageProps {
  searchParams?: LoginPageSearchParams;
}
