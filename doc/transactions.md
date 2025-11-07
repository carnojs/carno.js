# Sistema de Transações do Cheetah.js ORM

## Visão Geral

O sistema de transações do Cheetah.js ORM garante atomicidade nas operações de banco de dados. Todas as operações dentro de uma transação compartilham o mesmo contexto transacional, permitindo commit ou rollback automático.

## Como Funciona

O sistema utiliza `AsyncLocalStorage` do Node.js para manter o contexto transacional através de todas as operações assíncronas dentro de uma transação. Isso significa que:

1. Quando você inicia uma transação com `orm.transaction()`, um contexto transacional é criado
2. Todas as operações de banco de dados dentro do callback automaticamente usam esse contexto
3. Se ocorrer um erro, todas as operações são revertidas (rollback)
4. Se não houver erros, todas as operações são confirmadas (commit)

## Uso Básico

### Transação Simples

```typescript
import { Orm } from '@cheetah.js/orm';

const orm = Orm.getInstance();

await orm.transaction(async (tx) => {
  // Todas as operações aqui usam o mesmo contexto transacional
  const user = new User();
  user.name = 'John Doe';
  user.email = 'john@example.com';
  await user.save();

  const profile = new Profile();
  profile.userId = user.id;
  profile.bio = 'Software Developer';
  await profile.save();

  // Se tudo correr bem, commit automático
  // Se houver erro, rollback automático
});
```

### Entity.save() em Transação

```typescript
await orm.transaction(async (tx) => {
  const product = new Product();
  product.name = 'Laptop';
  product.price = 1000;
  await product.save(); // Usa o contexto transacional automaticamente
});
```

### Static Methods em Transação

```typescript
await orm.transaction(async (tx) => {
  // Usando create
  const user = await User.create({
    name: 'Jane',
    email: 'jane@example.com'
  });

  // Usando update através de findOne + save
  const existingUser = await User.findOne({ id: 1 });
  if (existingUser) {
    existingUser.name = 'Updated Name';
    await existingUser.save();
  }
});
```

### Múltiplas Operações

```typescript
await orm.transaction(async (tx) => {
  // Inserir novo produto
  const product = await Product.create({
    name: 'Mouse',
    price: 50,
    stock: 100
  });

  // Criar pedido
  const order = new Order();
  order.productId = product.id;
  order.quantity = 2;
  order.total = product.price * order.quantity;
  await order.save();

  // Atualizar estoque
  product.stock -= order.quantity;
  await product.save();

  // Todas as operações são commitadas juntas
});
```

## Tratamento de Erros

### Rollback Automático

```typescript
try {
  await orm.transaction(async (tx) => {
    const user = await User.create({ name: 'Test' });

    // Simulando um erro
    throw new Error('Something went wrong');

    // Esta operação nunca será executada
    await Profile.create({ userId: user.id });
  });
} catch (error) {
  console.error('Transaction failed:', error);
  // O usuário NÃO foi criado no banco de dados (rollback automático)
}
```

### Validação com Rollback

```typescript
await orm.transaction(async (tx) => {
  const order = new Order();
  order.total = 1000;
  await order.save();

  const product = await Product.findOne({ id: order.productId });

  if (!product || product.stock < order.quantity) {
    throw new Error('Insufficient stock');
    // Rollback automático - o pedido não será salvo
  }

  product.stock -= order.quantity;
  await product.save();
  // Commit automático de ambas as operações
});
```

## Arquitetura Interna

### TransactionContext

O `TransactionContext` é gerenciado através do `AsyncLocalStorage`, garantindo que o contexto seja mantido através de chamadas assíncronas:

```typescript
// Interno - não precisa usar diretamente
import { transactionContext } from '@cheetah.js/orm';

// O contexto é gerenciado automaticamente pelo Orm.transaction()
```

### Fluxo de Execução

1. `orm.transaction()` chama `driver.transaction()`
2. Driver usa `sql.begin()` do Bun para iniciar transação
3. TransactionContext armazena o contexto `tx` no AsyncLocalStorage
4. Todas as operações verificam se há contexto transacional via `transactionContext.getContext()`
5. Se houver contexto, usa o `tx`; caso contrário, usa a conexão padrão
6. Ao finalizar o callback sem erros, Bun faz commit automático
7. Se houver erro, Bun faz rollback automático

## Melhores Práticas

### ✅ Fazer

```typescript
// 1. Sempre usar try/catch para tratamento de erros
try {
  await orm.transaction(async (tx) => {
    // operações
  });
} catch (error) {
  // tratamento
}

// 2. Manter transações curtas e focadas
await orm.transaction(async (tx) => {
  // Apenas operações necessárias
  await order.save();
  await updateStock(product);
});

// 3. Validar antes de salvar
await orm.transaction(async (tx) => {
  if (!isValid(data)) {
    throw new Error('Invalid data');
  }
  await entity.save();
});
```

### ❌ Evitar

```typescript
// 1. Não fazer operações longas dentro de transações
await orm.transaction(async (tx) => {
  await entity.save();
  await sendEmail(); // ❌ Operação externa longa
  await callExternalAPI(); // ❌ Pode falhar e causar timeout
});

// 2. Não aninhar transações manualmente
await orm.transaction(async (tx1) => {
  await orm.transaction(async (tx2) => { // ❌ Evitar
    // ...
  });
});

// 3. Não capturar erros sem re-lançar se necessário
await orm.transaction(async (tx) => {
  try {
    await entity.save();
  } catch (error) {
    console.log(error); // ❌ Erro silenciado, commit indevido
  }
});
```

## Diferenças do Sistema Anterior

### Antes (❌ Não Funcionava)

```typescript
await orm.transaction(async (tx) => {
  await entity.save(); // ❌ Não usava o tx
  await Repository.create(data); // ❌ Não usava o tx
  // Cada operação executava fora da transação
});
```

### Agora (✅ Funciona Corretamente)

```typescript
await orm.transaction(async (tx) => {
  await entity.save(); // ✅ Usa o tx automaticamente
  await Repository.create(data); // ✅ Usa o tx automaticamente
  // Todas as operações compartilham o mesmo contexto transacional
});
```

## Conclusão

O novo sistema de transações do Cheetah.js ORM fornece:

- ✅ Atomicidade garantida
- ✅ Contexto compartilhado automaticamente
- ✅ Rollback automático em caso de erro
- ✅ API simples e intuitiva
- ✅ Compatibilidade total com Entity.save(), Repository e QueryBuilder

Não é necessário passar o contexto `tx` manualmente - o sistema gerencia isso automaticamente através do AsyncLocalStorage.
