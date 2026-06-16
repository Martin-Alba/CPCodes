import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/jwt";

// Convención de Next 16: este archivo se llamaba "middleware" en versiones
// anteriores. Intercepta las peticiones para proteger la zona privada.
const PROTECTED_PREFIX = "/dashboard";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const isLogin = pathname === "/login";
  const isProtected = pathname === "/" || pathname.startsWith(PROTECTED_PREFIX);

  // Sin sesión y zona protegida -> al login
  if (!session && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión e intentando ver el login -> al panel
  if (session && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
