import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { Queue, Worker, Job } from 'bullmq'
import { Context } from '@cheetah.js/core'


describe('Full TrackingId Flow', () => {

  const connection = {
    host: 'localhost',
    port: 6379,
  }

  let queue: Queue
  let worker: Worker

  beforeEach(() => {
    queue = new Queue('tracking-test', { connection })
  })

  afterEach(async () => {
    await worker?.close()
    await queue?.close()
  })


  it('processes job data without enforcing trackingId injection', async () => {
    const jobData = { userId: '123' }

    const job = await queue.add('test-job', jobData)

    expect(job.data).toEqual(jobData)

    let processedData: any

    worker = new Worker(
      'tracking-test',
      async (processingJob: Job) => {
        processedData = processingJob.data
        const context = Context.createFromJob(processingJob)
        return { success: true, trackingId: context.trackingId }
      },
      { connection }
    )

    await new Promise(resolve => setTimeout(resolve, 1000))

    expect(processedData).toEqual(jobData)
  })
})
