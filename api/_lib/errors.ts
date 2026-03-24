export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ScraperError extends AppError {
  constructor(message: string) {
    super(message, 502)
    this.name = 'ScraperError'
  }
}

export class GraphError extends AppError {
  constructor(message: string) {
    super(message, 500)
    this.name = 'GraphError'
  }
}

export function toClientError(err: unknown): { error: string; statusCode: number } {
  if (err instanceof AppError) {
    return { error: err.message, statusCode: err.statusCode }
  }
  // Never expose raw error details or stack traces to the client
  return { error: 'An unexpected error occurred', statusCode: 500 }
}
