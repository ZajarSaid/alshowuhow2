import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

async function getRoleFromSession(request: NextRequest): Promise<string | null> {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  return (token as { role?: string } | null)?.role ?? null;
}

/**
 * Serves the admin console on its own host (e.g. admin.alshowuhow.com).
 */
export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname } = request.nextUrl;
  const isAdminHost = host.startsWith("admin.");

  // Redirect logged-in vendors away from admin area
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const role = await getRoleFromSession(request);
    if (role === "VENDOR") {
      return NextResponse.redirect(new URL("/vendor/dashboard", request.url));
    }
  }

  const LOGIN_PAGES = ["/login", "/admin/login"];

  // Redirect logged-in users away from login pages
  // (also covers admin host root "/" which rewrites to admin login)
  if (LOGIN_PAGES.includes(pathname) || (isAdminHost && (pathname === "/" || pathname === "/login"))) {
    const role = await getRoleFromSession(request);
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "VENDOR" && pathname !== "/") {
      return NextResponse.redirect(new URL("/vendor/dashboard", request.url));
    }
  }

  if (!isAdminHost) return NextResponse.next();

  // Admin host root → straight to the console
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/admin/login", request.url));
  }

  // The public login is vendor-only; admin host gets its own form
  if (pathname === "/login") {
    return NextResponse.rewrite(new URL("/admin/login", request.url));
  }

  // Vendor areas never exist on the admin host
  if (pathname.startsWith("/vendor")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin", "/admin/:path*", "/vendor/:path*"],
};
