let getChatsByCitizenMock,
  getChatsByOperatorMock,
  getChatDetailsMock,
  getMessagesMock,
  markChatAsReadMock,
  getTotalUnreadCountMock;

let currentUser = null;

describe('router/chat', () => {
  let app;
  let request;
  let express;
  let router;
  let isAuth = false;

  beforeEach(async () => {
    jest.resetModules();
    getChatsByCitizenMock = jest.fn();
    getChatsByOperatorMock = jest.fn();
    getChatDetailsMock = jest.fn();
    getMessagesMock = jest.fn();
    markChatAsReadMock = jest.fn();
    getTotalUnreadCountMock = jest.fn();

    // mock dao module before importing the router
    await jest.unstable_mockModule('../../dao.mjs', () => ({
      getChatsByCitizen: getChatsByCitizenMock,
      getChatsByOperator: getChatsByOperatorMock,
      getChatDetails: getChatDetailsMock,
      getMessages: getMessagesMock,
      markChatAsRead: markChatAsReadMock,
      getTotalUnreadCount: getTotalUnreadCountMock,
    }));

    express = (await import('express')).default;
    request = (await import('supertest')).default;

    // import router after mocking
    router = (await import('../../router/chat.mjs')).default;

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

  describe('GET /api/chats', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/chats');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('citizen retrieves their chats -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      const chats = [{ report_id: 1, citizen_id: 1, subject: 'Issue' }];
      getChatsByCitizenMock.mockResolvedValueOnce(chats);

      const res = await request(app).get('/api/chats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(chats);
      expect(getChatsByCitizenMock).toHaveBeenCalledWith(1);
    });

    test('operator retrieves their chats -> 200', async () => {
      isAuth = true;
      currentUser = { id: 5, role: 'Technical office staff member' };
      const chats = [{ report_id: 2, operator_id: 5 }];
      getChatsByOperatorMock.mockResolvedValueOnce(chats);

      const res = await request(app).get('/api/chats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(chats);
      expect(getChatsByOperatorMock).toHaveBeenCalledWith(5, 'Technical office staff member');
    });

    test('external maintainer retrieves their chats -> 200', async () => {
      isAuth = true;
      currentUser = { id: 6, role: 'External maintainer' };
      const chats = [{ report_id: 3, external_id: 6 }];
      getChatsByOperatorMock.mockResolvedValueOnce(chats);

      const res = await request(app).get('/api/chats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(chats);
      expect(getChatsByOperatorMock).toHaveBeenCalledWith(6, 'External maintainer');
    });

    test('invalid role -> 403', async () => {
      isAuth = true;
      currentUser = { id: 10, role: 'InvalidRole' };

      const res = await request(app).get('/api/chats');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getChatsByCitizenMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/chats');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during chat retrieval' });
    });
  });

  describe('GET /api/chats/unread/count', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/chats/unread/count');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('citizen gets unread count -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getTotalUnreadCountMock.mockResolvedValueOnce(5);

      const res = await request(app).get('/api/chats/unread/count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 5 });
      expect(getTotalUnreadCountMock).toHaveBeenCalledWith('citizen', 1);
    });

    test('operator gets unread count -> 200', async () => {
      isAuth = true;
      currentUser = { id: 5, role: 'Technical office staff member' };
      getTotalUnreadCountMock.mockResolvedValueOnce(3);

      const res = await request(app).get('/api/chats/unread/count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 3 });
      expect(getTotalUnreadCountMock).toHaveBeenCalledWith('operator', 5);
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getTotalUnreadCountMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/chats/unread/count');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error' });
    });
  });

  describe('GET /api/chats/:reportId', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).get('/api/chats/1');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('invalid reportId (non-numeric) -> 422', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };

      const res = await request(app).get('/api/chats/abc');
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: 'Invalid report id' });
    });

    test('chat not found -> 404', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getChatDetailsMock.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/chats/999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Chat not found' });
    });

    test('citizen accesses own chat -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      const chatDetails = {
        citizen: { id: 1, name: 'John' },
        report_id: 10,
        subject: 'Issue',
      };
      const messages = [{ id: 1, text: 'Hello' }];
      getChatDetailsMock.mockResolvedValueOnce(chatDetails);
      getMessagesMock.mockResolvedValueOnce(messages);
      markChatAsReadMock.mockResolvedValueOnce(undefined);

      const res = await request(app).get('/api/chats/10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...chatDetails, messages });
      expect(getChatDetailsMock).toHaveBeenCalledWith(10);
      expect(getMessagesMock).toHaveBeenCalledWith(10);
      expect(markChatAsReadMock).toHaveBeenCalledWith('citizen', 1, 10);
    });

    test('citizen cannot access other citizen chat -> 403', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      const chatDetails = {
        citizen: { id: 2, name: 'Jane' },
        report_id: 10,
      };
      getChatDetailsMock.mockResolvedValueOnce(chatDetails);

      const res = await request(app).get('/api/chats/10');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    test('operator accesses assigned chat -> 200', async () => {
      isAuth = true;
      currentUser = { id: 5, role: 'Technical office staff member' };
      const chatDetails = {
        citizen: { id: 1, name: 'John' },
        operator: { id: 5, name: 'Operator' },
        report_id: 10,
      };
      const messages = [{ id: 1, text: 'Hello' }];
      getChatDetailsMock.mockResolvedValueOnce(chatDetails);
      getMessagesMock.mockResolvedValueOnce(messages);
      markChatAsReadMock.mockResolvedValueOnce(undefined);

      const res = await request(app).get('/api/chats/10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...chatDetails, messages });
      expect(markChatAsReadMock).toHaveBeenCalledWith('operator', 5, 10);
    });

    test('external maintainer accesses assigned chat -> 200', async () => {
      isAuth = true;
      currentUser = { id: 6, role: 'External maintainer' };
      const chatDetails = {
        citizen: { id: 1, name: 'John' },
        external: { id: 6, name: 'Maintainer' },
        report_id: 10,
      };
      const messages = [{ id: 1, text: 'Hello' }];
      getChatDetailsMock.mockResolvedValueOnce(chatDetails);
      getMessagesMock.mockResolvedValueOnce(messages);
      markChatAsReadMock.mockResolvedValueOnce(undefined);

      const res = await request(app).get('/api/chats/10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...chatDetails, messages });
      expect(markChatAsReadMock).toHaveBeenCalledWith('operator', 6, 10);
    });

    test('operator cannot access unassigned chat -> 403', async () => {
      isAuth = true;
      currentUser = { id: 5, role: 'Technical office staff member' };
      const chatDetails = {
        citizen: { id: 1, name: 'John' },
        operator: { id: 7, name: 'Other operator' },
        external: { id: 8, name: 'Other external' },
        report_id: 10,
      };
      getChatDetailsMock.mockResolvedValueOnce(chatDetails);

      const res = await request(app).get('/api/chats/10');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    test('invalid role -> 403', async () => {
      isAuth = true;
      currentUser = { id: 10, role: 'InvalidRole' };
      const chatDetails = {
        citizen: { id: 1, name: 'John' },
        report_id: 10,
      };
      getChatDetailsMock.mockResolvedValueOnce(chatDetails);

      const res = await request(app).get('/api/chats/10');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      getChatDetailsMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/chats/10');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error during chat retrieval' });
    });
  });

  describe('POST /api/chats/:reportId/read', () => {
    test('unauthenticated -> 401', async () => {
      isAuth = false;
      const res = await request(app).post('/api/chats/1/read');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Not authenticated' });
    });

    test('invalid reportId (non-numeric) -> 422', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };

      const res = await request(app).post('/api/chats/xyz/read');
      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: 'Invalid report id' });
    });

    test('citizen marks chat as read -> 200', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      markChatAsReadMock.mockResolvedValueOnce(undefined);

      const res = await request(app).post('/api/chats/10/read');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(markChatAsReadMock).toHaveBeenCalledWith('citizen', 1, 10);
    });

    test('operator marks chat as read -> 200', async () => {
      isAuth = true;
      currentUser = { id: 5, role: 'Technical office staff member' };
      markChatAsReadMock.mockResolvedValueOnce(undefined);

      const res = await request(app).post('/api/chats/10/read');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(markChatAsReadMock).toHaveBeenCalledWith('operator', 5, 10);
    });

    test('database error -> 503', async () => {
      isAuth = true;
      currentUser = { id: 1, role: 'user' };
      markChatAsReadMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).post('/api/chats/10/read');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'Database error' });
    });
  });
});
