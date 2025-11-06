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


  it('should preserve trackingId from job data through the entire flow', async () => {
    // Given: Simulate QueueClient injecting trackingId
    const originalTrackingId = 'original-tracking-from-request'

    const jobData = {
      userId: '123',
      __trackingId: originalTrackingId
    }

    // When: Add job with trackingId in data
    const job = await queue.add('test-job', jobData)

    console.log('\n=== After adding job ===')
    console.log('Job ID:', job.id)
    console.log('Job data.__trackingId:', job.data.__trackingId)
    console.log('Job.trackingId:', job.trackingId)

    // Then: Verify trackingId is in job data
    expect(job.data.__trackingId).toBe(originalTrackingId)

    // Simulate what happens in the worker
    let capturedTrackingId: string | undefined

    worker = new Worker(
      'tracking-test',
      async (processingJob: Job) => {
        console.log('\n=== Inside worker processor ===')
        console.log('Processing job ID:', processingJob.id)
        console.log('Processing job.data.__trackingId:', processingJob.data.__trackingId)
        console.log('Processing job.trackingId:', processingJob.trackingId)

        // Simulate creating Context from job
        const context = Context.createFromJob(processingJob)
        capturedTrackingId = context.trackingId

        console.log('Context.trackingId:', context.trackingId)

        return { success: true }
      },
      { connection }
    )

    // Wait for job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify trackingId was preserved
    console.log('\n=== Final verification ===')
    console.log('Original trackingId:', originalTrackingId)
    console.log('Captured trackingId:', capturedTrackingId)

    expect(capturedTrackingId).toBe(originalTrackingId)
  })
})
