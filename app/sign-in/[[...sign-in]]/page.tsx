import { SignIn } from "@clerk/nextjs";
import { AuthExperience, clerkAuthAppearance } from "@/components/auth-experience";

export default function SignInPage() {
  return (
    <AuthExperience mode="sign-in">
      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/pos-login"
        forceRedirectUrl="/pos-login"
        signUpUrl="/sign-up"
        appearance={clerkAuthAppearance}
      />
    </AuthExperience>
  );
}
