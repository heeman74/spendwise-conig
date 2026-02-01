import { GraphQLError } from 'graphql';
import { Context, AuthUser } from '../context';

export function requireAuth(context: Context): AuthUser {
  if (!context.user) {
    throw new GraphQLError('You must be logged in', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
  return context.user;
}

export class NotFoundError extends GraphQLError {
  constructor(resource: string) {
    super(`${resource} not found`, {
      extensions: { code: 'NOT_FOUND', http: { status: 404 } },
    });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message = 'You do not have permission') {
    super(message, {
      extensions: { code: 'FORBIDDEN', http: { status: 403 } },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string, field?: string) {
    super(message, {
      extensions: {
        code: 'BAD_USER_INPUT',
        field,
        http: { status: 400 },
      },
    });
  }
}
