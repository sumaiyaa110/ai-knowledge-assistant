import { NextResponse } from "next/server";
import { z } from "zod";
import type { ApiError } from "@/models/auth";

export function jsonError(
  error: string,
  status: number,
  fieldErrors?: ApiError["fieldErrors"],
  headers?: HeadersInit,
) {
  return NextResponse.json<ApiError>({ error, fieldErrors }, { status, headers });
}

type Parsed<T> = { data: T; response?: never } | { data?: never; response: NextResponse };

/** Parse and validate a JSON request body, or produce the 400 response. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<Parsed<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError("Request body must be valid JSON", 400) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    return {
      response: jsonError(
        "Please fix the highlighted fields",
        400,
        fieldErrors as ApiError["fieldErrors"],
      ),
    };
  }
  return { data: result.data };
}
