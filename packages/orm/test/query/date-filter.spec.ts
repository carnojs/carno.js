import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'
import { app, execute, mockLogger, purgeDatabase, startDatabase } from '../node-database'
import { BaseEntity, Entity, PrimaryKey, Property } from '../../src'

@Entity({ tableName: 'flashcard' })
class Flashcard extends BaseEntity {
  @PrimaryKey()
  id: number

  @Property({ columnName: 'is_active' })
  isActive: boolean

  @Property({ columnName: 'next_review_at' })
  nextReviewAt: Date

  @Property()
  priority: number
}

describe('Date comparison filters', () => {
  const DDL = `
    CREATE TABLE "flashcard" (
      "id" SERIAL PRIMARY KEY,
      "is_active" BOOLEAN NOT NULL,
      "next_review_at" TIMESTAMPTZ,
      "priority" INTEGER NOT NULL
    );
  `

  beforeEach(async () => {
    await startDatabase()
    await execute(DDL)
    ;(mockLogger as jest.Mock).mockClear()
  })

  afterEach(async () => {
    await purgeDatabase()
    await app?.disconnect()
    ;(mockLogger as jest.Mock).mockClear()
  })

  test('Given active flashcards When filtering by lte date Then it returns the expected rows', async () => {
    const referenceDate = new Date('2025-11-02T22:37:00.040Z')

    await Flashcard.create({
      id: 1,
      isActive: true,
      nextReviewAt: new Date('2025-11-02T21:37:00.040Z'),
      priority: 10
    })

    await Flashcard.create({
      id: 2,
      isActive: true,
      nextReviewAt: new Date('2025-11-02T23:37:00.040Z'),
      priority: 5
    });
    (mockLogger as jest.Mock).mockClear()
    const result = await Flashcard.find({
      isActive: true,
      nextReviewAt: { $lte: referenceDate }
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(mockLogger).toHaveBeenCalled()
    const logged = (mockLogger as jest.Mock).mock.calls[0][0]
    if (app?.driverInstance?.dbType === 'mysql') {
      expect(logged).toContain("<= '2025-11-02 22:37:00'")
    } else {
      expect(logged).toContain("<= '2025-11-02T22:37:00.040Z'")
    }
  })

  test('Given flashcards with nullable review date When filtering by null Then it returns only null rows', async () => {
    await Flashcard.create({
      id: 3,
      isActive: true,
      nextReviewAt: null,
      priority: 1
    })

    await Flashcard.create({
      id: 4,
      isActive: true,
      nextReviewAt: new Date('2025-11-03T00:00:00.000Z'),
      priority: 1
    })

    const insertWithNull = (mockLogger as jest.Mock).mock.calls.find(([message]) => String(message).includes('INSERT') && String(message).includes('NULL'))?.[0]
    expect(insertWithNull).toContain('VALUES')
    expect(insertWithNull).toContain('NULL')

    ;(mockLogger as jest.Mock).mockClear()

    const result = await Flashcard.find({
      isActive: true,
      nextReviewAt: null
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
    const whereNull = (mockLogger as jest.Mock).mock.calls[0][0]
    expect(whereNull).toContain('IS NULL')
  })
})
