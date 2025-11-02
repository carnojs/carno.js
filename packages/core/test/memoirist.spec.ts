import { describe, expect, it } from 'bun:test'
import Memoirist from '../src/route/memoirist'
import type { TokenRouteWithProvider } from '../src/container'

const makeRoute = (path: string): TokenRouteWithProvider => ({
  method: 'get',
  path,
  methodName: 'handler',
  middlewares: [],
  provider: {} as any
})

describe('Memoirist parameter mapping', () => {
  it('keeps independent parameter names for sibling routes', () => {
    // Given
    const router = new Memoirist<TokenRouteWithProvider>()
    const courseRoute = makeRoute('/courses/:id')
    const statisticsRoute = makeRoute('/courses/:courseId/statistics')

    // When
    router.add('get', courseRoute.path, courseRoute)
    router.add('get', statisticsRoute.path, statisticsRoute)
    const courseMatch = router.find('get', '/courses/42')
    const statsMatch = router.find('get', '/courses/77/statistics')

    // Then
    expect(courseMatch?.store).toBe(courseRoute)
    expect(courseMatch?.params.id).toBe('42')
    expect(courseMatch?.params.courseId).toBeUndefined()

    expect(statsMatch?.store).toBe(statisticsRoute)
    expect(statsMatch?.params.courseId).toBe('77')
    expect(statsMatch?.params.id).toBeUndefined()
  })
})
