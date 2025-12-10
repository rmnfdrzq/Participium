const { Pool } = require('pg');

describe('services/comment - addInternalComment / getInternalComments / addMessage / getMessages', () => {
  let svc;
  let queryMock;
  let querySpy;

  beforeAll(async () => {
    queryMock = jest.fn();
    querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));
    svc = await import('../../services/comment.mjs');
  });

  afterAll(() => {
    querySpy && querySpy.mockRestore();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  test('addInternalComment: returns created comment row and calls DB with expected params', async () => {
  const row = {
    internal_comment_id: 11,
    report_id: 5,
    sender_operator_id: 2,
    content: 'Please inspect',
    created_at: '2025-01-01T00:00:00Z'
  };
  
  // Mock per la prima query (controllo status)
  queryMock.mockResolvedValueOnce({ 
    rows: [{ status_id: 1 }] // Status valido (non 5 o 6)
  });
  
  // Mock per la seconda query (insert del commento)
  queryMock.mockResolvedValueOnce({ 
    rows: [row] 
  });

  const res = await svc.addInternalComment(5, 2, 'Please inspect');
  expect(res).toEqual(row);

  // Verifica che siano state fatte 2 chiamate
  expect(queryMock).toHaveBeenCalledTimes(2);

  // Verifica la prima chiamata (check status)
  const [checkSql, checkParams] = queryMock.mock.calls[0];
  expect(checkSql).toMatch(/SELECT status_id FROM reports/i);
  expect(checkParams).toEqual([5]);

  // Verifica la seconda chiamata (insert comment)
  const [insertSql, insertParams] = queryMock.mock.calls[1];
  expect(insertSql).toMatch(/INSERT INTO internal_comment/i);
  expect(insertParams).toEqual([5, 2, 'Please inspect']);
});

  test('getInternalComments: maps DB rows to API shape', async () => {
    const dbRow = {
      internal_comment_id: 20,
      report_id: 7,
      content: 'Checked and ok',
      created_at: '2025-02-02T12:00:00Z',
      sender_operator_id: 9,
      sender_username: 'op_user',
      sender_email: 'op@example.com',
      sender_role: 'Technical office staff member'
    };
    queryMock.mockResolvedValueOnce({ rows: [dbRow] });

    const res = await svc.getInternalComments(7);
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(1);
    expect(res[0]).toEqual({
      id: dbRow.internal_comment_id,
      report_id: dbRow.report_id,
      content: dbRow.content,
      created_at: dbRow.created_at,
      sender: {
        id: dbRow.sender_operator_id,
        username: dbRow.sender_username,
        email: dbRow.sender_email,
        role: dbRow.sender_role
      }
    });

    const [, params] = queryMock.mock.calls[0];
    expect(params).toEqual([7]);
  });

  test('addMessage: returns created message row and calls DB with expected params', async () => {
    const msgRow = {
      message_id: 3,
      report_id: 12,
      sender_type: 'citizen',
      sender_id: 42,
      content: 'Is this fixed?',
      sent_at: '2025-03-03T09:00:00Z'
    };
    queryMock.mockResolvedValueOnce({ rows: [msgRow] });

    const res = await svc.addMessage(12, 'citizen', 42, 'Is this fixed?');
    expect(res).toEqual(msgRow);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO messages/i);
    expect(params).toEqual([12, 'citizen', 42, 'Is this fixed?']);
  });

  test('getMessages: returns mapped messages array', async () => {
    const dbRow = {
      message_id: 5,
      report_id: 99,
      sender_type: 'operator',
      sender_id: 7,
      content: 'Working on it',
      sent_at: '2025-04-04T10:00:00Z'
    };
    queryMock.mockResolvedValueOnce({ rows: [dbRow] });

    const res = await svc.getMessages(99);
    expect(res).toEqual([{
      id: dbRow.message_id,
      report_id: dbRow.report_id,
      sender_type: dbRow.sender_type,
      sender_id: dbRow.sender_id,
      content: dbRow.content,
      sent_at: dbRow.sent_at
    }]);

    const [, params] = queryMock.mock.calls[0];
    expect(params).toEqual([99]);
  });

  test('DB errors propagate for addMessage/getMessages/addInternalComment/getInternalComments', async () => {
    const err = new Error('db error');
    queryMock.mockRejectedValueOnce(err);
    await expect(svc.addMessage(1, 'citizen', 1, 'x')).rejects.toBe(err);

    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getMessages(1)).rejects.toBe(err);

    queryMock.mockRejectedValueOnce(err);
    await expect(svc.addInternalComment(1, 2, 'x')).rejects.toBe(err);

    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getInternalComments(1)).rejects.toBe(err);
  });
});