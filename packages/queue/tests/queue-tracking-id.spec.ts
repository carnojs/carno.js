import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { QueueClient } from '../src/services/queue-client.service'
import { QueueRegistry } from '../src/queue.registry'


describe('QueueClient - Tracking ID', () => {

  let queueRegistry: QueueRegistry
  let mockQueue: any


  beforeEach(() => {
    queueRegistry = new QueueRegistry()

    mockQueue = {
      add: mock(() => Promise.resolve({ id: '1' })),
      addBulk: mock(() => Promise.resolve([{ id: '1' }])),
    }

    queueRegistry.addQueue('test-queue', mockQueue)
  })


  it('adds a job without altering payload', async () => {
    const queueClient = new QueueClient(queueRegistry)
    const jobData = { email: 'test@example.com' }

    await queueClient.add('test-queue', 'send-email', jobData)

    expect(mockQueue.add).toHaveBeenCalledWith('send-email', jobData, undefined)
  })


  it('adds bulk jobs without injecting tracking data', async () => {
    const queueClient = new QueueClient(queueRegistry)
    const jobs = [
      { name: 'job1', data: { value: 1 } },
      { name: 'job2', data: { value: 2 } },
    ]

    await queueClient.addBulk('test-queue', jobs)

    expect(mockQueue.addBulk).toHaveBeenCalledWith(jobs)
  })


  it('should throw error when queue not found', async () => {
    // Given
    const queueClient = new QueueClient(queueRegistry)

    // When / Then
    expect(async () => {
      await queueClient.add('non-existent-queue', 'test-job', {})
    }).toThrow('Queue "non-existent-queue" not found')
  })
})
