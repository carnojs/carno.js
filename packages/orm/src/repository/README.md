# Repository Pattern - Cheetah.js ORM

Classe genérica `Repository<T>` altamente tipada para operações de banco de dados com type-safety completo.

## 📦 Instalação

```typescript
import { Repository } from '@cheetah.js/orm';
```

## 🚀 Uso Básico

### 1. Criando um Repository

```typescript
import { Repository } from '@cheetah.js/orm';
import { Service } from '@cheetah.js/core';
import { Lesson } from './entities/Lesson';

@Service()
export class LessonRepository extends Repository<Lesson> {
  constructor() {
    super(Lesson);
  }

  // Adicione métodos personalizados aqui
  async findByCourse(courseId: number): Promise<Lesson[]> {
    return this.find({
      where: { courseId },
      order: { orderIndex: 'ASC' }
    });
  }

  async findPublishedByCourse(courseId: number): Promise<Lesson[]> {
    return this.find({
      where: {
        courseId,
        isPublished: true
      },
      order: { orderIndex: 'ASC' }
    });
  }
}
```

## 📚 API Reference

### Tabela Resumida

| Método | Tipo | Descrição |
|--------|------|-----------|
| `find()` | Read | Busca múltiplas entidades |
| `findOne()` | Read | Busca uma entidade (retorna undefined) |
| `findOneOrFail()` | Read | Busca uma entidade (lança erro) |
| `findAll()` | Read | Busca todas as entidades |
| `findById()` | Read | Busca por ID (retorna undefined) |
| `findByIdOrFail()` | Read | Busca por ID (lança erro) |
| `create()` | Write | Cria nova entidade |
| `update()` | Write | Atualiza entidades por filtro |
| `updateById()` | Write | Atualiza entidade por ID |
| `delete()` | Write | **Deleta entidades por filtro** |
| `deleteById()` | Write | **Deleta entidade por ID** |
| `count()` | Utility | Conta entidades |
| `exists()` | Utility | Verifica existência |

---

### Métodos de Leitura (Read)

#### `find(options: RepositoryFindOptions<T>): Promise<T[]>`

Busca múltiplas entidades com filtros, ordenação, paginação.

```typescript
const lessons = await lessonRepo.find({
  where: { courseId: 1, isPublished: true },
  order: { orderIndex: 'ASC', createdAt: 'DESC' },
  limit: 10,
  offset: 0,
  fields: ['id', 'title', 'content'],
  load: ['course'],
  loadStrategy: 'joined'
});
```

**Opções:**
- `where`: Filtros (usa `FilterQuery<T>` do ORM)
- `order`: Ordenação `{ campo: 'ASC' | 'DESC' }`
- `limit`: Limite de registros
- `offset`: Pular N registros
- `fields`: Campos a selecionar
- `load`: Relações a carregar
- `loadStrategy`: `'joined'` ou `'select'`

---

#### `findOne(options: RepositoryFindOneOptions<T>): Promise<T | undefined>`

Busca uma única entidade. Retorna `undefined` se não encontrar.

```typescript
const lesson = await lessonRepo.findOne({
  where: { id: 1 }
});
```

---

#### `findOneOrFail(options: RepositoryFindOneOptions<T>): Promise<T>`

Busca uma única entidade. **Lança erro** se não encontrar.

```typescript
try {
  const lesson = await lessonRepo.findOneOrFail({
    where: { id: 1 }
  });
} catch (error) {
  // Entidade não encontrada
}
```

---

#### `findAll(options?: Omit<RepositoryFindOptions<T>, 'where'>): Promise<T[]>`

Busca todas as entidades (sem filtro where).

```typescript
const allLessons = await lessonRepo.findAll({
  order: { createdAt: 'DESC' },
  limit: 100
});
```

---

#### `findById(id: number | string): Promise<T | undefined>`

Busca entidade por ID primário.

```typescript
const lesson = await lessonRepo.findById(1);
```

---

#### `findByIdOrFail(id: number | string): Promise<T>`

Busca entidade por ID primário. **Lança erro** se não encontrar.

```typescript
const lesson = await lessonRepo.findByIdOrFail(1);
```

---

### Métodos de Escrita (Write)

#### `create(data: Partial<T>): Promise<T>`

Cria uma nova entidade.

```typescript
const lesson = await lessonRepo.create({
  courseId: 1,
  title: 'Introdução ao TypeScript',
  content: 'Conteúdo da aula...',
  orderIndex: 0,
  isPublished: true
});
```

---

#### `update(where: FilterQuery<T>, data: Partial<T>): Promise<void>`

Atualiza entidades que correspondem ao filtro.

```typescript
await lessonRepo.update(
  { courseId: 1, isPublished: false },
  { isPublished: true }
);
```

---

#### `updateById(id: number | string, data: Partial<T>): Promise<void>`

Atualiza entidade por ID.

```typescript
await lessonRepo.updateById(1, {
  title: 'Título Atualizado',
  isPublished: true
});
```

---

#### `delete(where: FilterQuery<T>): Promise<void>`

Deleta entidades que correspondem ao filtro.

```typescript
// Deletar lições não publicadas
await lessonRepo.delete({ isPublished: false });

// Deletar por múltiplos critérios
await lessonRepo.delete({
  courseId: 1,
  isPublished: false
});
```

---

#### `deleteById(id: number | string): Promise<void>`

Deleta entidade por ID.

```typescript
await lessonRepo.deleteById(1);
```

**⚠️ IMPORTANTE**: Operações de delete são **irreversíveis**. Use com cuidado.

---

### Métodos Utilitários

#### `count(where?: FilterQuery<T>): Promise<number>`

Conta entidades que correspondem ao filtro.

```typescript
const total = await lessonRepo.count({ courseId: 1 });
const published = await lessonRepo.count({
  courseId: 1,
  isPublished: true
});
```

---

#### `exists(where: FilterQuery<T>): Promise<boolean>`

Verifica se existe alguma entidade que corresponde ao filtro.

```typescript
const hasLessons = await lessonRepo.exists({ courseId: 1 });
```

---

## 🎯 Exemplos Práticos

### Exemplo Completo: LessonRepository

```typescript
import { Repository } from '@cheetah.js/orm';
import { Service } from '@cheetah.js/core';
import { Lesson } from './entities/Lesson';

@Service()
export class LessonRepository extends Repository<Lesson> {
  constructor() {
    super(Lesson);
  }

  async findByCourse(courseId: number): Promise<Lesson[]> {
    return this.find({
      where: { courseId },
      order: { orderIndex: 'ASC' }
    });
  }

  async findPublishedByCourse(courseId: number): Promise<Lesson[]> {
    return this.find({
      where: { courseId, isPublished: true },
      order: { orderIndex: 'ASC' }
    });
  }

  async findNextLesson(
    courseId: number,
    currentOrderIndex: number
  ): Promise<Lesson | undefined> {
    return this.findOne({
      where: {
        courseId,
        isPublished: true,
        orderIndex: { $gt: currentOrderIndex } as any
      },
      order: { orderIndex: 'ASC' }
    });
  }

  async countPublishedByCourse(courseId: number): Promise<number> {
    return this.count({
      courseId,
      isPublished: true
    });
  }

  async reorder(courseId: number, lessonIds: number[]): Promise<void> {
    for (let i = 0; i < lessonIds.length; i++) {
      await this.updateById(lessonIds[i], {
        orderIndex: i
      });
    }
  }

  async publish(id: number): Promise<void> {
    await this.updateById(id, { isPublished: true });
  }

  async unpublish(id: number): Promise<void> {
    await this.updateById(id, { isPublished: false });
  }

  async publishAllByCourse(courseId: number): Promise<void> {
    await this.update(
      { courseId, isPublished: false },
      { isPublished: true }
    );
  }

  async deleteAllByCourse(courseId: number): Promise<void> {
    await this.delete({ courseId });
  }

  async deleteDrafts(courseId: number): Promise<void> {
    await this.delete({
      courseId,
      isPublished: false
    });
  }
}
```

### Uso em um Service

```typescript
import { Service } from '@cheetah.js/core';
import { LessonRepository } from './repositories/LessonRepository';

@Service()
export class LessonService {
  constructor(
    private lessonRepo: LessonRepository
  ) {}

  async getCourseLessons(courseId: number, onlyPublished: boolean = false) {
    if (onlyPublished) {
      return this.lessonRepo.findPublishedByCourse(courseId);
    }

    return this.lessonRepo.findByCourse(courseId);
  }

  async getNextLesson(courseId: number, currentOrderIndex: number) {
    return this.lessonRepo.findNextLesson(courseId, currentOrderIndex);
  }

  async createLesson(data: any) {
    const lessonsCount = await this.lessonRepo.count({
      courseId: data.courseId
    });

    return this.lessonRepo.create({
      ...data,
      orderIndex: lessonsCount
    });
  }

  async publishLesson(id: number) {
    const lesson = await this.lessonRepo.findByIdOrFail(id);
    await this.lessonRepo.publish(id);
    return lesson;
  }

  async reorderLessons(courseId: number, lessonIds: number[]) {
    await this.lessonRepo.reorder(courseId, lessonIds);
  }

  async deleteLesson(id: number) {
    const lesson = await this.lessonRepo.findByIdOrFail(id);
    await this.lessonRepo.deleteById(id);
  }

  async cleanupDrafts(courseId: number) {
    await this.lessonRepo.deleteDrafts(courseId);
  }
}
```

## 🔧 Queries Avançadas

Para queries mais complexas, use o `QueryBuilder` diretamente:

```typescript
@Service()
export class LessonRepository extends Repository<Lesson> {
  constructor() {
    super(Lesson);
  }

  async findComplexQuery() {
    return this['createQueryBuilder']()
      .select(['id', 'title', 'content'])
      .where({ isPublished: true })
      .load(['course', 'comments'])
      .orderBy(['orderIndex ASC', 'createdAt DESC'])
      .limit(10)
      .offset(0)
      .executeAndReturnAll();
  }

  async deleteWithComplexConditions(courseId: number, olderThanDays: number) {
    // Exemplo de delete com query builder
    await this['createQueryBuilder']()
      .delete()
      .where({
        courseId,
        isPublished: false,
        createdAt: { $lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) }
      })
      .execute();
  }
}
```

## ✅ Type Safety

Todos os métodos são **altamente tipados**:

```typescript
const lesson = await lessonRepo.findById(1);
//    ^? Lesson | undefined

const lessons = await lessonRepo.find({
  where: {
    courseId: 1,        // ✅ OK
    invalidField: true  // ❌ Erro de compilação!
  },
  order: {
    orderIndex: 'ASC',  // ✅ OK
    invalidField: 'ASC' // ❌ Erro de compilação!
  }
});
```

## 🎁 Benefícios

- ✅ **Type-Safe**: Completamente tipado com TypeScript
- ✅ **DRY**: Evita duplicação de código
- ✅ **Testável**: Facilita testes unitários e de integração
- ✅ **Consistente**: API uniforme em todo o projeto
- ✅ **Extensível**: Adicione métodos personalizados facilmente
- ✅ **DI Ready**: Funciona perfeitamente com `@Service()`

## 📖 Comparação

### Antes (sem Repository)

```typescript
@Service()
export class LessonService {
  async findByCourse(courseId: number) {
    return Lesson.find(
      { courseId },
      { orderBy: ['orderIndex ASC'] }
    );
  }

  async findPublishedByCourse(courseId: number) {
    return Lesson.find(
      { courseId, isPublished: true },
      { orderBy: ['orderIndex ASC'] }
    );
  }
}
```

### Depois (com Repository)

```typescript
@Service()
export class LessonRepository extends Repository<Lesson> {
  constructor() {
    super(Lesson);
  }

  async findByCourse(courseId: number) {
    return this.find({
      where: { courseId },
      order: { orderIndex: 'ASC' }
    });
  }

  async findPublishedByCourse(courseId: number) {
    return this.find({
      where: { courseId, isPublished: true },
      order: { orderIndex: 'ASC' }
    });
  }
}

@Service()
export class LessonService {
  constructor(private lessonRepo: LessonRepository) {}

  async getCourseLessons(courseId: number) {
    return this.lessonRepo.findByCourse(courseId);
  }
}
```

---

**Desenvolvido com ❤️ para Cheetah.js**
