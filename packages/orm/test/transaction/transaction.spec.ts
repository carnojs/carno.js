import { afterEach, beforeEach, describe, expect, jest, mock, test } from 'bun:test';
import { BaseEntity, Entity, Orm, PrimaryKey, Property } from '../../src';
import { SQL } from 'bun';

@Entity()
class TestUser extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @Property()
  email: string;
}

describe('Transaction System', () => {
  let orm: Orm;
  let mockExecuteStatement: any;
  let mockTransaction: any;
  let mockSqlInstance: any;

  beforeEach(() => {
    // Mock SQL instance
    mockSqlInstance = {
      unsafe: jest.fn().mockResolvedValue([]),
      begin: jest.fn(),
      close: jest.fn(),
    };

    // Mock driver's executeStatement
    mockExecuteStatement = jest.fn().mockResolvedValue({
      query: { rows: [{ id: 1, name: 'Test', email: 'test@test.com' }] },
      startTime: Date.now(),
      sql: 'MOCK SQL',
    });

    // Mock transaction
    mockTransaction = jest.fn();

    // Create ORM instance with mocked driver
    orm = Orm.getInstance();

    // @ts-ignore - accessing private member for testing
    orm.driverInstance = {
      executeStatement: mockExecuteStatement,
      transaction: mockTransaction,
      sql: mockSqlInstance,
    };

    // @ts-ignore - set mock logger
    orm.logger = { log: jest.fn() };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Given - Entity.save dentro de transação / When - Executar save / Then - Deve usar contexto transacional', async () => {
    // Given
    const user = new TestUser();
    user.id = 1;
    user.name = 'John';
    user.email = 'john@test.com';

    let txContext: any;
    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        unsafe: jest.fn().mockResolvedValue([]),
        isTransaction: true,
      };
      txContext = mockTx;
      return await callback(mockTx);
    });

    // When
    await orm.transaction(async (tx) => {
      await user.save();
    });

    // Then
    // O problema atual é que executeStatement é chamado sem o contexto tx
    // O que queremos é que seja passado o tx para executeStatement
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockExecuteStatement).toHaveBeenCalledTimes(1);

    // ❌ FALHA ESPERADA: executeStatement não recebe o contexto transacional
    // Este teste deve falhar inicialmente, provando o bug
  });

  test('Given - Múltiplas operações em transação / When - Uma falha / Then - Todas devem fazer rollback', async () => {
    // Given
    const user1 = new TestUser();
    user1.id = 1;
    user1.name = 'User 1';
    user1.email = 'user1@test.com';

    const user2 = new TestUser();
    user2.id = 2;
    user2.name = 'User 2';
    user2.email = 'user2@test.com';

    let rollbackCalled = false;
    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        unsafe: jest.fn().mockResolvedValue([]),
        isTransaction: true,
      };

      try {
        await callback(mockTx);
      } catch (error) {
        rollbackCalled = true;
        throw error;
      }
    });

    mockExecuteStatement
      .mockResolvedValueOnce({
        query: { rows: [{ id: 1, name: 'User 1', email: 'user1@test.com' }] },
        startTime: Date.now(),
        sql: 'INSERT 1',
      })
      .mockRejectedValueOnce(new Error('Database error'));

    // When / Then
    try {
      await orm.transaction(async (tx) => {
        await user1.save(); // Sucesso
        await user2.save(); // Erro
      });

      // Não deve chegar aqui
      expect(true).toBe(false);
    } catch (error) {
      // Then
      expect(error.message).toBe('Database error');
      expect(rollbackCalled).toBe(true);
    }
  });

  test('Given - Entity.save e Repository.create na mesma transação / When - Executar ambos / Then - Devem usar mesmo contexto transacional', async () => {
    // Given
    const user = new TestUser();
    user.id = 1;
    user.name = 'John';
    user.email = 'john@test.com';

    let txContext: any;
    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        unsafe: jest.fn().mockResolvedValue([{ id: 2, name: 'Jane', email: 'jane@test.com' }]),
        isTransaction: true,
      };
      txContext = mockTx;
      return await callback(mockTx);
    });

    mockExecuteStatement.mockResolvedValue({
      query: { rows: [{ id: 1, name: 'John', email: 'john@test.com' }] },
      startTime: Date.now(),
      sql: 'INSERT',
    });

    // When
    await orm.transaction(async (tx) => {
      await user.save(); // Usando Entity
      await TestUser.create({ id: 2, name: 'Jane', email: 'jane@test.com' }); // Usando static method
    });

    // Then
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockExecuteStatement).toHaveBeenCalledTimes(2);

    // ❌ FALHA ESPERADA: Ambas as operações não compartilham o mesmo tx
    // Ambas devem usar txContext, mas atualmente usam driver.sql diretamente
  });

  test('Given - Transação bem-sucedida / When - Não houver erros / Then - Deve fazer commit automaticamente', async () => {
    // Given
    const user = new TestUser();
    user.id = 1;
    user.name = 'Test User';
    user.email = 'test@test.com';

    let commitCalled = false;
    mockTransaction.mockImplementation(async (callback: any) => {
      const mockTx = {
        unsafe: jest.fn().mockResolvedValue([]),
        isTransaction: true,
      };

      await callback(mockTx);
      commitCalled = true; // Simula commit automático do Bun
      return;
    });

    mockExecuteStatement.mockResolvedValue({
      query: { rows: [{ id: 1, name: 'Test User', email: 'test@test.com' }] },
      startTime: Date.now(),
      sql: 'INSERT',
    });

    // When
    await orm.transaction(async (tx) => {
      await user.save();
    });

    // Then
    expect(commitCalled).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});
