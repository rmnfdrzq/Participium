let getAllRolesMock;
let request;
let app;
let router;
let isAuth = false;

describe('router/role - GET /api/roles', () => {
  beforeEach(async () => {
    jest.resetModules();
    getAllRolesMock = jest.fn();

    // mock dao module before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      getAllRoles: getAllRolesMock
    }));

    const express = (await import('express')).default;
    request = (await import('supertest')).default;

    router = (await import('../../router/role.mjs')).default;

    app = express();
    app.use(express.json());

    // auth middleware controllable in tests
    app.use((req, res, next) => {
      req.isAuthenticated = () => isAuth;
      next();
    });

    app.use('/api', router);
  });

  afterEach(() => {
    isAuth = false;
    jest.clearAllMocks();
  });

  test('unauthenticated -> 401', async () => {
    isAuth = false;
    const res = await request(app).get('/api/roles');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Not authenticated' });
    expect(getAllRolesMock).not.toHaveBeenCalled();
  });

  test('returns roles -> 200', async () => {
    isAuth = true;
    const rows = [{ role_id: 1, name: 'municipality_user' }];
    getAllRolesMock.mockResolvedValueOnce(rows);

    const res = await request(app).get('/api/roles');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(rows);

    expect(getAllRolesMock).toHaveBeenCalled();
  });

  test('returns empty array -> 200', async () => {
    isAuth = true;
    getAllRolesMock.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/roles');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(getAllRolesMock).toHaveBeenCalledTimes(1);
  });

  test('DB error -> 503', async () => {
    isAuth = true;
    getAllRolesMock.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(app).get('/api/roles');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database error during role retrieval' });
    expect(getAllRolesMock).toHaveBeenCalled();
  });
});