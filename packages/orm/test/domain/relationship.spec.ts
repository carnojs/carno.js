import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { BaseEntity, Entity, ManyToOne, OneToMany, PrimaryKey, Property, EntityStorage } from '../../src';
import { app, execute, mockLogger, purgeDatabase, startDatabase } from '../node-database';
import { Metadata } from '@carno.js/core';
import { PROPERTIES_METADATA, PROPERTIES_RELATIONS } from '../../src/constants';

describe('Relationship entities', () => {

    const DDL_COURSE = `
        CREATE TABLE "course" (
            "id" SERIAL PRIMARY KEY,
            "name" varchar(255) NOT NULL
        );
    `;

    const DDL_LESSON = `
        CREATE TABLE "lesson" (
            "id" SERIAL PRIMARY KEY,
            "title" varchar(255) NOT NULL,
            "course_id" integer REFERENCES "course" ("id")
        );
    `;

    const DDL_ENROLLMENT = `
        CREATE TABLE "enrollment" (
            "id" SERIAL PRIMARY KEY,
            "user_id" integer REFERENCES "user" ("id"),
            "course_id" integer REFERENCES "course" ("id"),
            "added_at" timestamp NOT NULL DEFAULT NOW()
        );
    `;

    beforeEach(async () => {
        await startDatabase();
        await execute(DLL);
        await execute(DDL_ADDRESS);
        await execute(DDL_STREET);
        await execute(DDL_COURSE);
        await execute(DDL_LESSON);
        await execute(DDL_ENROLLMENT);
    })

    afterEach(async () => {
        await purgeDatabase();
        await app?.disconnect();
        (mockLogger as jest.Mock).mockClear();
    })

    const DLL = `
        CREATE TABLE "user"
        (
            "id"    SERIAL PRIMARY KEY,
            "email" varchar(255) NOT NULL
        );
    `;

    const DDL_ADDRESS = `
        CREATE TABLE "address"
        (
            "id"      SERIAL PRIMARY KEY,
            "address" varchar(255) NOT NULL,
            "user_id" integer REFERENCES "user" ("id")
        );
    `;

    const DDL_STREET = `
        CREATE TABLE "street"
        (
            "id"         SERIAL PRIMARY KEY,
            "street"     varchar(255) NOT NULL,
            "address_id" integer REFERENCES "address" ("id")
        );
    `;

    @Entity()
    class User extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        email: string;

        @OneToMany(() => Address, (address) => address.user)
        addresses: Address[];
    }

    @Entity()
    class Address extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        address: string;

        @ManyToOne(() => User)
        user: User;
    }

    @Entity()
    class Street extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        street: string;

        @ManyToOne(() => Address)
        address: Address;
    }

    @Entity()
    class Course extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;

        @OneToMany(() => Lesson, (lesson) => lesson.course)
        lessons: Lesson[];
    }

    @Entity()
    class Lesson extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        title: string;

        @ManyToOne(() => Course)
        course: Course;
    }

    @Entity()
    class Enrollment extends BaseEntity {
        @PrimaryKey()
        id: number;

        @ManyToOne(() => User)
        user: User;

        @ManyToOne(() => Course)
        course: Course;

        @Property()
        addedAt: Date;
    }

    it('should create a new user with address', async () => {
        (mockLogger as jest.Mock).mockClear();
        Entity()(User)
        Entity()(Address)
        Entity()(Street)

        const user = new User();
        user.email = 'test@test.com';
        user.id = 1;
        await user.save();

        const address = await Address.create({
            id: 1,
            address: 'test address',
            user,
        })
        const street = await Street.create({
            id: 1,
            street: 'test street',
            address,
        })

        const find = await Street.find({
            address: {
                user: {
                    id: 1,
                }
            }
        });

        const findWithLoadSelect = await Street.find({
            address: {
                user: {
                    id: 1,
                }
            }
        }, {
            loadStrategy: 'select'
        });

        expect(find).toHaveLength(1);
        expect(find[0].id).toBe(1);
        expect(find[0].street).toBe('test street');
        expect(find[0].address).toBeInstanceOf(Address);
        expect(find[0].address.user).toBeInstanceOf(User);
        expect(find[0].address.user.email).toBe('test@test.com');
        expect(findWithLoadSelect).toHaveLength(1);
        expect(findWithLoadSelect[0].id).toBe(1);
        expect(findWithLoadSelect[0].street).toBe('test street');
        expect(findWithLoadSelect[0].address).toBeInstanceOf(Address);
        expect(findWithLoadSelect[0].address.user).toBeInstanceOf(User);
        expect(findWithLoadSelect[0].address.user.email).toBe('test@test.com');
        expect(mockLogger).toHaveBeenCalledTimes(7)
        expect((mockLogger as jest.Mock).mock.calls[3][0]).toStartWith("SQL: SELECT s1.\"id\" as \"s1_id\", s1.\"street\" as \"s1_street\", s1.\"address_id\" as \"s1_address_id\", u1.\"id\" as \"u1_id\", u1.\"email\" as \"u1_email\", a1.\"id\" as \"a1_id\", a1.\"address\" as \"a1_address\", a1.\"user_id\" as \"a1_user_id\" FROM \"public\".\"street\" s1 LEFT JOIN public.address a1 ON s1.\"address_id\" = a1.\"id\" LEFT JOIN public.user u1 ON a1.\"user_id\" = u1.\"id\" WHERE (((u1.id = 1)))");
    });

    it('should load relationship', async () => {

        Entity()(User)
        Entity()(Address)
        Entity()(Street)

        const user = new User();
        user.email = 'test@test.com';
        user.id = 1;
        await user.save();

        const address = await Address.create({
            id: 1,
            address: 'test address',
            user,
        })
        await Street.create({
            id: 1,
            street: 'test street',
            address,
        })

        const find = await Street.findOneOrFail({}, {
            load: ['address', 'address.user'],
        });
        const find2 = await Street.findOneOrFail({}, {
            load: ['address', 'address.user'],
            loadStrategy: 'select',
        });

        expect(find).toBeInstanceOf(Street);
        expect(find.id).toBe(find2.id);
        expect(find.street).toBe(find2.street);
        expect(find.address.id).toBe(find2.address.id);
        expect(find.address.user.id).toBe(find2.address.user.id);
    });

    it('should snapshot many-to-one foreign key as uuid', async () => {

        @Entity()
        class SnapshotCourse extends BaseEntity {
            @PrimaryKey({dbType: 'uuid'})
            id: string;
        }

        @Entity()
        class SnapshotLesson extends BaseEntity {
            @PrimaryKey()
            id: number;

            @ManyToOne(() => SnapshotCourse)
            course: SnapshotCourse;
        }

        const previousStorage = EntityStorage.getInstance();
        const storage = new EntityStorage();

        try {
            // Given
            const courseProperties = Metadata.get(PROPERTIES_METADATA, SnapshotCourse) || {};
            const courseRelations = Metadata.get(PROPERTIES_RELATIONS, SnapshotCourse) || [];
            storage.add({target: SnapshotCourse, options: {}}, courseProperties, courseRelations, []);

            const lessonProperties = Metadata.get(PROPERTIES_METADATA, SnapshotLesson) || {};
            const lessonRelations = Metadata.get(PROPERTIES_RELATIONS, SnapshotLesson) || [];
            storage.add({target: SnapshotLesson, options: {}}, lessonProperties, lessonRelations, []);

            // When
            const options = storage.get(SnapshotLesson);
            const snapshot = await storage.snapshot(options!);

            // Then
            const column = snapshot.columns.find((item) => item.name === 'course_id');
            expect(column?.type).toBe('uuid');
            expect(column?.foreignKeys?.[0].referencedColumnName).toBe('id');
        } finally {
            EntityStorage['instance'] = previousStorage || storage;
        }
    });

    it('should return many-to-one relationship fields after insert', async () => {
        Entity()(User)
        Entity()(Address)

        // Given: Create a user first
        const user = new User();
        user.email = 'test@test.com';
        user.id = 1;
        await user.save();

        // When: Create an address with a many-to-one relationship to user
        const address = await Address.create({
            id: 1,
            address: 'test address',
            user,
        });

        // Then: The returned entity should have the relationship field populated
        expect(address).toBeInstanceOf(Address);
        expect(address.id).toBe(1);
        expect(address.address).toBe('test address');
        expect(address.user).toBe(user.id); // The FK value should be returned
    });

    it('should return FK fields when selecting without load', async () => {
        Entity()(User)
        Entity()(Address)
        Entity()(Street)

        // Given: Create entities with relationships
        const user = new User();
        user.email = 'test@test.com';
        user.id = 1;
        await user.save();

        const address = await Address.create({
            id: 1,
            address: 'test address',
            user,
        });

        await Street.create({
            id: 1,
            street: 'test street',
            address,
        });

        // When: Select without load (should return FK values, not populated entities)
        const street = await Street.findOneOrFail({id: 1});

        // Then: FK field should be present with the ID value
        expect(street).toBeInstanceOf(Street);
        expect(street.id).toBe(1);
        expect(street.street).toBe('test street');
        expect(street.address).toBe(address.id); // Should be the FK value, not the entity
    });

    it('should populate relationship entities when using load', async () => {
        Entity()(User)
        Entity()(Address)
        Entity()(Street)

        // Given: Create entities with relationships
        const user = new User();
        user.email = 'test@test.com';
        user.id = 1;
        await user.save();

        const address = await Address.create({
            id: 1,
            address: 'test address',
            user,
        });

        await Street.create({
            id: 1,
            street: 'test street',
            address,
        });

        // When: Select with load (should populate the relationship entities)
        const street = await Street.findOneOrFail({id: 1}, {load: ['address', 'address.user']});

        // Then: Relationship should be populated with full entities
        expect(street).toBeInstanceOf(Street);
        expect(street.id).toBe(1);
        expect(street.street).toBe('test street');
        expect(street.address).toBeInstanceOf(Address); // Should be the full entity
        expect(street.address.id).toBe(1);
        expect(street.address.address).toBe('test address');
        expect(street.address.user).toBeInstanceOf(User); // Should be the full entity
        expect(street.address.user.id).toBe(1);
        expect(street.address.user.email).toBe('test@test.com');
    });

    it('should return unique entities when finding with one-to-many joined relationships', async () => {
        Entity()(User)
        Entity()(Address)

        // Given: Create a user with multiple addresses
        const user = new User();
        user.email = 'user@test.com';
        user.id = 1;
        await user.save();

        await Address.create({
            id: 1,
            address: 'Address 1',
            user,
        });

        await Address.create({
            id: 2,
            address: 'Address 2',
            user,
        });

        await Address.create({
            id: 3,
            address: 'Address 3',
            user,
        });

        // When: Find users with addresses using joined strategy (default)
        const users = await User.find({}, {load: ['addresses']});

        // Then: Should return exactly 1 user (not duplicated), with all 3 addresses
        expect(users).toHaveLength(1);
        expect(users[0]).toBeInstanceOf(User);
        expect(users[0].id).toBe(1);
        expect(users[0].email).toBe('user@test.com');
        expect(users[0].addresses).toBeInstanceOf(Array);
        expect(users[0].addresses).toHaveLength(3);
        expect(users[0].addresses[0]).toBeInstanceOf(Address);
        expect(users[0].addresses[1]).toBeInstanceOf(Address);
        expect(users[0].addresses[2]).toBeInstanceOf(Address);

        // Verify all addresses are present
        const addressIds = users[0].addresses.map((a: Address) => a.id).sort();
        expect(addressIds).toEqual([1, 2, 3]);

        const users2 = await User.findOne({}, {load: ['addresses']});
        expect(users2).toBeInstanceOf(User);
        expect(users2.id).toBe(1);
        expect(users2.email).toBe('user@test.com');
        expect(users2.addresses).toBeInstanceOf(Array);
        expect(users2.addresses).toHaveLength(3);
        expect(users2.addresses[1]).toBeInstanceOf(Address);
        expect(users2.addresses[1]).toBeInstanceOf(Address);
        expect(users2.addresses[2]).toBeInstanceOf(Address);
    });

    it('should return unique entities when finding with nested one-to-many joined relationships', async () => {
        Entity()(User);
        Entity()(Course);
        Entity()(Lesson);
        Entity()(Enrollment);

        // Given: Create user, course with lessons, and enrollment
        const user = new User();
        user.email = 'student@test.com';
        user.id = 1;
        await user.save();

        const course = await Course.create({
            id: 1,
            name: 'TypeScript Course',
        });

        await Lesson.create({
            id: 1,
            title: 'Lesson 1: Introduction',
            course,
        });

        await Lesson.create({
            id: 2,
            title: 'Lesson 2: Basics',
            course,
        });

        await Lesson.create({
            id: 3,
            title: 'Lesson 3: Advanced',
            course,
        });

        await Enrollment.create({
            id: 1,
            user,
            course,
            addedAt: new Date(),
        });

        // When: Find enrollments with nested joins (course.lessons)
        const enrollments = await Enrollment.find(
            {user: {id: 1}},
            {load: ['course', 'course.lessons'], orderBy: {addedAt: 'DESC'}}
        );

        // Then: Should return exactly 1 enrollment (not duplicated by lessons)
        expect(enrollments).toHaveLength(1);
        expect(enrollments[0]).toBeInstanceOf(Enrollment);
        expect(enrollments[0].id).toBe(1);
        expect(enrollments[0].course).toBeInstanceOf(Course);
        expect(enrollments[0].course.id).toBe(1);
        expect(enrollments[0].course.name).toBe('TypeScript Course');
        expect(enrollments[0].course.lessons).toBeInstanceOf(Array);
        expect(enrollments[0].course.lessons).toHaveLength(3);

        // Verify all lessons are present
        const lessonIds = enrollments[0].course.lessons.map((l: Lesson) => l.id).sort();
        expect(lessonIds).toEqual([1, 2, 3]);
    });
});
