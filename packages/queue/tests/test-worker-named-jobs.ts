import { Queue, Worker, Job } from 'bullmq';

const connection = {
  host: 'localhost',
  port: 6379,
};

const queue = new Queue('course-processing', { connection });

console.log('📋 Teste: Múltiplos workers na mesma queue com jobs nomeados\n');

// Simulating the current Carno.js behavior:
// Each @Process creates a separate worker, all on the same queue

const workerProcessPlaylist = new Worker(
  'course-processing',
  async (job: Job) => {
    console.log(`🎬 Worker process-playlist pegou job: "${job.name}"`);
    if (job.name === 'process-playlist') {
      console.log('✅ Executando lógica do process-playlist...');
      await new Promise(r => setTimeout(r, 100));
      return { success: true, processor: 'process-playlist' };
    } else {
      console.log(`⚠️  Worker process-playlist pegou job errado: "${job.name}"`);
      return { success: false, wrongWorker: true };
    }
  },
  { connection, concurrency: 1 }
);

const workerGenerateExercises = new Worker(
  'course-processing',
  async (job: Job) => {
    console.log(`📝 Worker generate-exercises pegou job: "${job.name}"`);
    if (job.name === 'generate-exercises') {
      console.log('✅ Executando lógica do generate-exercises...');
      await new Promise(r => setTimeout(r, 100));
      return { success: true, processor: 'generate-exercises' };
    } else {
      console.log(`⚠️  Worker generate-exercises pegou job errado: "${job.name}"`);
      return { success: false, wrongWorker: true };
    }
  },
  { connection, concurrency: 5 }
);

const workerSyncTranscription = new Worker(
  'course-processing',
  async (job: Job) => {
    console.log(`🔄 Worker sync-transcription pegou job: "${job.name}"`);
    if (job.name === 'sync-transcription-results') {
      console.log('✅ Executando lógica do sync-transcription-results...');
      await new Promise(r => setTimeout(r, 100));
      return { success: true, processor: 'sync-transcription-results' };
    } else {
      console.log(`⚠️  Worker sync-transcription pegou job errado: "${job.name}"`);
      return { success: false, wrongWorker: true };
    }
  },
  { connection, concurrency: 1 }
);

workerProcessPlaylist.on('completed', (job, result) => {
  console.log(`  └─ ✅ Worker process-playlist completed job "${job.name}":`, result);
});

workerGenerateExercises.on('completed', (job, result) => {
  console.log(`  └─ ✅ Worker generate-exercises completed job "${job.name}":`, result);
});

workerSyncTranscription.on('completed', (job, result) => {
  console.log(`  └─ ✅ Worker sync-transcription completed job "${job.name}":`, result);
});

// Aguardar workers iniciarem
await new Promise(resolve => setTimeout(resolve, 1000));

console.log('\n🚀 Adicionando jobs na fila...\n');

// Adicionar os 3 tipos de jobs
await queue.add('process-playlist', { courseId: '123' });
await queue.add('generate-exercises', { lessonId: '456' });
await queue.add('sync-transcription-results', { data: 'test' });

// Aguardar processamento
await new Promise(resolve => setTimeout(resolve, 3000));

console.log('\n🧹 Limpando...\n');

await workerProcessPlaylist.close();
await workerGenerateExercises.close();
await workerSyncTranscription.close();
await queue.close();

console.log('✅ Teste finalizado');
