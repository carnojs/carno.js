import { describe, expect, it } from 'bun:test';

import { Cheetah } from '../src/Cheetah';
import { Context } from '../src/domain/Context';

describe('Routing path and query parsing', () => {
  it('keeps query values separated from route params', async () => {
    const request = new Request(
      'http://localhost/exercises/lessons/lesson-1?libraryId=library-99',
    );

    const app = new Cheetah();
    const routePath = (app as any).discoverRoutePath({
      pathname: '/exercises/lessons/lesson-1',
      query: 'libraryId=library-99',
    });

    const context = await Context.createFromRequest(
      { pathname: routePath, query: 'libraryId=library-99' },
      request,
      {} as any,
    );

    context.setParam({ lessonId: 'lesson-1' });

    expect(routePath).toBe('/exercises/lessons/lesson-1');
    expect(context.param.lessonId).toBe('lesson-1');
    expect(context.query.libraryId).toBe('library-99');
  });

  it('keeps query values available for POST requests', async () => {
    const request = new Request(
      'http://localhost/exercises/lesson-1/submit?libraryId=library-55',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: 'A' }),
      },
    );

    const context = await Context.createFromRequest(
      { pathname: '/exercises/lesson-1/submit', query: 'libraryId=library-55' },
      request,
      {} as any,
    );

    expect(context.query.libraryId).toBe('library-55');
    expect(context.body.answer).toBe('A');
  });
});
