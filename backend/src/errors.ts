/** 404: the requested entity does not exist. */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
  }
}

/** 409: optimistic lock failure, the client sent a stale `version`. */
export class VersionConflictError extends Error {
  constructor(message = 'The record was updated by someone else. Reload and try again.') {
    super(message);
  }
}

/** 409: the request conflicts with current data (duplicate, still referenced, ...). */
export class ConflictError extends Error {}

/** 400: semantically invalid input that schema validation cannot detect (e.g. unknown reference). */
export class BadRequestError extends Error {}
