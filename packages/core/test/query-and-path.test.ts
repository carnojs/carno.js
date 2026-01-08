import { describe, expect, test } from 'bun:test';
import { Controller, Get, Param, Query } from '../src';
import { withTestApp } from '../src/testing/TestHarness';

describe('Routing path and query parsing', () => {
  @Controller('/exercises')
  class ExerciseController {
    @Get('/lessons/:lessonId')
    getLesson(@Param('lessonId') lessonId: string, @Query('libraryId') libraryId: string) {
      return { lessonId, libraryId };
    }

    @Get('/:lessonId/submit')
    submit(@Param('lessonId') lessonId: string, @Query('libraryId') libraryId: string) {
      return { lessonId, libraryId, submitted: true };
    }
  }

  test('keeps query values separated from route params', async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.get('/exercises/lessons/lesson-1?libraryId=library-99');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.lessonId).toBe('lesson-1');
        expect(data.libraryId).toBe('library-99');
      },
      { controllers: [ExerciseController], listen: true }
    );
  });

  test('keeps query values available for POST-like requests', async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.get('/exercises/lesson-1/submit?libraryId=library-55');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.libraryId).toBe('library-55');
        expect(data.submitted).toBe(true);
      },
      { controllers: [ExerciseController], listen: true }
    );
  });
});
