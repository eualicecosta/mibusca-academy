import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/curso(.*)",
  "/perfil(.*)",
  "/admin(.*)",
  "/vendedor(.*)",
  "/pos-login(.*)",
  "/aguardando-aprovacao(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/dashboard(.*)",
    "/curso(.*)",
    "/perfil(.*)",
    "/admin(.*)",
    "/vendedor(.*)",
    "/pos-login(.*)",
    "/aguardando-aprovacao(.*)"
  ]
};
