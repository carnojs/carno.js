import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { QueueClient } from '../src/services/queue-client.service'
import { QueueRegistry } from '../src/queue.registry'
import { Context } from '@cheetah.js/core'


describe('QueueClient - Tracking ID', () => {

  let queueRegistry: QueueRegistry
  let context: any
  let mockQueue: any


  beforeEach(() => {
    queueRegistry = new QueueRegistry()

    context = new (Context as any)()
    context.trackingId = 'test-tracking-id-123'

    mockQueue = {
      add: mock(() => Promise.resolve({ id: '1' })),
      addBulk: mock(() => Promise.resolve([{ id: '1' }])),
    }

    queueRegistry.addQueue('test-queue', mockQueue)
  })


  it('should inject trackingId when adding a job', async () => {
    // Given
    const queueClient = new QueueClient(queueRegistry, context)
    const jobData = { email: 'test@example.com' }

    // When
    await queueClient.add('test-queue', 'send-email', jobData)

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


  it('should preserve existing job data when injecting trackingId', async () => {
    // Given
    const queueClient = new QueueClient(queueRegistry, context)
    const jobData = {
      email: 'test@example.com',
      subject: 'Test',
      body: 'Hello',
    }

    // When
    await queueClient.add('test-queue', 'send-email', jobData)

    // Then
    const [, enrichedData] = mockQueue.add.mock.calls[0]
    expect(enrichedData.email).toBe('test@example.com')
    expect(enrichedData.subject).toBe('Test')
    expect(enrichedData.body).toBe('Hello')
    expect(enrichedData.__trackingId).toBe('test-tracking-id-123')
  })


  it('should inject trackingId in bulk operations', async () => {
    // Given
    const queueClient = new QueueClient(queueRegistry, context)
    const jobs = [
      { name: 'job1', data: { value: 1 } },
      { name: 'job2', data: { value: 2 } },
    ]

    // When
    await queueClient.addBulk('test-queue', jobs)

    // Then
    const [enrichedJobs] = mockQueue.addBulk.mock.calls[0]
    expect(enrichedJobs[0].data.__trackingId).toBe('test-tracking-id-123')
    expect(enrichedJobs[1].data.__trackingId).toBe('test-tracking-id-123')
    expect(enrichedJobs[0].data.value).toBe(1)
    expect(enrichedJobs[1].data.value).toBe(2)
  })


  it('should throw error when queue not found', async () => {
    // Given
    const queueClient = new QueueClient(queueRegistry, context)

    // When / Then
    expect(async () => {
      await queueClient.add('non-existent-queue', 'test-job', {})
    }).toThrow('Queue "non-existent-queue" not found')
  })
})
