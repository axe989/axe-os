import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  const isLoginPage = pathname === "/login";
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (isPublicAsset) {
    return response;
  }

  if (!user && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(
      new URL("/orders", request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
