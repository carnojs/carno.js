import { describe, expect, it } from 'bun:test'
import { Context } from '../src/domain/Context'


describe('Context - TrackingId', () => {

  it('should generate a trackingId when creating context from request', async () => {
    // Given
    const url = { query: '' }
    const request = new Request('http://localhost:3000')
    const server = {} as any

    // When
    const context = await Context.createFromRequest(url, request, server)

    // Then
    expect(context.trackingId).toBeDefined()
    expect(typeof context.trackingId).toBe('string')
    expect(context.trackingId.length).toBeGreaterThan(0)
  })


  it('should use trackingId from header when provided', async () => {
    // Given
    const url = { query: '' }
    const trackingId = 'custom-tracking-id-123'
    const request = new Request('http://localhost:3000', {
      headers: {
        'x-tracking-id': trackingId
      }
    })
    const server = {} as any

    // When
    const context = await Context.createFromRequest(url, request, server)

    // Then
    expect(context.trackingId).toBe(trackingId)
  })


  it('should generate UUID v4 format when no tracking id provided', async () => {
    // Given
    const url = { query: '' }
    const request = new Request('http://localhost:3000')
    const server = {} as any

    // When
    const context = await Context.createFromRequest(url, request, server)

    // Then
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(context.trackingId).toMatch(uuidV4Regex)
  })


  it('should generate different trackingIds for different requests', async () => {
    // Given
    const url = { query: '' }
    const request1 = new Request('http://localhost:3000')
    const request2 = new Request('http://localhost:3000')
    const server = {} as any

    // When
    const context1 = await Context.createFromRequest(url, request1, server)
    const context2 = await Context.createFromRequest(url, request2, server)

    // Then
    expect(context1.trackingId).not.toBe(context2.trackingId)
  })
})
