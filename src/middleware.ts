// Auto-added by the Vercel supervision dashboard for live-visitor tracking.
// See beacon/README.md in hmabib/vercel-ops-dashboard for details.
import { NextResponse } from "next/server";
import { geolocation, ipAddress } from "@vercel/functions";

const INGEST_URL = "https://vercel-ops-dashboard-rho.vercel.app/api/ingest";
const SECRET = "bade6d8912e182d9ef91e1b8c132fd52e2bf35aec03ad869";
const PROJECT = "port-pulse";

export function middleware(request) {
  const geo = geolocation(request);
  const ip = ipAddress(request) ?? "0.0.0.0";
  const payload = {
    project: PROJECT,
    path: request.nextUrl.pathname,
    ip,
    country: geo.country ?? "??",
    region: geo.countryRegion ?? null,
    city: geo.city ?? null,
    lat: geo.latitude ? Number(geo.latitude) : null,
    lon: geo.longitude ? Number(geo.longitude) : null,
    ua: request.headers.get("user-agent") ?? null,
    ts: Date.now(),
  };

  fetch(INGEST_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-supervision-secret": SECRET },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|api/).*)",
};
