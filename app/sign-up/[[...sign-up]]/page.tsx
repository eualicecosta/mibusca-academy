import { SignUp } from "@clerk/nextjs";
import { AuthExperience, clerkAuthAppearance } from "@/components/auth-experience";

export default function SignUpPage() {
  return (
    <AuthExperience mode="sign-up">
      <SignUp
        routing="path"
        path="/sign-up"
        fallbackRedirectUrl="/dashboard"
        signInUrl="/sign-in"
        appearance={clerkAuthAppearance}
      />
    </AuthExperience>
  );
}
