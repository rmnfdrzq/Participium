let getAllOperatorsMock, getTechnicalOfficersByOfficeMock, getMainteinerByOfficeMock, createMunicipalityUserMock, addOperatorCategoryMock, removeOperatorCategoryMock;
let request, expressApp, router;
let isAuth = false;
let currentUser = null;

describe('router/operator', () => {
  beforeEach(async () => {
    jest.resetModules();

    getAllOperatorsMock = jest.fn();
    getTechnicalOfficersByOfficeMock = jest.fn();
    getMainteinerByOfficeMock = jest.fn();
    createMunicipalityUserMock = jest.fn();
    addOperatorCategoryMock = jest.fn();
    removeOperatorCategoryMock = jest.fn();

    // mock dao before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      getAllOperators: getAllOperatorsMock,
      getTechnicalOfficersByOffice: getTechnicalOfficersByOfficeMock,
      getMainteinerByOffice: getMainteinerByOfficeMock,
      createMunicipalityUser: createMunicipalityUserMock,
      addOperatorCategory: addOperatorCategoryMock,
      removeOperatorCategory: removeOperatorCategoryMock
    }));

    const express = (await import('express')).default;
    request = (await import('supertest')).default;

    router = (await import('../../router/operator.mjs')).default;

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

  describe('GET /api/admin', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).get('/api/admin');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('forbidden when not Admin -> 403', async () => {
      isAuth = true;
      currentUser = { role: 'Operator' };
      const res = await request(expressApp).get('/api/admin');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    test('success -> returns users', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const users = [{ id: 1, username: 'u1' }];
      getAllOperatorsMock.mockResolvedValueOnce(users);

      const res = await request(expressApp).get('/api/admin');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(users);
      expect(getAllOperatorsMock).toHaveBeenCalled();
    });

    test('db error -> 500', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      getAllOperatorsMock.mockRejectedValueOnce(new Error('db'));
      const res = await request(expressApp).get('/api/admin');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch users' });
    });
  });

  describe('GET /api/operators?category_id', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).get('/api/operators?category_id=1');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('validation error -> 400', async () => {
      isAuth = true;
      currentUser = { role: 'Municipal public relations officer' };
      const res = await request(expressApp).get('/api/operators'); // missing category_id
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    test('municipal officer -> returns technical officers', async () => {
      isAuth = true;
      currentUser = { role: 'Municipal public relations officer' };
      const officers = [{ id: 2, username: 'tech' }];
      getTechnicalOfficersByOfficeMock.mockResolvedValueOnce(officers);

      const res = await request(expressApp).get('/api/operators?category_id=5');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(officers);
      expect(getTechnicalOfficersByOfficeMock).toHaveBeenCalledWith('5');
    });

    test('technical staff -> returns maintainers', async () => {
      isAuth = true;
      currentUser = { role: 'Technical office staff member' };
      const maintainers = [{ id: 3, username: 'main' }];
      getMainteinerByOfficeMock.mockResolvedValueOnce(maintainers);

      const res = await request(expressApp).get('/api/operators?category_id=7');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(maintainers);
      expect(getMainteinerByOfficeMock).toHaveBeenCalledWith('7');
    });

    test('forbidden role -> 422', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const res = await request(expressApp).get('/api/operators?category_id=1');
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    test('db error -> 503', async () => {
      isAuth = true;
      currentUser = { role: 'Municipal public relations officer' };
      getTechnicalOfficersByOfficeMock.mockRejectedValueOnce(new Error('DB failure'));
      const res = await request(expressApp).get('/api/operators?category_id=1');
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/admin/createuser', () => {
    const validPayload = { username: 'u', email: 'a@b.com', password: 'secret1', office_id: [1], company: 1, role: 2 };

    test('unauthorized when not Admin -> 401', async () => {
      isAuth = true;
      currentUser = { role: 'Operator' };
      const res = await request(expressApp).post('/api/admin/createuser').send(validPayload);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authorized' });
    });

    test('validation errors -> 422', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const res = await request(expressApp).post('/api/admin/createuser').send({}); // missing fields
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
    });

    test('company/role mismatch -> 400', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      createMunicipalityUserMock.mockResolvedValueOnce({ id: 88, username: 'u' });
      const payload = { ...validPayload, company: 2, role: 2, office_id: [1] };
      const res = await request(expressApp).post('/api/admin/createuser').send(payload);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Needs to be an External maintainer' });
    });

    test('success -> 201', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const payload = { ...validPayload, company: 2, role: 5, office_id: [1] };
      createMunicipalityUserMock.mockResolvedValueOnce({ id: 99, username: 'u' });
      addOperatorCategoryMock.mockResolvedValueOnce();

      const res = await request(expressApp).post('/api/admin/createuser').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 99, username: 'u' });
      expect(createMunicipalityUserMock).toHaveBeenCalled();
    });

    test('duplicate -> 409', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const err = new Error('dup');
      err.code = '23505';
      const payload = { ...validPayload, company: 2, role: 5, office_id: [1] };
      createMunicipalityUserMock.mockRejectedValueOnce(err);

      const res = await request(expressApp).post('/api/admin/createuser').send(payload);
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Username or email already exists' });
    });

    test('db error -> 503', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      createMunicipalityUserMock.mockRejectedValueOnce(new Error('db'));
      const payload = { ...validPayload, company: 2, role: 5, office_id: [1] };
      const res = await request(expressApp).post('/api/admin/createuser').send(payload);
      expect(res.status).toBe(503);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/admin/addcategory', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).post('/api/admin/addcategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authorized' });
    });

    test('not admin -> 401', async () => {
      isAuth = true;
      currentUser = { role: 'Operator' };
      const res = await request(expressApp).post('/api/admin/addcategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authorized' });
    });

    test('validation errors -> 422', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const res = await request(expressApp).post('/api/admin/addcategory').send({ operator_id: 'abc', category_id: 'xyz' });
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
    });

    test('success -> 201', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const result = { operator_id: 1, category_id: 2 };
      addOperatorCategoryMock.mockResolvedValueOnce(result);

      const res = await request(expressApp).post('/api/admin/addcategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(201);
      expect(res.body).toEqual(result);
      expect(addOperatorCategoryMock).toHaveBeenCalledWith(1, 2);
    });

    test('custom error with status -> returns status from error', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const err = new Error('Category already assigned');
      err.status = 409;
      addOperatorCategoryMock.mockRejectedValueOnce(err);

      const res = await request(expressApp).post('/api/admin/addcategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Category already assigned' });
    });

    test('generic error -> 500', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      addOperatorCategoryMock.mockRejectedValueOnce(new Error('Generic error'));

      const res = await request(expressApp).post('/api/admin/addcategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to add operator category' });
    });
  });

  describe('DELETE /api/admin/removecategory', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(expressApp).delete('/api/admin/removecategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authorized' });
    });

    test('not admin -> 401', async () => {
      isAuth = true;
      currentUser = { role: 'Operator' };
      const res = await request(expressApp).delete('/api/admin/removecategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authorized' });
    });

    test('validation errors -> 422', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const res = await request(expressApp).delete('/api/admin/removecategory').send({ operator_id: 'invalid', category_id: 'invalid' });
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
    });

    test('success -> 200', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const result = { success: true, message: 'Category removed' };
      removeOperatorCategoryMock.mockResolvedValueOnce(result);

      const res = await request(expressApp).delete('/api/admin/removecategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(result);
      expect(removeOperatorCategoryMock).toHaveBeenCalledWith(1, 2);
    });

    test('custom error with status -> returns status from error', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      const err = new Error('Category not assigned');
      err.status = 404;
      removeOperatorCategoryMock.mockRejectedValueOnce(err);

      const res = await request(expressApp).delete('/api/admin/removecategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Category not assigned' });
    });

    test('generic error -> 500', async () => {
      isAuth = true;
      currentUser = { role: 'Admin' };
      removeOperatorCategoryMock.mockRejectedValueOnce(new Error('Generic error'));

      const res = await request(expressApp).delete('/api/admin/removecategory').send({ operator_id: 1, category_id: 2 });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to remove operator category' });
    });
  });
});