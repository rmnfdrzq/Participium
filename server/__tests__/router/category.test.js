let getAllCategoriesMock, getCompanyCategoriesMock, getCategoriesByOperatorMock;
let currentUser = null;

describe('router/category', () => {
  let app;
  let request;
  let express;
  let router;
  let isAuth = false;

  beforeEach(async () => {
    jest.resetModules();
    getAllCategoriesMock = jest.fn();
    getCompanyCategoriesMock = jest.fn();
    getCategoriesByOperatorMock = jest.fn();

    // mock dao module before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      getAllCategories: getAllCategoriesMock,
      getCompanyCategories: getCompanyCategoriesMock,
      getCategoriesByOperator: getCategoriesByOperatorMock
    }));

    express = (await import('express')).default;
    request = (await import('supertest')).default;

    // import router after mocking
    router = (await import('../../router/category.mjs')).default;

    app = express();
    app.use(express.json());

    // middleware to control authentication per test
    app.use((req, res, next) => {
      req.isAuthenticated = () => isAuth;
      req.user = currentUser;
      next();
    });

    // mount router under /api like in index.mjs
    app.use('/api', router);
  });

  afterEach(() => {
    isAuth = false;
    currentUser = null;
    jest.clearAllMocks();
  });

  describe('GET /api/categories', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('returns categories -> 200', async () => {
      isAuth = true;
      const rows = [{ category_id: 1, name: 'Noise' }];
      getAllCategoriesMock.mockResolvedValueOnce(rows);

      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual(rows);

      expect(getAllCategoriesMock).toHaveBeenCalled();
    });

    test('DB error -> 503', async () => {
      isAuth = true;
      getAllCategoriesMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during category retrieval' });
      expect(getAllCategoriesMock).toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/companies/:companyId/categories', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/admin/companies/1/categories');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authorized' });
    });

    test('authenticated but not admin -> 401', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'Citizen' };
      const res = await request(app).get('/api/admin/companies/1/categories');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authorized' });
    });

    test('admin returns company categories -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'Admin' };
      const categories = [{ category_id: 1, name: 'Noise' }, { category_id: 2, name: 'Pollution' }];
      getCompanyCategoriesMock.mockResolvedValueOnce(categories);

      const res = await request(app).get('/api/admin/companies/5/categories');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(categories);
      expect(getCompanyCategoriesMock).toHaveBeenCalledWith('5');
    });

    test('DB error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'Admin' };
      getCompanyCategoriesMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/admin/companies/5/categories');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error' });
      expect(getCompanyCategoriesMock).toHaveBeenCalledWith('5');
    });
  });

  describe('GET /api/operators/my-categories', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/operators/my-categories');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('authenticated operator returns categories -> 200', async () => {
      isAuth = true;
      currentUser = { id: 42 };
      const categories = [{ category_id: 1, name: 'Noise' }];
      getCategoriesByOperatorMock.mockResolvedValueOnce(categories);

      const res = await request(app).get('/api/operators/my-categories');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ categories });
      expect(getCategoriesByOperatorMock).toHaveBeenCalledWith(42);
    });

    test('DB error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 42 };
      getCategoriesByOperatorMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/operators/my-categories');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during category fetch' });
      expect(getCategoriesByOperatorMock).toHaveBeenCalledWith(42);
    });
  });
});