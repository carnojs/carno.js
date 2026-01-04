import { Queue, Worker, Job } from 'bullmq';

const connection = {
  host: 'localhost',
  port: 6379,
};

const queue = new Queue('course-processing', { connection });

console.log('📋 Teste: Worker pegando job errado (retorna vazio)\n');

// Worker that ignores jobs that are not its own
const workerProcessPlaylist = new Worker(
  'course-processing',
  async (job: Job) => {
    console.log(`🎬 Worker process-playlist pegou job: "${job.name}"`);

    // If the job is not its own, return early (no execution)
    if (job.name !== 'process-playlist') {
      console.log(`⚠️  Ignorando job "${job.name}" - não é meu!`);
      return; // Retorna undefined
    }

    console.log('✅ Executando lógica do process-playlist...');
    console.log('  - Dados:', job.data);
    await new Promise(r => setTimeout(r, 100));
    return { success: true, processor: 'process-playlist' };
  },
  { connection, concurrency: 1 }
);

const workerGenerateExercises = new Worker(
  'course-processing',
  async (job: Job) => {
    console.log(`📝 Worker generate-exercises pegou job: "${job.name}"`);

    if (job.name !== 'generate-exercises') {
      console.log(`⚠️  Ignorando job "${job.name}" - não é meu!`);
      return;
    }

    console.log('✅ Executando lógica do generate-exercises...');
    await new Promise(r => setTimeout(r, 100));
    return { success: true, processor: 'generate-exercises' };
  },
  { connection, concurrency: 5 }
);

workerProcessPlaylist.on('completed', (job, result) => {
  console.log(`  └─ ✅ Completed job "${job.name}":`, result);
});

workerGenerateExercises.on('completed', (job, result) => {
  console.log(`  └─ ✅ Completed job "${job.name}":`, result);
});

// Aguardar workers iniciarem
await new Promise(resolve => setTimeout(resolve, 1000));

console.log('\n🚀 Adicionando job "process-playlist"...\n');

// Adicionar apenas o job process-playlist
await queue.add('process-playlist', { courseId: '123' });

// Aguardar processamento
await new Promise(resolve => setTimeout(resolve, 3000));

console.log('\n🧹 Limpando...\n');

await workerProcessPlaylist.close();
await workerGenerateExercises.close();
await queue.close();

console.log('✅ Teste finalizado');
console.log('\n📊 Resultado: Se o worker errado pegou o job, ele completou sem executar a lógica!');
