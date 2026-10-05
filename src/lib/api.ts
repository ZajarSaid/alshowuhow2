import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { clientIp, hit } from "@/lib/rate-limit";

// Uniform error envelope. Every API failure in this app is
// `{ error: string }` with a 4xx/5xx status, so clients can handle failures
// without special-casing each endpoint.
export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

type Guard<T> = { value: T; response: null } | { value: null; response: NextResponse };

/**
 * Parse a JSON request body without letting a malformed payload become a 500.
 *
 * `req.json()` throws a SyntaxError on malformed input, and returns a non-object
 * for bodies like `"hello"` or `[1,2]`; both previously escaped as unhandled
 * exceptions. This always yields a typed object or a 400.
 */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<Guard<T>> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return { value: null, response: jsonError("Invalid JSON body", 400) };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { value: null, response: jsonError("Invalid JSON body", 400) };
  }

  return { value: parsed as T, response: null };
}

type Handler = (req: Request) => Promise<NextResponse>;

/**
 * Throttle an unauthenticated write endpoint by client IP.
 *
 * Returns a 429 with `Retry-After` once `limit` calls have been made inside the
 * window. `scope` keeps each endpoint's budget independent, so a burst of
 * feedback submissions cannot consume the request quota.
 */
export function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
): { response: null } | { response: NextResponse } {
  const result = hit(`${scope}:${clientIp(req)}`, limit, windowMs);

  if (result.ok) return { response: null };

  return {
    response: NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    ),
  };
}

/**
 * Wraps a route handler with uniform error handling.
 *
 * Without this, any unhandled throw (a Prisma unique/FK violation, a failed
 * email send) escaped as a framework 500 with no JSON body and no log, so the
 * client could not parse the failure and the operator never saw the cause.
 * Error details stay in the server log and never reach the client.
 *
 * The returned function takes an optional `req` so GET handlers stay callable
 * as `GET()` from tests; Next.js itself always passes a Request.
 */
export function route(name: string, handler: Handler): (req?: Request) => Promise<NextResponse> {
  return async (req?: Request): Promise<NextResponse> => {
    try {
      return await handler(req as Request);
    } catch (err) {
      if (err instanceof Error && err.name === "ZodError") {
        const issues = (err as ZodError).issues
          .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
          .join("; ");
        console.warn(`[api:${name}] validation failed - ${issues}`);
        return jsonError(issues, 400);
      }
      console.error(`[api:${name}] unhandled error:`, err);
      return jsonError("Internal server error", 500);
    }
  };
}
