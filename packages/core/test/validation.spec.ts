import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { Controller, Get, Body, Post, Schema, ZodAdapter } from '../src';
import { withTestApp } from '../src/testing/TestHarness';

describe('Validation with Zod', () => {
    // DTO class with Zod schema
    @Schema(z.object({
        name: z.string().min(2),
        email: z.string().email(),
    }))
    class CreateUserDto {
        name!: string;
        email!: string;
    }

    @Controller('/users')
    class UserController {
        @Post()
        createUser(@Body() body: CreateUserDto) {
            return { created: true, user: body };
        }

        @Get()
        list() {
            return [];
        }
    }

    test('valid body passes validation', async () => {
        await withTestApp(
            async (harness) => {
                const response = await harness.post('/users', {
                    name: 'John',
                    email: 'john@example.com',
                });

                expect(response.status).toBe(200);
                const data = await response.json();
                expect(data.created).toBe(true);
                expect(data.user.name).toBe('John');
            },
            {
                controllers: [UserController],
                config: {
                    validation: new ZodAdapter(),
                },
                listen: true,
            }
        );
    });

    test('invalid email returns 400 validation error', async () => {
        await withTestApp(
            async (harness) => {
                const response = await harness.post('/users', {
                    name: 'John',
                    email: 'not-an-email',
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data.statusCode).toBe(400);
                expect(data.errors).toBeDefined();
            },
            {
                controllers: [UserController],
                config: {
                    validation: new ZodAdapter(),
                },
                listen: true,
            }
        );
    });

    test('name too short returns 400 validation error', async () => {
        await withTestApp(
            async (harness) => {
                const response = await harness.post('/users', {
                    name: 'A', // menos de 2 caracteres
                    email: 'valid@email.com',
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data.statusCode).toBe(400);
                expect(data.errors).toBeDefined();
            },
            {
                controllers: [UserController],
                config: {
                    validation: new ZodAdapter(),
                },
                listen: true,
            }
        );
    });

    test('missing required fields returns 400 validation error', async () => {
        await withTestApp(
            async (harness) => {
                const response = await harness.post('/users', {});

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data.statusCode).toBe(400);
                expect(data.errors).toBeDefined();
            },
            {
                controllers: [UserController],
                config: {
                    validation: new ZodAdapter(),
                },
                listen: true,
            }
        );
    });
});
