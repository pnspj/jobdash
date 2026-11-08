export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
  }
}

/** Optimistic lock failure: the client sent a stale `version`. */
export class VersionConflictError extends Error {
  constructor(message = 'The record was updated by someone else. Reload and try again.') {
    super(message);
  }
}
