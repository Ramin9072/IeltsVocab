export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class NotFoundError extends HttpError {
  constructor(what = "Item") {
    super(404, "not_found", `${what} not found`);
  }
}

export class DuplicateError extends HttpError {
  constructor(public readonly existingId: string | null, what = "This word") {
    super(409, "duplicate", `${what} is already in your vocabulary`, { existingId });
  }
}
