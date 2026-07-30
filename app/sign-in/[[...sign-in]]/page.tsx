import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#07040c] px-4">
      <div className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
        <SignIn
          fallbackRedirectUrl="/dashboard"
          signUpUrl="/sign-up"
          appearance={{
            variables: {
              colorPrimary: "#53009F",
              colorBackground: "#151019",
              colorText: "#F5F3F3",
              colorInputBackground: "#F5F3F3",
              fontFamily: "Inter, sans-serif"
            },
            elements: {
              rootBox: "w-full",
              cardBox: "w-full max-w-full"
            }
          }}
        />
      </div>
    </main>
  );
}
