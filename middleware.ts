import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "norbee_session";

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);

    return JSON.parse(json) as {
      role?: "ADMIN" | "EMPLOYEE";
      exp?: number;
    };
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const pathname = req.nextUrl.pathname;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const session = decodeJwtPayload(token);

  if (!session || (session.exp && session.exp * 1000 < Date.now())) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const adminRoutes = [
    "/Dashboard",
    "/dashboard",
    "/cantinas",
    "/stock",
    "/compras",
    "/custos",
    "/lucros",
    "/financas",
    "/rh",
    "/relatorios",
  ];

  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (session.role === "EMPLOYEE" && isAdminRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/vendas";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/Dashboard/:path*",
    "/dashboard/:path*",
    "/cantinas/:path*",
    "/stock/:path*",
    "/vendas/:path*",
    "/compras/:path*",
    "/custos/:path*",
    "/lucros/:path*",
    "/financas/:path*",
    "/rh/:path*",
    "/relatorios/:path*",
  ],
};