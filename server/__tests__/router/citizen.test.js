let createUserMock, getUserInfoByIdMock, updateUserByIdMock, generateEmailVerificationCodeMock, verifyEmailCodeMock, getActiveVerificationTokenMock;
let request, expressApp, router;
let isAuth = false;
let currentUser = null;

describe('router/citizen', () => {
  beforeEach(async () => {
    jest.resetModules();

    createUserMock = jest.fn();
    getUserInfoByIdMock = jest.fn();
    updateUserByIdMock = jest.fn();
    generateEmailVerificationCodeMock = jest.fn();
    verifyEmailCodeMock = jest.fn();
    getActiveVerificationTokenMock = jest.fn();

    // mock dao before importing router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      createUser: createUserMock,
      getUserInfoById: getUserInfoByIdMock,
      updateUserById: updateUserByIdMock,
      generateEmailVerificationCode: generateEmailVerificationCodeMock,
      verifyEmailCode: verifyEmailCodeMock,
      getActiveVerificationToken: getActiveVerificationTokenMock
    }));

    const express = (await import('express')).default;
    request = (await import('supertest')).default;

    router = (await import('../../router/citizen.mjs')).default;

    expressApp = express();
    expressApp.use(express.json());

    // auth middleware controllable in tests
    expressApp.use((req, res, next) => {
      req.isAuthenticated = () => isAuth;
      req.user = currentUser;
      next();
    });

    expressApp.use('/api', router);
  });

  afterEach(() => {
    isAuth = false;
    currentUser = null;
    jest.clearAllMocks();
  });

  describe('POST /api/registration', () => {
    test('validation errors -> 422', async () => {
      const res = await request(expressApp).post('/api/registration').send({
        username: '', email: 'bad', first_name: '', last_name: '', email_notifications: 'x', password: '123'
      });
      expect(res.status).toBe(422);
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    test('successful registration -> 201', async () => {
      const created = { id: 10, username: 'u' };
      createUserMock.mockResolvedValueOnce(created);

      const payload = { username: 'u', first_name: 'F', last_name: 'L', email_notifications: true, email: 'a@b.com', password: 'secret' };
      const res = await request(expressApp).post('/api/registration').send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
      expect(createUserMock).toHaveBeenCalledWith('u', 'a@b.com', 'F', 'L', true, 'secret');
    });

    test('duplicate -> 409', async () => {
      const err = new Error('dup');
      err.code = '23505';
      createUserMock.mockRejectedValueOnce(err);

      const payload = { username: 'u', first_name: 'F', last_name: 'L', email_notifications: true, email: 'a@b.com', password: 'secret' };
      const res = await request(expressApp).post('/api/registration').send(payload);

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Email or username already exists' });
    });

    test('other DB error -> 503', async () => {
      const err = new Error('db');
      createUserMock.mockRejectedValueOnce(err);

      const payload = { username: 'u', first_name: 'F', last_name: 'L', email_notifications: true, email: 'a@b.com', password: 'secret' };
      const res = await request(expressApp).post('/api/registration').send(payload);

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during user creation' });
    });
  });

  describe('GET /api/citizens', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).get('/api/citizens');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('invalid user id -> 423', async () => {
      isAuth = true;
      currentUser = { id: 'not-a-number' };
      const res = await request(expressApp).get('/api/citizens');
      expect(res.status).toBe(423);
      expect(res.body).toEqual({ error: 'Invalid user id' });
    });

    test('user not found -> 404', async () => {
      isAuth = true;
      currentUser = { id: 5 };
      getUserInfoByIdMock.mockResolvedValueOnce(null);

      const res = await request(expressApp).get('/api/citizens');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found' });
      expect(getUserInfoByIdMock).toHaveBeenCalledWith(5);
    });

    test('success -> 200', async () => {
      isAuth = true;
      currentUser = { id: 7 };
      const user = { id: 7, username: 'u' };
      getUserInfoByIdMock.mockResolvedValueOnce(user);

      const res = await request(expressApp).get('/api/citizens');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(user);
    });

    test('DB error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 9 };
      getUserInfoByIdMock.mockRejectedValueOnce(new Error('db fail'));

      const res = await request(expressApp).get('/api/citizens');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during user retrieval' });
    });
  });

  describe('PUT /api/citizens', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).put('/api/citizens').send({ first_name: 'X' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('no updates -> 400', async () => {
      isAuth = true;
      currentUser = { id: 1 };
      const res = await request(expressApp).put('/api/citizens').send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'No update fields provided' });
    });

    test('not found -> 404', async () => {
      isAuth = true;
      currentUser = { id: 2 };
      updateUserByIdMock.mockResolvedValueOnce(null);

      const res = await request(expressApp).put('/api/citizens').send({ first_name: 'New' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found or no changes applied' });
      expect(updateUserByIdMock).toHaveBeenCalledWith(2, { first_name: 'New' });
    });

    test('success -> returns updated user', async () => {
      isAuth = true;
      currentUser = { id: 3 };
      const updated = { citizen_id: 3, first_name: 'Updated' };
      updateUserByIdMock.mockResolvedValueOnce(updated);

      const res = await request(expressApp).put('/api/citizens').send({ first_name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);
    });

    test('internal error -> 500', async () => {
      isAuth = true;
      currentUser = { id: 4 };
      updateUserByIdMock.mockRejectedValueOnce(new Error('boom'));

      const res = await request(expressApp).put('/api/citizens').send({ first_name: 'X' });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /api/citizens/verification-code and /verify-email', () => {
    test('generate code unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).post('/api/citizens/verification-code');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('generate code invalid id -> 423', async () => {
      isAuth = true;
      currentUser = { id: 'x' };
      const res = await request(expressApp).post('/api/citizens/verification-code');
      expect(res.status).toBe(423);
      expect(res.body).toEqual({ error: 'Invalid user id' });
    });

    test('generate code success -> 200 with expires_at', async () => {
      isAuth = true;
      currentUser = { id: 20 };
      const expires = new Date();
      generateEmailVerificationCodeMock.mockResolvedValueOnce(expires);

      const res = await request(expressApp).post('/api/citizens/verification-code');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ expires_at: expires.toISOString() });
    });

    test('generate code DB error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 21 };
      generateEmailVerificationCodeMock.mockRejectedValueOnce(new Error('db'));

      const res = await request(expressApp).post('/api/citizens/verification-code');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during verification code generation' });
    });

    test('verify-email: unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).post('/api/citizens/verify-email').send({ code: '123' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('verify-email: invalid id -> 423', async () => {
      isAuth = true;
      currentUser = { id: 'x' };
      const res = await request(expressApp).post('/api/citizens/verify-email').send({ code: '123' });
      expect(res.status).toBe(423);
      expect(res.body).toEqual({ error: 'Invalid user id' });
    });

    test('verify-email: invalid code type -> 422', async () => {
      isAuth = true;
      currentUser = { id: 30 };
      const res = await request(expressApp).post('/api/citizens/verify-email').send({ code: 123 });
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: 'Code must be a string' });
    });

    test('verify-email: invalid or expired -> 400', async () => {
      isAuth = true;
      currentUser = { id: 31 };
      verifyEmailCodeMock.mockResolvedValueOnce(false);

      const res = await request(expressApp).post('/api/citizens/verify-email').send({ code: '000000' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid or expired code' });
    });

    test('verify-email: success -> 200', async () => {
      isAuth = true;
      currentUser = { id: 32 };
      verifyEmailCodeMock.mockResolvedValueOnce(true);

      const res = await request(expressApp).post('/api/citizens/verify-email').send({ code: '123456' });
      expect(res.status).toBe(200);
    });

    test('verify-email: DB error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 33 };
      verifyEmailCodeMock.mockRejectedValueOnce(new Error('db'));

      const res = await request(expressApp).post('/api/citizens/verify-email').send({ code: '123456' });
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during email verification' });
    });
  });

  describe('GET /api/citizens/verification-token', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).get('/api/citizens/verification-token');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('invalid user id -> 423', async () => {
      isAuth = true;
      currentUser = { id: 'invalid' };
      const res = await request(expressApp).get('/api/citizens/verification-token');
      expect(res.status).toBe(423);
      expect(res.body).toEqual({ error: 'Invalid user id' });
    });

    test('no active token -> 404', async () => {
      isAuth = true;
      currentUser = { id: 40 };
      getActiveVerificationTokenMock.mockResolvedValueOnce(null);

      const res = await request(expressApp).get('/api/citizens/verification-token');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'No active verification token found' });
      expect(getActiveVerificationTokenMock).toHaveBeenCalledWith(40);
    });

    test('returns token -> 200', async () => {
      isAuth = true;
      currentUser = { id: 41 };
      const token = { token_id: 'abc123', expires_at: '2025-12-31' };
      getActiveVerificationTokenMock.mockResolvedValueOnce(token);

      const res = await request(expressApp).get('/api/citizens/verification-token');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(token);
      expect(getActiveVerificationTokenMock).toHaveBeenCalledWith(41);
    });

    test('DB error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 42 };
      getActiveVerificationTokenMock.mockRejectedValueOnce(new Error('db'));

      const res = await request(expressApp).get('/api/citizens/verification-token');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during verification token retrieval' });
    });
  });
});