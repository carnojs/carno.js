import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { QueueClientProxy } from '../src/services/queue-client-proxy.service'


describe('QueueClientProxy', () => {

  let mockQueue: any

  beforeEach(() => {
    mockQueue = {
      name: 'test-queue',
      add: mock(() => Promise.resolve({ id: '1' })),
      addBulk: mock(() => Promise.resolve([{ id: '1' }])),
    }
  })


  it('adds a job with provided data and options unchanged', async () => {
    const proxy = new QueueClientProxy(mockQueue)
    const jobData = { email: 'test@example.com' }

    await proxy.add('send-email', jobData, { delay: 100 })

    expect(mockQueue.add).toHaveBeenCalledWith('send-email', jobData, { delay: 100 })
  })


  it('adds a job with undefined data', async () => {
    const proxy = new QueueClientProxy(mockQueue)

    await proxy.add('empty-job')

    expect(mockQueue.add).toHaveBeenCalledWith('empty-job', {}, undefined)
  })


  it('adds bulk jobs without mutating payload', async () => {
    const proxy = new QueueClientProxy(mockQueue)
    const jobs = [
      { name: 'job1', data: { value: 1 } },
      { name: 'job2', data: { value: 2 } },
    ]

    await proxy.addBulk(jobs)

    expect(mockQueue.addBulk).toHaveBeenCalledWith(jobs)
  })
})
