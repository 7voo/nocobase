/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { createMockServer, MockServer } from '@nocobase/test';

describe('WeCom Users Collection Extension', () => {
  let app: MockServer;

  beforeAll(async () => {
    app = await createMockServer({
      plugins: ['field-sort', 'users', 'auth', 'wecom'],
    });
  });

  afterAll(async () => {
    await app.destroy();
  });

  it('should extend users collection with WeCom fields', async () => {
    const usersCollection = app.db.getCollection('users');
    expect(usersCollection).toBeDefined();

    // Check that wecomUserId field exists
    const wecomUserIdField = usersCollection.getField('wecomUserId');
    expect(wecomUserIdField).toBeDefined();
    expect(wecomUserIdField.type).toBe('string');
    expect(wecomUserIdField.options.unique).toBe(true);
    expect(wecomUserIdField.options.index).toBe(true);

    // Check that wecomOpenId field exists
    const wecomOpenIdField = usersCollection.getField('wecomOpenId');
    expect(wecomOpenIdField).toBeDefined();
    expect(wecomOpenIdField.type).toBe('string');

    // Check that wecomUnionId field exists
    const wecomUnionIdField = usersCollection.getField('wecomUnionId');
    expect(wecomUnionIdField).toBeDefined();
    expect(wecomUnionIdField.type).toBe('string');
  });

  it('should enforce uniqueness constraint on wecomUserId', async () => {
    const usersRepo = app.db.getRepository('users');

    // Create first user with wecomUserId
    const user1 = await usersRepo.create({
      values: {
        nickname: 'Test User 1',
        wecomUserId: 'wecom123',
      },
    });
    expect(user1).toBeDefined();
    expect(user1.wecomUserId).toBe('wecom123');

    // Attempt to create second user with same wecomUserId should fail
    await expect(
      usersRepo.create({
        values: {
          nickname: 'Test User 2',
          wecomUserId: 'wecom123',
        },
      }),
    ).rejects.toThrow();
  });

  it('should allow null values for WeCom fields', async () => {
    const usersRepo = app.db.getRepository('users');

    // Create user without WeCom fields
    const user = await usersRepo.create({
      values: {
        nickname: 'Test User Without WeCom',
      },
    });
    expect(user).toBeDefined();
    expect(user.wecomUserId).toBeUndefined();
    expect(user.wecomOpenId).toBeUndefined();
    expect(user.wecomUnionId).toBeUndefined();
  });

  it('should allow multiple users with null wecomUserId', async () => {
    const usersRepo = app.db.getRepository('users');

    // Create first user without wecomUserId
    const user1 = await usersRepo.create({
      values: {
        nickname: 'User 1',
        wecomUserId: null,
      },
    });
    expect(user1).toBeDefined();

    // Create second user without wecomUserId should succeed
    const user2 = await usersRepo.create({
      values: {
        nickname: 'User 2',
        wecomUserId: null,
      },
    });
    expect(user2).toBeDefined();
  });
});
