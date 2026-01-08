/**
 * Base HTTP Exception class.
 * Throw this from handlers to return custom HTTP error responses.
 */
export class HttpException extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly errors?: any[]
    ) {
        super(message);
        this.name = 'HttpException';
    }

    /**
     * Convert exception to Response.
     */
    toResponse(): Response {
        const body = {
            statusCode: this.statusCode,
            message: this.message,
            ...(this.errors && { errors: this.errors })
        };

        return Response.json(body, { status: this.statusCode });
    }
}

// Common HTTP Exceptions

export class BadRequestException extends HttpException {
    constructor(message: string = 'Bad Request', errors?: any[]) {
        super(400, message, errors);
        this.name = 'BadRequestException';
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message: string = 'Unauthorized') {
        super(401, message);
        this.name = 'UnauthorizedException';
    }
}

export class ForbiddenException extends HttpException {
    constructor(message: string = 'Forbidden') {
        super(403, message);
        this.name = 'ForbiddenException';
    }
}

export class NotFoundException extends HttpException {
    constructor(message: string = 'Not Found') {
        super(404, message);
        this.name = 'NotFoundException';
    }
}

export class MethodNotAllowedException extends HttpException {
    constructor(message: string = 'Method Not Allowed') {
        super(405, message);
        this.name = 'MethodNotAllowedException';
    }
}

export class ConflictException extends HttpException {
    constructor(message: string = 'Conflict') {
        super(409, message);
        this.name = 'ConflictException';
    }
}

export class UnprocessableEntityException extends HttpException {
    constructor(message: string = 'Unprocessable Entity', errors?: any[]) {
        super(422, message, errors);
        this.name = 'UnprocessableEntityException';
    }
}

export class TooManyRequestsException extends HttpException {
    constructor(message: string = 'Too Many Requests') {
        super(429, message);
        this.name = 'TooManyRequestsException';
    }
}

export class InternalServerErrorException extends HttpException {
    constructor(message: string = 'Internal Server Error') {
        super(500, message);
        this.name = 'InternalServerErrorException';
    }
}

export class ServiceUnavailableException extends HttpException {
    constructor(message: string = 'Service Unavailable') {
        super(503, message);
        this.name = 'ServiceUnavailableException';
    }
}
