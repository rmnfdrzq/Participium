let getNotificationsByCitizenMock,
  getUnreadCountMock,
  markNotificationAsSeenMock,
  markAllAsSeenMock;

let currentUser = null;

describe('router/notification', () => {
  let app;
  let request;
  let express;
  let router;
  let isAuth = false;

  beforeEach(async () => {
    jest.resetModules();
    getNotificationsByCitizenMock = jest.fn();
    getUnreadCountMock = jest.fn();
    markNotificationAsSeenMock = jest.fn();
    markAllAsSeenMock = jest.fn();

    // mock dao module before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      getNotificationsByCitizen: getNotificationsByCitizenMock,
      getUnreadCount: getUnreadCountMock,
      markNotificationAsSeen: markNotificationAsSeenMock,
      markAllAsSeen: markAllAsSeenMock,
    }));

    express = (await import('express')).default;
    request = (await import('supertest')).default;

    // import router after mocking
    router = (await import('../../router/notification.mjs')).default;

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

  describe('GET /api/notifications', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('authenticated but not a citizen (user role required) -> 401', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'Admin' };
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('citizen retrieves notifications -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      const notifications = [
        { id: 1, message: 'Report accepted', seen: false },
        { id: 2, message: 'Report rejected', seen: true },
      ];
      getNotificationsByCitizenMock.mockResolvedValueOnce(notifications);

      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(notifications);
      expect(getNotificationsByCitizenMock).toHaveBeenCalledWith(1);
    });

    test('empty notifications list -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getNotificationsByCitizenMock.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getNotificationsByCitizenMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during notification retrieval' });
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('authenticated but not a citizen -> 401', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'Operator' };
      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('citizen gets unread count -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getUnreadCountMock.mockResolvedValueOnce(3);

      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 3 });
      expect(getUnreadCountMock).toHaveBeenCalledWith(1);
    });

    test('zero unread notifications -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getUnreadCountMock.mockResolvedValueOnce(0);

      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 0 });
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getUnreadCountMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during count retrieval' });
    });
  });

  describe('PUT /api/notifications/:id/seen', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).put('/api/notifications/1/seen');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('authenticated but not a citizen -> 401', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'Admin' };
      const res = await request(app).put('/api/notifications/1/seen');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('invalid notification id (non-numeric) -> 422', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };

      const res = await request(app).put('/api/notifications/abc/seen');
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: 'Invalid notification id' });
    });

    test('notification not found -> 404', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      markNotificationAsSeenMock.mockResolvedValueOnce(null);

      const res = await request(app).put('/api/notifications/999/seen');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Notification not found' });
      expect(markNotificationAsSeenMock).toHaveBeenCalledWith(999, 1);
    });

    test('marks notification as seen -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      const updatedNotification = { id: 5, message: 'Updated', seen: true };
      markNotificationAsSeenMock.mockResolvedValueOnce(updatedNotification);

      const res = await request(app).put('/api/notifications/5/seen');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedNotification);
      expect(markNotificationAsSeenMock).toHaveBeenCalledWith(5, 1);
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      markNotificationAsSeenMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).put('/api/notifications/5/seen');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during update' });
    });
  });

  describe('PUT /api/notifications/mark-all-seen', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).put('/api/notifications/mark-all-seen');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('authenticated but not a citizen -> 401', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'Operator' };
      const res = await request(app).put('/api/notifications/mark-all-seen');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('marks all notifications as seen -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      markAllAsSeenMock.mockResolvedValueOnce(undefined);

      const res = await request(app).put('/api/notifications/mark-all-seen');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(markAllAsSeenMock).toHaveBeenCalledWith(1);
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      markAllAsSeenMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).put('/api/notifications/mark-all-seen');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during update' });
    });
  });
});
