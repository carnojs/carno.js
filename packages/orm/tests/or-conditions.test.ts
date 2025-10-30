import { describe, expect, it } from 'bun:test';

import { withDatabase } from '../src/testing/with-database';
import {
    TestCourseEntity,
    TestUserEntity,
    TestUserLibraryEntity,
} from './fixtures/user-library.entities';
import { ConnectionSettings } from "../src";
import config from "../cheetah.config";

const ENTITY_FILE = new URL('./fixtures/user-library.entities.ts', import.meta.url).pathname;

const TABLE_STATEMENTS = [
    'CREATE TABLE test_users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);',
    'CREATE TABLE test_courses (id SERIAL PRIMARY KEY, title TEXT NOT NULL);',
    [
        'CREATE TABLE test_user_libraries (',
        'id SERIAL PRIMARY KEY,',
        'user_id INT NOT NULL REFERENCES test_users(id),',
        'course_id INT NOT NULL REFERENCES test_courses(id),',
        'is_completed BOOLEAN NOT NULL DEFAULT false,',
        'progress INT NOT NULL DEFAULT 0,',
        'last_accessed_at TIMESTAMP NOT NULL',
        ');',
    ].join(' '),
];

describe('SqlConditionBuilder OR conditions', () => {
    it('resolves column names inside OR branches when filtering repositories', async () => {
        await withDatabase(
            TABLE_STATEMENTS,
            async () => {
                // Given
                const user = await TestUserEntity.create({name: 'Alice'});
                const course = await TestCourseEntity.create({title: 'Engenharia'});
                await TestUserLibraryEntity.create({
                    user,
                    course,
                    isCompleted: false,
                    progress: 5,
                    lastAccessedAt: new Date('2024-01-01T00:00:00Z'),
                });
                await TestUserLibraryEntity.create({
                    user,
                    course,
                    isCompleted: false,
                    progress: 0,
                    lastAccessedAt: new Date('2024-01-02T00:00:00Z'),
                });

                // When
                const results = await TestUserLibraryEntity.find({
                    user: {id: user.id},
                    $or: [{isCompleted: true}, {progress: {$gt: 0}}],
                }, {
                    load: ['course'],
                    orderBy: {lastAccessedAt: 'DESC'},
                });

                // Then
                expect(results).toHaveLength(1);
                expect(results[0].progress).toBe(5);
                expect(results[0].course.id).toBe(course.id);
            },
            {
                entityFile: ENTITY_FILE,
                connection: config
            },
        );
    });
});
