import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withValidation<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
    }
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
