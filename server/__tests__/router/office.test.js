let getAllOfficesMock;

describe('router/office - GET /api/offices', () => {
  let app;
  let request;
  let express;
  let router;
  let isAuth = false;

  beforeEach(async () => {
    jest.resetModules();
    getAllOfficesMock = jest.fn();

    // mock dao module before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      getAllOffices: getAllOfficesMock
    }));

    express = (await import('express')).default;
    request = (await import('supertest')).default;

    // import router after mocking
    router = (await import('../../router/office.mjs')).default;

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
    const res = await request(app).get('/api/offices');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Not authenticated' });
  });

  test('returns offices -> 200', async () => {
    isAuth = true;
    const rows = [{ id: 1, name: 'Office A' }];
    getAllOfficesMock.mockResolvedValueOnce(rows);

    const res = await request(app).get('/api/offices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(rows);

    expect(getAllOfficesMock).toHaveBeenCalled();
  });

  test('DB error -> 503', async () => {
    isAuth = true;
    getAllOfficesMock.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(app).get('/api/offices');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database error during office retrieval' });
    expect(getAllOfficesMock).toHaveBeenCalled();
  });
});