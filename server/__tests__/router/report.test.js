let insertReportMock,
  getAllReportsMock,
  updateReportStatusMock,
  setOperatorByReportMock,
  setMainteinerByReportMock,
  getAllApprovedReportsMock,
  getReportsAssignedMock,
  addInternalCommentMock,
  getInternalCommentsMock,
  addMessageMock,
  getMessagesMock,
  autoAssignTechnicalOfficerMock,
  autoAssignMaintainerMock;

let requestLib, makeApp, router;
let isAuth = false;
let currentUser = null;

describe('router/report', () => {
  beforeEach(async () => {
    jest.resetModules();

    insertReportMock = jest.fn();
    getAllReportsMock = jest.fn();
    updateReportStatusMock = jest.fn();
    setOperatorByReportMock = jest.fn();
    setMainteinerByReportMock = jest.fn();
    getAllApprovedReportsMock = jest.fn();
    getReportsAssignedMock = jest.fn();
    addInternalCommentMock = jest.fn();
    getInternalCommentsMock = jest.fn();
    addMessageMock = jest.fn();
    getMessagesMock = jest.fn();
    autoAssignTechnicalOfficerMock = jest.fn();
    autoAssignMaintainerMock = jest.fn();

    // mock dao before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      insertReport: insertReportMock,
      getAllReports: getAllReportsMock,
      updateReportStatus: updateReportStatusMock,
      setOperatorByReport: setOperatorByReportMock,
      setMainteinerByReport: setMainteinerByReportMock,
      getAllApprovedReports: getAllApprovedReportsMock,
      getReportsAssigned: getReportsAssignedMock,
      addInternalComment: addInternalCommentMock,
      getInternalComments: getInternalCommentsMock,
      addMessage: addMessageMock,
      getMessages: getMessagesMock,
      autoAssignTechnicalOfficer: autoAssignTechnicalOfficerMock,
      autoAssignMaintainer: autoAssignMaintainerMock,
      createNotification: jest.fn(),
      addSystemMessage: jest.fn(),
      getReportParticipants: jest.fn(),
    }));

    const supertest = await import('supertest');
    requestLib = supertest.default || supertest;

    const express = await import('express');
    const expressDefault = express.default || express;

    const importedRouter = await import('../../router/report.mjs');
    router = importedRouter.default;

    makeApp = () => {
      const app = expressDefault();
      app.use(expressDefault.json());
      app.use((req, _res, next) => {
        req.isAuthenticated = () => isAuth;
        req.user = currentUser;
        next();
      });
      app.use('/', router);
      return app;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    isAuth = false;
    currentUser = null;
  });

  test('POST /reports -> 401 when not authenticated', async () => {
    isAuth = false;
    currentUser = null;
    const app = makeApp();
    const res = await requestLib(app).post('/reports').send({});
    expect(res.status).toBe(401);
  });

  test('POST /reports -> 201 when authenticated as user and insertReport succeeds', async () => {
    isAuth = true;
    currentUser = { id: 10, role: 'user' };

    const sampleReport = { id: 1, title: 'Pothole', citizen_id: 10 };
    insertReportMock.mockResolvedValue(sampleReport);

    const app = makeApp();
    const body = {
      title: 'Pothole',
      description: 'There is a large pothole on Main St',
      image_urls: ['http://img/1.jpg'],
      latitude: 45.0,
      longitude: 9.0,
      category_id: 2,
      anonymous: false,
    };

    const res = await requestLib(app).post('/reports').send(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(sampleReport);
    expect(insertReportMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Pothole',
      citizen_id: 10,
      description: expect.any(String),
    }));
  });

  test('POST /reports -> 503 on dao error', async () => {
    isAuth = true;
    currentUser = { id: 10, role: 'user' };
    insertReportMock.mockRejectedValue(new Error('db down'));

    const app = makeApp();
    const body = {
      title: 'Xyz',
      description: 'Long description here',
      image_urls: ['u'],
      latitude: 1,
      longitude: 2,
      category_id: 1,
      anonymous: false,
    };

    const res = await requestLib(app).post('/reports').send(body);
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error');
  });

  test('GET /reports -> 200 for Admin and 403 for forbidden role; 503 on dao error', async () => {
    getAllReportsMock.mockResolvedValue([{ id: 1 }]);

    isAuth = true;
    currentUser = { id: 1, role: 'Admin' };
    let app = makeApp();
    let res = await requestLib(app).get('/reports');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1 }]);

    currentUser = { id: 2, role: 'user' };
    app = makeApp();
    res = await requestLib(app).get('/reports');
    expect(res.status).toBe(403);

    // dao error
    getAllReportsMock.mockRejectedValue(new Error('boom'));
    currentUser = { id: 1, role: 'Admin' };
    app = makeApp();
    res = await requestLib(app).get('/reports');
    expect(res.status).toBe(503);
  });

  test('PUT /reports/:id/status -> validation, not found and success', async () => {
    isAuth = true;
    currentUser = { id: 3, role: 'External maintainer' };

    let app = makeApp();
    let res = await requestLib(app).put('/reports/abc/status').send({ status_id: 1 });
    expect(res.status).toBe(423);

    app = makeApp();
    res = await requestLib(app).put('/reports/1/status').send({ status_id: 'bad' });
    expect(res.status).toBe(422);

    updateReportStatusMock.mockResolvedValue(null);
    app = makeApp();
    res = await requestLib(app).put('/reports/1/status').send({ status_id: 2 });
    expect(res.status).toBe(404);

    updateReportStatusMock.mockResolvedValue({ id: 1, status_id: 2 });
    app = makeApp();
    res = await requestLib(app).put('/reports/1/status').send({ status_id: 2 });
    expect(res.status).toBe(200);
    expect(updateReportStatusMock).toHaveBeenCalledWith(1, 2, null);
  });

  test('PUT /reports/:id/operator -> role check, validation and success', async () => {
    isAuth = true;
    currentUser = { id: 4, role: 'user' };

    let app = makeApp();
    let res = await requestLib(app).put('/reports/1/operator').send({ operatorId: 5 });
    expect(res.status).toBe(403);

    currentUser = { id: 5, role: 'Municipal public relations officer' };
    app = makeApp();
    res = await requestLib(app).put('/reports/abc/operator').send({ operatorId: 5 });
    expect(res.status).toBe(423);

    app = makeApp();
    res = await requestLib(app).put('/reports/42/operator').send({ operatorId: 'no' });
    expect(res.status).toBe(422);

    setOperatorByReportMock.mockResolvedValue(null);
    app = makeApp();
    res = await requestLib(app).put('/reports/42/operator').send({ operatorId: 99 });
    expect(res.status).toBe(404);

    setOperatorByReportMock.mockResolvedValue(true);
    app = makeApp();
    res = await requestLib(app).put('/reports/42/operator').send({ operatorId: 99 });
    expect(res.status).toBe(200);
    expect(setOperatorByReportMock).toHaveBeenCalledWith(42, 99);
  });

  test('PUT /reports/:id/mainteiner -> role check, validation and success', async () => {
    isAuth = true;
    currentUser = { id: 7, role: 'Technical office staff member' };

    let app = makeApp();
    let res = await requestLib(app).put('/reports/abc/mainteiner').send({ operatorId: 77 });
    expect(res.status).toBe(423);

    app = makeApp();
    res = await requestLib(app).put('/reports/9/mainteiner').send({ operatorId: 'x' });
    expect(res.status).toBe(422);

    setMainteinerByReportMock.mockResolvedValue(true);
    app = makeApp();
    res = await requestLib(app).put('/reports/9/mainteiner').send({ operatorId: 77 });
    expect(res.status).toBe(200);
    expect(setMainteinerByReportMock).toHaveBeenCalledWith(9, 77);
  });

  test('POST /reports/:id/auto-assign-officer -> role check, validation and success', async () => {
    isAuth = true;
    currentUser = { id: 5, role: 'user' };

    let app = makeApp();
    let res = await requestLib(app).post('/reports/1/auto-assign-officer');
    expect(res.status).toBe(403);

    currentUser = { id: 5, role: 'Municipal public relations officer' };
    app = makeApp();
    res = await requestLib(app).post('/reports/abc/auto-assign-officer');
    expect(res.status).toBe(422);

    const result = {
      assigned_officer: {
        operator_id: 99,
        username: 'john_tech',
        email: 'john@example.com',
      },
    };
    autoAssignTechnicalOfficerMock.mockResolvedValue(result);
    app = makeApp();
    res = await requestLib(app).post('/reports/42/auto-assign-officer');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 99,
      username: 'john_tech',
      email: 'john@example.com',
    });
    expect(autoAssignTechnicalOfficerMock).toHaveBeenCalledWith(42);
  });

  test('POST /reports/:id/auto-assign-officer -> db error -> 503', async () => {
    isAuth = true;
    currentUser = { id: 5, role: 'Admin' };
    autoAssignTechnicalOfficerMock.mockRejectedValue(new Error('db fail'));

    const app = makeApp();
    const res = await requestLib(app).post('/reports/42/auto-assign-officer');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database error during officer assignment' });
  });

  test('POST /reports/:id/auto-assign-maintainer -> role check, validation and success', async () => {
    isAuth = true;
    currentUser = { id: 6, role: 'user' };

    let app = makeApp();
    let res = await requestLib(app).post('/reports/1/auto-assign-maintainer');
    expect(res.status).toBe(403);

    currentUser = { id: 6, role: 'Technical office staff member' };
    app = makeApp();
    res = await requestLib(app).post('/reports/xyz/auto-assign-maintainer');
    expect(res.status).toBe(422);

    const result = {
      assigned_maintainer: {
        operator_id: 88,
        username: 'maint_user',
        company_name: 'MaintCorp',
      },
    };
    autoAssignMaintainerMock.mockResolvedValue(result);
    app = makeApp();
    res = await requestLib(app).post('/reports/50/auto-assign-maintainer');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 88,
      username: 'maint_user',
      company: 'MaintCorp',
    });
    expect(autoAssignMaintainerMock).toHaveBeenCalledWith(50);
  });

  test('POST /reports/:id/auto-assign-maintainer -> db error -> 503', async () => {
    isAuth = true;
    currentUser = { id: 6, role: 'Admin' };
    autoAssignMaintainerMock.mockRejectedValue(new Error('db fail'));

    const app = makeApp();
    const res = await requestLib(app).post('/reports/50/auto-assign-maintainer');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Database error during maintainer assignment' });
  });

  test('GET /reports/approved -> returns results (no auth required)', async () => {
    getAllApprovedReportsMock.mockResolvedValue([{ id: 7 }]);

    const app = makeApp();
    const res = await requestLib(app).get('/reports/approved');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 7 }]);
  });

  test('GET /reports/assigned -> role check and returns assigned reports', async () => {
    isAuth = true;
    getReportsAssignedMock.mockResolvedValue([{ id: 10 }]);

    currentUser = { id: 8, role: 'user' };
    let app = makeApp();
    let res = await requestLib(app).get('/reports/assigned');
    expect(res.status).toBe(403);

    currentUser = { id: 8, role: 'Technical office staff member' };
    app = makeApp();
    res = await requestLib(app).get('/reports/assigned');
    expect(res.status).toBe(200);
    expect(getReportsAssignedMock).toHaveBeenCalledWith(8);

    currentUser = { id: 99, role: 'External maintainer' };
    app = makeApp();
    res = await requestLib(app).get('/reports/assigned');
    expect(res.status).toBe(200);
    expect(getReportsAssignedMock).toHaveBeenCalledWith(99);
  });

  test('POST /reports/:id/internal-comments -> operator only validation and success', async () => {
    isAuth = true;
    currentUser = { id: 12, type: 'citizen' };

    let app = makeApp();
    let res = await requestLib(app).post('/reports/3/internal-comments').send({ content: 'note' });
    expect(res.status).toBe(403);

    currentUser = { id: 12, role: 'Technical office staff member' };
    app = makeApp();
    res = await requestLib(app).post('/reports/abc/internal-comments').send({ content: 'note' });
    expect(res.status).toBe(422);

    app = makeApp();
    res = await requestLib(app).post('/reports/3/internal-comments').send({ content: '' });
    expect(res.status).toBe(422);

    const comment = { id: 5, content: 'note' };
    addInternalCommentMock.mockResolvedValue(comment);
    app = makeApp();
    res = await requestLib(app).post('/reports/3/internal-comments').send({ content: ' note ' });
    expect(res.status).toBe(201);
    expect(addInternalCommentMock).toHaveBeenCalledWith(3, 12, 'note');
  });

  test('GET /reports/:id/internal-comments -> auth/type/id validation and success', async () => {
    isAuth = false;
    currentUser = null;
    let app = makeApp();
    let res = await requestLib(app).get('/reports/3/internal-comments');
    expect(res.status).toBe(401);

    isAuth = true;
    currentUser = { id: 12, type: 'citizen' };
    app = makeApp();
    res = await requestLib(app).get('/reports/3/internal-comments');
    expect(res.status).toBe(403);

    currentUser = { id: 12, role: 'Technical office staff member' };
    app = makeApp();
    res = await requestLib(app).get('/reports/abc/internal-comments');
    expect(res.status).toBe(422);

    const comments = [{ id: 1, content: 'c' }];
    getInternalCommentsMock.mockResolvedValue(comments);
    app = makeApp();
    res = await requestLib(app).get('/reports/3/internal-comments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(comments);
    expect(getInternalCommentsMock).toHaveBeenCalledWith(3);
  });

  test('POST /reports/:id/messages -> validation, senderType and success', async () => {
    isAuth = true;
    currentUser = { id: 21, role: 'user' };

    let app = makeApp();
    let res = await requestLib(app).post('/reports/4/messages').send({ content: '' });
    expect(res.status).toBe(422);

    const msg = { id: 15, content: 'hello' };
    addMessageMock.mockResolvedValue(msg);
    app = makeApp();
    res = await requestLib(app).post('/reports/4/messages').send({ content: 'hey' });
    expect(res.status).toBe(201);
    expect(addMessageMock).toHaveBeenCalledWith(4, 'citizen', 21, 'hey');

    // operator sender
    currentUser = { id: 30, role: 'Technical office staff member' };
    app = makeApp();
    res = await requestLib(app).post('/reports/4/messages').send({ content: 'op msg' });
    expect(res.status).toBe(201);
    expect(addMessageMock).toHaveBeenCalledWith(4, 'operator', 30, 'op msg');
  });

  test('GET /reports/:id/messages -> validation and dao errors', async () => {
    isAuth = true;
    currentUser = { id: 21, role: 'user' };

    let app = makeApp();
    let res = await requestLib(app).get('/reports/zz/messages');
    expect(res.status).toBe(422);

    const messages = [{ id: 1, content: 'x' }];
    getMessagesMock.mockResolvedValue(messages);
    app = makeApp();
    res = await requestLib(app).get('/reports/4/messages');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(messages);

    getMessagesMock.mockRejectedValue(new Error('db down'));
    app = makeApp();
    res = await requestLib(app).get('/reports/4/messages');
    expect(res.status).toBe(503);
  });
});