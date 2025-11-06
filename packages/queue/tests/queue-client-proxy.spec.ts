import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { Context } from '@cheetah.js/core'
import { QueueClientProxy } from '../src/services/queue-client-proxy.service'


describe('QueueClientProxy', () => {

  let mockQueue: any
  let context: any

  beforeEach(() => {
    context = new (Context as any)()
    context.trackingId = 'test-tracking-id-123'

    mockQueue = {
      name: 'test-queue',
      add: mock(() => Promise.resolve({ id: '1' })),
      addBulk: mock(() => Promise.resolve([{ id: '1' }])),
    }
  })


  it('should inject trackingId when adding a job', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue, context)
    const jobData = { email: 'test@example.com' }

    // When
    await proxy.add('send-email', jobData)

    // Then
    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-email',
      {
        email: 'test@example.com',
        __trackingId: 'test-tracking-id-123',
      },
      undefined
    )
  })


  it('should inject trackingId with job options', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue, context)
    const jobData = { userId: '123' }
    const options = { delay: 5000 }

    // When
    await proxy.add('process-user', jobData, options)

    // Then
    expect(mockQueue.add).toHaveBeenCalledWith(
      'process-user',
      {
        userId: '123',
        __trackingId: 'test-tracking-id-123',
      },
      options
    )
  })


  it('should inject trackingId in bulk operations', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue, context)
    const jobs = [
      { name: 'job1', data: { value: 1 } },
      { name: 'job2', data: { value: 2 } },
    ]

    // When
    await proxy.addBulk(jobs)

    // Then
    const [enrichedJobs] = mockQueue.addBulk.mock.calls[0]
    expect(enrichedJobs[0].data.__trackingId).toBe('test-tracking-id-123')
    expect(enrichedJobs[1].data.__trackingId).toBe('test-tracking-id-123')
    expect(enrichedJobs[0].data.value).toBe(1)
    expect(enrichedJobs[1].data.value).toBe(2)
  })


  it('should handle empty data when adding job', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue, context)

    // When
    await proxy.add('empty-job')

    // Then
    expect(mockQueue.add).toHaveBeenCalledWith(
      'empty-job',
      {
        __trackingId: 'test-tracking-id-123',
      },
      undefined
    )
  })


  it('should preserve existing data properties when injecting trackingId', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue, context)
    const jobData = {
      userId: '123',
      email: 'test@example.com',
      nested: { value: 'nested-data' }
    }

    // When
    await proxy.add('complex-job', jobData)

    // Then
    expect(mockQueue.add).toHaveBeenCalledWith(
      'complex-job',
      {
        userId: '123',
        email: 'test@example.com',
        nested: { value: 'nested-data' },
        __trackingId: 'test-tracking-id-123',
      },
      undefined
    )
  })


  it('should generate trackingId if context has none', async () => {
    // Given
    const contextWithoutTracking = new (Context as any)()
    contextWithoutTracking.trackingId = undefined

    const proxy = new QueueClientProxy(mockQueue, contextWithoutTracking)

    // When
    await proxy.add('job-without-tracking', { data: 'test' })

    // Then
    const [[, enrichedData]] = mockQueue.add.mock.calls
    expect(enrichedData.__trackingId).toBeDefined()
    expect(typeof enrichedData.__trackingId).toBe('string')
    expect(enrichedData.__trackingId.length).toBeGreaterThan(0)
  })
})
