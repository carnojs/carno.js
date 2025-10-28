import { Queue, Worker, Job } from 'bullmq';

const connection = {
  host: 'localhost',
  port: 6379,
};

const queue = new Queue('test-queue', { connection });

// Simulando o comportamento atual: múltiplos workers ouvindo a mesma queue
const worker1 = new Worker(
  'test-queue',
  async (job: Job) => {
    console.log(`Worker 1 (job-a) processando:`, job.name, job.data);
    if (job.name !== 'job-a') {
      console.log(`⚠️ Worker 1 pegou job errado: ${job.name}`);
    }
    return { processor: 'worker1' };
  },
  { connection }
);

const worker2 = new Worker(
  'test-queue',
  async (job: Job) => {
    console.log(`Worker 2 (job-b) processando:`, job.name, job.data);
    if (job.name !== 'job-b') {
      console.log(`⚠️ Worker 2 pegou job errado: ${job.name}`);
    }
    return { processor: 'worker2' };
  },
  { connection }
);

worker1.on('completed', (job, result) => {
  console.log(`✅ Worker 1 completed:`, job.name, result);
});

worker2.on('completed', (job, result) => {
  console.log(`✅ Worker 2 completed:`, job.name, result);
});

// Aguardar workers iniciarem
await new Promise(resolve => setTimeout(resolve, 1000));

console.log('\n🚀 Adicionando jobs...\n');

// Adicionar jobs
await queue.add('job-a', { test: 'data-a' });
await queue.add('job-b', { test: 'data-b' });

// Aguardar processamento
await new Promise(resolve => setTimeout(resolve, 3000));

await worker1.close();
await worker2.close();
await queue.close();

console.log('\n✅ Teste finalizado');
