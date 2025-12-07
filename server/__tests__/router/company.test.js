let getAllCompaniesMock;

describe('router/company - GET /api/companies', () => {
  let app;
  let request;
  let express;
  let router;
  let isAuth = false;

  beforeEach(async () => {
    jest.resetModules();
    getAllCompaniesMock = jest.fn();

    // mock dao module before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      getAllCompanies: getAllCompaniesMock
    }));

    express = (await import('express')).default;
    request = (await import('supertest')).default;

    // import router after mocking
    router = (await import('../../router/company.mjs')).default;

    app = express();
    app.use(express.json());

    // middleware to control authentication per test
    app.use((req, res, next) => {
      req.isAuthenticated = () => isAuth;
      next();
    });

    // mount router under /api like in index.mjs
    app.use('/api', router);
  });

  afterEach(() => {
    isAuth = false;
    jest.clearAllMocks();
  });

  test('unauthenticated -> 401', async () => {
    isAuth = false;
    const res = await request(app).get('/api/companies');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Not authenticated' });
  });

  test('returns companies -> 200', async () => {
    isAuth = true;
    const rows = [{ id: 1, name: 'FixCo', description: 'Repairs' }];
    getAllCompaniesMock.mockResolvedValueOnce(rows);

    const res = await request(app).get('/api/companies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(rows);

    expect(getAllCompaniesMock).toHaveBeenCalled();
  });

  test('DB error -> 503', async () => {
    isAuth = true;
    getAllCompaniesMock.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(app).get('/api/companies');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database error during company retrieval' });
    expect(getAllCompaniesMock).toHaveBeenCalled();
  });
});