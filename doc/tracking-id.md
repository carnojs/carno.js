# Tracking ID Feature

O Cheetah.js possui um sistema integrado de tracking ID que permite rastrear requisições através de todo o ecossistema do framework, incluindo logs e filas assíncronas.

## Visão Geral

- Todo request HTTP gera automaticamente um tracking ID único (UUID v4)
- O tracking ID pode ser fornecido via header `x-tracking-id` para propagação entre serviços
- Logs incluem automaticamente o tracking ID quando usando `RequestLogger`
- Jobs em filas (Bull) propagam o tracking ID automaticamente

## Context

O tracking ID é armazenado no `Context` de cada requisição:

```typescript
@Controller()
class UserController {
  @Post('/users')
  async createUser(context: Context) {
    console.log(context.trackingId) // UUID gerado automaticamente
    // ...
  }
}
```

### Tracking ID de Header

Se o header `x-tracking-id` for fornecido na requisição, ele será utilizado ao invés de gerar um novo:

```bash
curl -H "x-tracking-id: custom-id-123" http://localhost:3000/users
```

## Logging com Tracking ID

Para incluir automaticamente o tracking ID nos logs, use o `RequestLogger` ao invés do `LoggerService`:

```typescript
import { Controller, Post, RequestLogger, Context } from '@cheetah.js/core'

@Controller()
class UserController {
  constructor(private logger: RequestLogger) {}

  @Post('/users')
  async createUser(context: Context, body: CreateUserDto) {
    // O tracking ID será incluído automaticamente em todos os logs
    this.logger.info('Creating user') // { trackingId: "...", msg: "Creating user" }
    this.logger.error('Failed to create user') // { trackingId: "...", msg: "Failed to create user" }

    // ...
  }
}
```

### RequestLogger vs LoggerService

- **LoggerService**: Singleton, não inclui tracking ID automaticamente
- **RequestLogger**: Request-scoped, inclui tracking ID automaticamente em todos os logs

## Filas Assíncronas (Bull)

O tracking ID é propagado automaticamente para jobs em filas quando você usa o `QueueClient`:

### Adicionando Jobs com Tracking ID

```typescript
import { Injectable, Context } from '@cheetah.js/core'
import { QueueClient } from '@cheetah.js/queue'

@Injectable()
class UserService {
  constructor(private queueClient: QueueClient) {}

  async createUser(user: User, context: Context) {
    // O tracking ID do context é automaticamente injetado no job
    await this.queueClient.add('email-queue', 'send-welcome-email', {
      email: user.email,
      name: user.name
    })
  }
}
```

### Processando Jobs com Tracking ID

O tracking ID fica disponível no objeto `job`:

```typescript
import { Queue, Process } from '@cheetah.js/queue'
import { Job } from 'bullmq'

@Queue('email-queue')
class EmailQueue {
  @Process('send-welcome-email')
  async sendWelcomeEmail(job: Job) {
    console.log(job.trackingId) // Tracking ID original da requisição
    console.log(job.data.__trackingId) // Também disponível aqui

    // Use o tracking ID para correlacionar logs
    this.logger.info(`Sending email for tracking: ${job.trackingId}`)
  }
}
```

## Exemplo Completo

```typescript
import { Controller, Post, Injectable, Context, RequestLogger } from '@cheetah.js/core'
import { QueueClient, Queue, Process } from '@cheetah.js/queue'
import { Job } from 'bullmq'

// Controller que recebe a requisição
@Controller('/users')
class UserController {
  constructor(
    private userService: UserService,
    private logger: RequestLogger
  ) {}

  @Post()
  async createUser(context: Context, body: CreateUserDto) {
    this.logger.info('Received request to create user')

    const user = await this.userService.createUser(body, context)

    this.logger.info('User created successfully', { userId: user.id })

    return user
  }
}

// Service que adiciona job na fila
@Injectable()
class UserService {
  constructor(
    private queueClient: QueueClient,
    private logger: RequestLogger
  ) {}

  async createUser(data: CreateUserDto, context: Context) {
    const user = await this.saveUser(data)

    this.logger.info('Queuing welcome email')

    // Tracking ID é propagado automaticamente
    await this.queueClient.add('email-queue', 'send-welcome', {
      userId: user.id,
      email: user.email
    })

    return user
  }
}

// Queue que processa o job
@Queue('email-queue')
class EmailQueue {
  constructor(private emailService: EmailService) {}

  @Process('send-welcome')
  async sendWelcome(job: Job) {
    // O tracking ID está disponível aqui!
    console.log(`Processing job with tracking ID: ${job.trackingId}`)

    await this.emailService.sendWelcome(job.data.email)
  }
}
```

## Logs de Exemplo

Quando uma requisição passa pelo sistema, todos os logs terão o mesmo tracking ID:

```json
{
  "level": "info",
  "time": 1234567890,
  "trackingId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "msg": "Received request to create user"
}
{
  "level": "info",
  "time": 1234567891,
  "trackingId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "msg": "User created successfully",
  "userId": 123
}
{
  "level": "info",
  "time": 1234567892,
  "trackingId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "msg": "Queuing welcome email"
}
{
  "level": "info",
  "time": 1234567895,
  "trackingId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "msg": "Processing job with tracking ID: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
}
```

## Arquitetura

### Context
- Geração automática de UUID v4 em cada requisição
- Suporte a tracking ID via header `x-tracking-id`
- Request-scoped

### RequestLogger
- Request-scoped
- Cria child logger do Pino com tracking ID
- Todos os métodos (info, warn, error, debug, fatal, trace) incluem tracking ID automaticamente

### QueueClient
- Request-scoped
- Injeta tracking ID automaticamente em `job.data.__trackingId`
- Suporta `add()` e `addBulk()`

### QueueOrchestration
- Restaura tracking ID do job data para `job.trackingId`
- Disponibiliza tracking ID para processors

## Boas Práticas

1. **Use RequestLogger para logging em request handlers**
   ```typescript
   constructor(private logger: RequestLogger) {} // ✅
   constructor(private logger: LoggerService) {} // ❌ (não inclui tracking ID)
   ```

2. **Use QueueClient para adicionar jobs**
   ```typescript
   await this.queueClient.add('queue', 'job', data) // ✅ (tracking ID automático)
   await this.queue.add('job', data) // ❌ (sem tracking ID)
   ```

3. **Propague tracking ID entre serviços**
   ```typescript
   // Envie o tracking ID em headers quando chamar outros serviços
   const response = await fetch('https://api.example.com/users', {
     headers: {
       'x-tracking-id': context.trackingId
     }
   })
   ```

4. **Use tracking ID para debugging**
   ```typescript
   this.logger.error('Failed to process user', {
     error: error.message,
     userId: user.id
   })
   // Todos os logs terão o mesmo trackingId, facilitando rastreamento
   ```
