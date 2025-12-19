# @cheetah.js/queue - Documentação Completa

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Decorators](#decorators)
- [Exemplos de Uso](#exemplos-de-uso)
- [API Reference](#api-reference)
- [Testes](#testes)

## 🎯 Visão Geral

O pacote `@cheetah.js/queue` fornece integração completa com BullMQ para processamento assíncrono de jobs usando decorators no estilo NestJS, adaptado para o framework Cheetah.js.

### Recursos Principais

- ✅ **Decorators** para definir queues e processors
- ✅ **Eventos completos** (job e queue events)
- ✅ **Configuração flexível** do Redis (global e por fila)
- ✅ **Injeção de dependências** integrada
- ✅ **TypeScript** com tipos completos
- ✅ **Testes** com Redis real

## 📦 Instalação

```bash
bun add @cheetah.js/queue bullmq
```

**Requisitos:**
- Redis 5.0+
- @cheetah.js/core >= 0.1.27

## ⚙️ Configuração

### Configuração Básica

```typescript
import { Cheetah } from '@cheetah.js/core';
import { QueueModule } from '@cheetah.js/queue';

const app = new Cheetah();

app.use(QueueModule({
  connection: {
    host: 'localhost',
    port: 6379,
  }
}));

await app.listen(3000);
```

### Configuração com Autenticação

```typescript
app.use(QueueModule({
  connection: {
    host: 'localhost',
    port: 6379,
    password: 'your-redis-password',
    db: 0,
  }
}));
```

## 🎨 Decorators

### @Queue

Define uma classe como processadora de filas.

```typescript
@Queue(name: string, options?: QueueOptions)
```

**Opções:**
- `name`: Nome da fila (obrigatório)
- `connection`: Sobrescrever conexão Redis padrão
- `defaultJobOptions`: Opções padrão para jobs

**Exemplo:**

```typescript
@Queue('email', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
  }
})
export class EmailQueue {
  // ...
}
```

### @Process

Define um método como processador de jobs.

```typescript
@Process(name?: string, options?: ProcessOptions)
```

**Opções:**
- `name`: Nome do job (opcional)
- `concurrency`: Número de jobs processados simultaneamente

**Exemplo:**

```typescript
@Process('send-email')
async sendEmail(job: Job) {
  const { to, subject, body } = job.data;

  // Lógica de envio

  return { sent: true };
}

@Process({ name: 'bulk', concurrency: 10 })
async sendBulk(job: Job) {
  // Processar em lote
}
```

### @InjectQueue

Injeta uma queue em um service.

```typescript
@InjectQueue(queueName: string)
```

`@InjectQueue` fornece um proxy leve da queue com `add`, `addBulk`, e `getJob`.

**Exemplo:**

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email') private emailQueue: QueueClientProxy
  ) {}

  async createUser(data: any) {
    const user = await this.userRepository.create(data);

    await this.emailQueue.add('welcome', {
      email: user.email,
      name: user.name,
    });

    return user;
  }
}
```

### Decorators de Eventos de Job

#### @OnJobCompleted

Disparado quando um job é completado com sucesso.

```typescript
@OnJobCompleted(jobName?: string)
async onCompleted(job: Job, result: any) {
  console.log(`Job ${job.id} completed with:`, result);
}
```

#### @OnJobFailed

Disparado quando um job falha.

```typescript
@OnJobFailed(jobName?: string)
async onFailed(job: Job, error: Error) {
  console.error(`Job ${job.id} failed:`, error.message);
}
```

#### @OnJobProgress

Disparado quando o progresso do job é atualizado.

```typescript
@OnJobProgress(jobName?: string)
async onProgress(job: Job, progress: number) {
  console.log(`Job ${job.id} progress: ${progress}%`);
}
```

#### Outros Eventos de Job

- `@OnJobActive` - Job começou a processar
- `@OnJobWaiting` - Job está aguardando processamento
- `@OnJobDelayed` - Job foi atrasado
- `@OnJobRemoved` - Job foi removido
- `@OnJobStalled` - Job travou

### Decorators de Eventos de Queue

- `@OnQueueCleaned` - Queue foi limpa
- `@OnQueueDrained` - Queue foi drenada
- `@OnQueueError` - Erro na queue
- `@OnQueuePaused` - Queue pausada
- `@OnQueueResumed` - Queue retomada
- `@OnQueueWaiting` - Job adicionado à queue

## 💡 Exemplos de Uso

### Exemplo Completo: Sistema de Email

```typescript
import { Queue, Process, OnJobCompleted, OnJobFailed, OnJobProgress } from '@cheetah.js/queue';
import { Job } from 'bullmq';

@Queue('email-queue')
export class EmailQueue {
  @Process('send-welcome')
  async sendWelcome(job: Job) {
    const { email, name } = job.data;

    await job.updateProgress(25);

    // Gerar conteúdo
    const html = this.generateWelcomeEmail(name);

    await job.updateProgress(50);

    // Enviar email
    await this.emailService.send({
      to: email,
      subject: 'Bem-vindo!',
      html,
    });

    await job.updateProgress(100);

    return {
      sent: true,
      timestamp: Date.now(),
    };
  }

  @Process('send-newsletter')
  async sendNewsletter(job: Job) {
    const { recipients, content } = job.data;

    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const sent = await this.emailService.send({
        to: recipients[i],
        subject: 'Newsletter',
        html: content,
      });

      results.push(sent);

      const progress = Math.round(((i + 1) / recipients.length) * 100);
      await job.updateProgress(progress);
    }

    return {
      total: recipients.length,
      sent: results.filter(r => r).length,
    };
  }

  @OnJobCompleted()
  async handleCompleted(job: Job, result: any) {
    console.log(`✅ Email job ${job.name} completed:`, result);

    // Log em banco de dados
    await this.logService.create({
      type: 'email_sent',
      jobId: job.id,
      data: result,
    });
  }

  @OnJobFailed()
  async handleFailed(job: Job, error: Error) {
    console.error(`❌ Email job ${job.name} failed:`, error.message);

    // Enviar alerta
    await this.alertService.notify({
      level: 'error',
      message: `Email job failed: ${error.message}`,
      jobId: job.id,
    });
  }

  @OnJobProgress()
  async handleProgress(job: Job, progress: number) {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
  }

  private generateWelcomeEmail(name: string): string {
    return `<h1>Bem-vindo, ${name}!</h1>`;
  }
}
```

### Exemplo: Processamento de Imagens

```typescript
@Queue('image-processing', {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  }
})
export class ImageQueue {
  @Process('resize')
  async resizeImage(job: Job) {
    const { imageUrl, width, height } = job.data;

    await job.updateProgress(10);

    // Download imagem
    const buffer = await this.downloadImage(imageUrl);

    await job.updateProgress(40);

    // Processar
    const resized = await sharp(buffer)
      .resize(width, height)
      .toBuffer();

    await job.updateProgress(70);

    // Upload
    const url = await this.uploadImage(resized);

    await job.updateProgress(100);

    return { url, size: resized.length };
  }

  @Process({ name: 'thumbnail', concurrency: 5 })
  async createThumbnail(job: Job) {
    // Processar múltiplos thumbnails em paralelo
    const { imageUrl, sizes } = job.data;

    const thumbnails = await Promise.all(
      sizes.map(size => this.resizeTo(imageUrl, size))
    );

    return { thumbnails };
  }
}
```

### Exemplo: Uso com Service

```typescript
@Injectable()
export class ArticleService {
  constructor(
    @InjectQueue('image-processing') private imageQueue: Queue,
    @InjectQueue('email-queue') private emailQueue: Queue
  ) {}

  async publishArticle(article: Article) {
    // Salvar artigo
    await this.repository.save(article);

    // Adicionar job de processamento de imagem
    if (article.coverImage) {
      await this.imageQueue.add('resize', {
        imageUrl: article.coverImage,
        width: 1200,
        height: 630,
      });
    }

    // Notificar subscribers
    await this.emailQueue.add('send-newsletter', {
      recipients: await this.getSubscribers(),
      content: this.generateNewsletterContent(article),
    });

    return article;
  }
}
```

## 📚 API Reference

### QueueRegistry

Gerencia todas as queues e workers registrados.

```typescript
class QueueRegistry {
  hasQueue(name: string): boolean
  getQueue(name: string): Queue
  addQueue(name: string, queue: Queue): void

  hasWorker(name: string): boolean
  getWorker(name: string): Worker
  addWorker(name: string, worker: Worker): void

  getQueues(): Map<string, Queue>
  getWorkers(): Map<string, Worker>

  async closeQueue(name: string): Promise<void>
  async closeWorker(name: string): Promise<void>
  async closeAll(): Promise<void>
}
```

### Interfaces

#### QueueOptions

```typescript
interface QueueOptions {
  name?: string;
  connection?: ConnectionOptions;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: number | { type: string; delay: number };
    delay?: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}
```

#### ProcessOptions

```typescript
interface ProcessOptions {
  name?: string;
  concurrency?: number;
}
```

## 🧪 Testes

### Executar Testes

```bash
# Iniciar Redis
docker-compose up -d redis

# Executar testes
cd packages/queue
bun test
```

### Estrutura de Testes

- **basic.spec.ts** - Testes unitários básicos
- **decorators.spec.ts** - Testes de decorators
- **metadata.spec.ts** - Testes de metadata
- **registry.spec.ts** - Testes de QueueRegistry
- **queue.integration.spec.ts** - Testes de integração com Redis
- **events.integration.spec.ts** - Testes de eventos

### Cobertura

- 25 testes
- 68 assertions
- 100% dos recursos principais testados

## 📝 Notas Importantes

### Performance

- Use `concurrency` para processar jobs em paralelo
- Configure `removeOnComplete` para limpar jobs automaticamente
- Use `backoff` para retry com delay exponencial

### Boas Práticas

1. **Sempre use try-catch** nos processors
2. **Use updateProgress** para jobs longos
3. **Configure retry** para jobs críticos
4. **Use eventos** para logging e monitoramento
5. **Limpe jobs completos** regularmente

### Troubleshooting

**Job não está sendo processado:**
- Verifique se o Redis está rodando
- Verifique se o worker foi registrado
- Verifique logs de erro

**Memory leak:**
- Configure `removeOnComplete` e `removeOnFail`
- Use `closeAll()` no shutdown da aplicação

**Jobs lentos:**
- Aumente `concurrency`
- Otimize o código do processor
- Use múltiplas queues para diferentes tipos de jobs

## 📄 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, siga os padrões do projeto:

- SOLID principles
- Object Calisthenics (classes ≤ 50 linhas, métodos ≤ 5 linhas)
- Testes para novos recursos
- Documentação atualizada
