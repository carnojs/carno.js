import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { QueueClientProxy } from '../src/services/queue-client-proxy.service'


describe('QueueClientProxy', () => {

  let mockQueue: any

  beforeEach(() => {
    mockQueue = {
      name: 'test-queue',
      add: mock(() => Promise.resolve({ id: '1' })),
      addBulk: mock(() => Promise.resolve([{ id: '1' }])),
      getJob: mock(() => Promise.resolve({ id: '1' })),
    }
  })


  it('adds a job with provided data and options unchanged', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue)
    const jobData = { email: 'test@example.com' }

    // When
    await proxy.add('send-email', jobData, { delay: 100 })

    // Then
    expect(mockQueue.add).toHaveBeenCalledWith('send-email', jobData, { delay: 100 })
  })


  it('adds a job with undefined data', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue)

    // When
    await proxy.add('empty-job')

    // Then
    expect(mockQueue.add).toHaveBeenCalledWith('empty-job', {}, undefined)
  })


  it('adds bulk jobs without mutating payload', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue)
    const jobs = [
      { name: 'job1', data: { value: 1 } },
      { name: 'job2', data: { value: 2 } },
    ]

    // When
    await proxy.addBulk(jobs)

    // Then
    expect(mockQueue.addBulk).toHaveBeenCalledWith(jobs)
  })


  it('gets a job by id', async () => {
    // Given
    const proxy = new QueueClientProxy(mockQueue)
    const jobId = 'job-1'

    // When
    await proxy.getJob(jobId)

    // Then
    expect(mockQueue.getJob).toHaveBeenCalledWith(jobId)
  })
})
