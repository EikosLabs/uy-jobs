import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/ofertas", "/oferta", "/admin"];
const GUEST_ONLY = ["/login", "/register"];

async function hasSession(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token || !process.env.AUTH_SECRET) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const logged = await hasSession(req);

  // referral: ?ref=CODIGO -> cookie 30 dias (se adhiere a cualquier respuesta)
  const ref = req.nextUrl.searchParams.get("ref");
  const withRef = (res: NextResponse) => {
    if (ref && /^[a-z0-9]{4,16}$/i.test(ref)) {
      res.cookies.set("ref", ref.toLowerCase(), { maxAge: 60 * 60 * 24 * 30, path: "/" });
    }
    return res;
  };

  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  if (isProtected && !logged) {
    return withRef(NextResponse.redirect(new URL("/login", req.nextUrl)));
  }
  if (logged && (path === "/" || GUEST_ONLY.includes(path))) {
    return withRef(NextResponse.redirect(new URL("/ofertas", req.nextUrl)));
  }
  return withRef(NextResponse.next());
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
