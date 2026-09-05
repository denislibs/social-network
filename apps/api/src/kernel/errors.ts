export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = new.target.name
  }
}
export class NotFoundError extends AppError {
  constructor(code = 'not_found', message = 'Not found') {
    super(code, message, 404)
  }
}
export class ConflictError extends AppError {
  constructor(code = 'conflict', message = 'Conflict') {
    super(code, message, 409)
  }
}
export class UnauthorizedError extends AppError {
  constructor(code = 'unauthorized', message = 'Unauthorized') {
    super(code, message, 401)
  }
}
export class ForbiddenError extends AppError {
  constructor(code = 'forbidden', message = 'Forbidden') {
    super(code, message, 403)
  }
}
export class ValidationError extends AppError {
  constructor(code = 'validation', message = 'Invalid input') {
    super(code, message, 422)
  }
}
export class DomainRuleError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 422)
  }
}
