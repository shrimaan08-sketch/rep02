import { NextRequest } from "next/server";

// This route runs on the Next.js server and forwards /api/v1/* to the real
// backend. The browser therefore only ever calls the frontend's OWN origin —
// so there is no CORS, and no backend URL is baked into the client bundle.
//
// The backend address is read at REQUEST time from BACKEND_ORIGIN, so setting
// it on the frontend service and doing a normal redeploy is enough (no
// "clear build cache" needed).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendOrigin(): string {
  return (process.env.BACKEND_ORIGIN || "http://localhost:8000").replace(/\/+$/, "");
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${backendOrigin()}/api/v1/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const init: RequestInit = { method: req.method, headers, redirect: "manual" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let resp: Response;
  try {
    resp = await fetch(target, init);
  } catch {
    return new Response(
      JSON.stringify({ detail: "The API is unreachable. Please try again in a moment." }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const respHeaders = new Headers(resp.headers);
  respHeaders.delete("content-encoding");
  respHeaders.delete("content-length");
  respHeaders.delete("transfer-encoding");
  return new Response(resp.body, { status: resp.status, headers: respHeaders });
}

type Ctx = { params: { path: string[] } };

export function GET(req: NextRequest, ctx: Ctx) { return proxy(req, ctx.params.path); }
export function POST(req: NextRequest, ctx: Ctx) { return proxy(req, ctx.params.path); }
export function PUT(req: NextRequest, ctx: Ctx) { return proxy(req, ctx.params.path); }
export function PATCH(req: NextRequest, ctx: Ctx) { return proxy(req, ctx.params.path); }
export function DELETE(req: NextRequest, ctx: Ctx) { return proxy(req, ctx.params.path); }
export function OPTIONS(req: NextRequest, ctx: Ctx) { return proxy(req, ctx.params.path); }
