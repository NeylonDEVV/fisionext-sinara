import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/health") return NextResponse.next();
  const user = await verifyToken(req.cookies.get(COOKIE)?.value);
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/login";
  if (!user && !isLogin) return NextResponse.redirect(new URL("/login", req.url));
  if (user && (isLogin || pathname === "/")) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
