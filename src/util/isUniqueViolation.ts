import {QueryFailedError} from 'typeorm';

/**
 * True when a TypeORM error is a Postgres unique-constraint violation (SQLSTATE
 * 23505). Used to turn a register/add-user insert race into a friendly reply
 * rather than an uncaught rejection.
 */
export default function isUniqueViolation(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const pgError = err as QueryFailedError & {code?: string; driverError?: {code?: string}};
    return pgError.code === '23505' || pgError.driverError?.code === '23505';
}
