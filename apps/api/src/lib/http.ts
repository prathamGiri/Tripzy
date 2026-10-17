import type { ZodType, ZodTypeDef } from 'zod'

/** Throw from anywhere in a route/service; the app's error handler turns it into a JSON response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export const notFound = (what = 'Not found') => new HttpError(404, what)

/** Validate a request body/params with a Zod schema, or throw a 400 with field errors. */
export function parse<T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): T {
  const r = schema.safeParse(data)
  if (!r.success) throw new HttpError(400, 'Invalid request', r.error.flatten())
  return r.data
}
