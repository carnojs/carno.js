import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'
import { app, execute, mockLogger, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Entity, PrimaryKey, Property } from '../../src';

const DLL = `
    CREATE TABLE "user_library"
    (
        "id"          SERIAL PRIMARY KEY,
        "name"        varchar(255) NOT NULL,
        "is_favorite" boolean DEFAULT false
    );
`;

@Entity()
class UserLibrary extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @Property()
    isFavorite: boolean;
}

describe('Entity save() method issue', () => {

    beforeEach(async () => {
        await startDatabase();
        await execute(DLL);
    })

    afterEach(async () => {
        await purgeDatabase();
        await app?.disconnect();
        (mockLogger as jest.Mock).mockClear();
    })

    test('should update entity loaded from database using save() - simulates toggleFavorite scenario', async () => {
        // Given: Create a library that is not favorite
        await UserLibrary.create({
            id: 1,
            name: 'My Library',
            isFavorite: false,
        });

        // When: Load library from database and toggle favorite
        const library = await UserLibrary.findOne({ id: 1 });
        expect(library).toBeInstanceOf(UserLibrary);
        expect(library!.isFavorite).toBe(false);

        library.isFavorite = !library.isFavorite;
        await library!.save();

        // Then: Library should be updated in database
        const updated = await UserLibrary.findOne({ id: 1 });
        expect(updated!.isFavorite).toBe(true);
    });


});
