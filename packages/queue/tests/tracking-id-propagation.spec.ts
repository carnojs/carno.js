import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { Context, LocalsContainer } from '@cheetah.js/core'


describe('TrackingId Propagation - Debugging', () => {

  it('should extract trackingId from job.data.__trackingId', () => {
    // Given
    const originalTrackingId = 'a074b5d3-e638-4592-885f-9596022658a1'
    const job = {
      id: 'job-123',
      name: 'test-job',
      data: {
        __trackingId: originalTrackingId,
        userId: '123'
      }
    } as any

    // When
    const context = Context.createFromJob(job)

    // Then
    console.log('Job data:', JSON.stringify(job.data, null, 2))
    console.log('Context trackingId:', context.trackingId)
    console.log('Expected trackingId:', originalTrackingId)

    expect(context.trackingId).toBe(originalTrackingId)
  })


  it('should show what happens when job has both data and property trackingId', () => {
    // Given
    const dataTrackingId = 'from-data-123'
    const propertyTrackingId = 'from-property-456'

    const job = {
      id: 'job-123',
      name: 'test-job',
      trackingId: propertyTrackingId,
      data: {
        __trackingId: dataTrackingId,
        userId: '123'
      }
    } as any

    // When
    const context = Context.createFromJob(job)

    // Then
    console.log('Job.data.__trackingId:', job.data.__trackingId)
    console.log('Job.trackingId:', job.trackingId)
    console.log('Context.trackingId:', context.trackingId)

    expect(context.trackingId).toBe(dataTrackingId)
  })


  it('should create LocalsContainer with Context', () => {
    // Given
    const trackingId = 'test-tracking-123'
    const job = {
      id: 'job-123',
      name: 'test-job',
      data: {
        __trackingId: trackingId
      }
    } as any

    // When
    const context = Context.createFromJob(job)
    const locals = new LocalsContainer()
    locals.set(Context, context)

    // Then
    const retrievedContext = locals.get(Context)
    console.log('Retrieved context trackingId:', retrievedContext?.trackingId)

    expect(retrievedContext).toBe(context)
    expect(retrievedContext.trackingId).toBe(trackingId)
  })
})
