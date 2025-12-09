const { Pool } = require('pg');
const crypto = require('crypto');

describe('services/citizen', () => {
  let svc;
  let queryMock;
  let querySpy;
  let scryptSpy;
  let randomBytesSpy;
  let sendEmailMock;

  beforeAll(async () => {
    // mock sendEmail before importing the module
    sendEmailMock = jest.fn();
    await jest.unstable_mockModule('../../services/utils.mjs', () => ({ sendEmail: sendEmailMock }));

    queryMock = jest.fn();
    querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));

    // deterministic crypto
    scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
      cb(null, Buffer.alloc(32, 0x11));
    });
    randomBytesSpy = jest.spyOn(crypto, 'randomBytes').mockImplementation((n) => Buffer.alloc(n, 0x22));

    svc = await import('../../services/citizen.mjs');
  });

  afterAll(() => {
    querySpy && querySpy.mockRestore();
    scryptSpy && scryptSpy.mockRestore();
    randomBytesSpy && randomBytesSpy.mockRestore();
  });

  beforeEach(() => {
    queryMock.mockReset();
    sendEmailMock.mockReset();
    scryptSpy.mockClear();
    randomBytesSpy.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {}); 
  });

  test('createUser: inserts and returns new citizen id', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ citizen_id: 101 }] });

    const res = await svc.createUser('uname', 'e@mail', 'First', 'Last', true, 'secret');

    expect(res).toEqual({ id: 101, username: 'uname', first_name: 'First' });

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO citizens/i);
    expect(params[0]).toBe('uname');
    expect(params[1]).toBe('e@mail');
    expect(params[2]).toBe('First');
    expect(params[3]).toBe('Last');
    // hashed password hex from our scrypt mock
    expect(params[4]).toBe(Buffer.alloc(32, 0x11).toString('hex'));
    expect(params[5]).toBe(true);
    // salt from randomBytes mock
    expect(params[6]).toBe(Buffer.alloc(16, 0x22).toString('hex'));
  });

  test('createUser: propagates scrypt error', async () => {
    const scryptErrorSpy = jest.spyOn(crypto, 'scrypt');
    scryptErrorSpy.mockImplementation((password, salt, len, cb) => {
      cb(new Error('scrypt fail'));
    });
    
    await expect(svc.createUser('u', 'a', 'F', 'L', true, 'p')).rejects.toThrow('scrypt fail');
    
    scryptErrorSpy.mockRestore();
  });

  test('createUser: propagates database error', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB insert failed'));

    await expect(svc.createUser('uname', 'e@mail', 'First', 'Last', true, 'secret'))
      .rejects.toThrow('DB insert failed');
  });

  test('getUserInfoById: returns row or null', async () => {
    const row = { email: 'x@y', username: 'u', first_name: 'F', last_name: 'L', profile_photo_url: null, telegram_username: null, email_notifications: true };
    queryMock.mockResolvedValueOnce({ rows: [row] });
    const res = await svc.getUserInfoById(5);
    expect(res).toEqual(row);
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), [5]);

    queryMock.mockResolvedValueOnce({ rows: [] });
    const res2 = await svc.getUserInfoById(999);
    expect(res2).toBeNull();
  });

  test('getUserInfoById: propagates database error', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB query failed'));

    await expect(svc.getUserInfoById(5)).rejects.toThrow('DB query failed');
  });

  test('updateUserById: returns null when no updates', async () => {
    const res = await svc.updateUserById(1, {});
    expect(res).toBeNull();
  });

  test('updateUserById: updates and returns row', async () => {
    const updated = { citizen_id: 7, first_name: 'New' };
    queryMock.mockResolvedValueOnce({ rows: [updated] });

    const res = await svc.updateUserById(7, { first_name: 'New' });
    expect(res).toEqual(updated);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/UPDATE\s+citizens/i);
    expect(params[0]).toBe('New');
    expect(params[1]).toBe(7); // userId appended
  });

  test('updateUserById: propagates database error', async () => {
    queryMock.mockRejectedValueOnce(new Error('Update failed'));

    await expect(svc.updateUserById(7, { first_name: 'New' }))
      .rejects.toThrow('Update failed');
  });

  test('generateEmailVerificationCode: does not call sendEmail when user not found', async () => {
    queryMock
      .mockResolvedValueOnce({}) // DELETE
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // getUserInfoById -> null

    sendEmailMock.mockReset();
    const expires_at = await svc.generateEmailVerificationCode(99);
    expect(expires_at instanceof Date).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('generateEmailVerificationCode: calls sendEmail when user found', async () => {
    const userInfo = {
      email: 'user@example.com',
      username: 'testuser'
    };

    queryMock
      .mockResolvedValueOnce({}) // DELETE
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({ rows: [userInfo] }); // getUserInfoById

    sendEmailMock.mockResolvedValueOnce({ messageId: '123' });

    const expires_at = await svc.generateEmailVerificationCode(5);

    expect(expires_at instanceof Date).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(3);
    
    // Verify DELETE was called
    const [deleteSql, deleteParams] = queryMock.mock.calls[0];
    expect(deleteSql).toMatch(/DELETE FROM verification_codes/i);
    expect(deleteParams).toEqual([5]);

    // Verify INSERT was called with code and expires_at
    const [insertSql, insertParams] = queryMock.mock.calls[1];
    expect(insertSql).toMatch(/INSERT INTO verification_codes/i);
    expect(insertParams[0]).toBe(5); // userId
    expect(insertParams[1]).toMatch(/^\d{6}$/); // 6-digit code
    expect(insertParams[2] instanceof Date).toBe(true); // expires_at
  });

  test('generateEmailVerificationCode: propagates database error on DELETE', async () => {
    queryMock.mockRejectedValueOnce(new Error('DELETE failed'));

    await expect(svc.generateEmailVerificationCode(5))
      .rejects.toThrow('DELETE failed');
  });

  test('generateEmailVerificationCode: propagates database error on INSERT', async () => {
    queryMock
      .mockResolvedValueOnce({}) // DELETE succeeds
      .mockRejectedValueOnce(new Error('INSERT failed')); // INSERT fails

    await expect(svc.generateEmailVerificationCode(5))
      .rejects.toThrow('INSERT failed');
  });

  test('verifyEmailCode: returns false when no matching code', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.verifyEmailCode(1, '000000');
    expect(res).toBe(false);
  });

  test('verifyEmailCode: returns true and performs update/delete when code valid', async () => {
    // select -> rows present
    queryMock
      .mockResolvedValueOnce({ rows: [{ code_id: 1 }] }) // select verification_codes
      .mockResolvedValueOnce({}) // update citizens
      .mockResolvedValueOnce({}); // delete verification_codes

    const res = await svc.verifyEmailCode(2, '123456');
    expect(res).toBe(true);

    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/SELECT \*/), [2, '123456']);
    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/UPDATE citizens/), [2]);
    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM verification_codes/), [2]);
  });

  test('verifyEmailCode: propagates DB error on SELECT', async () => {
    queryMock.mockRejectedValueOnce(new Error('SELECT failed'));
    await expect(svc.verifyEmailCode(1, 'x')).rejects.toThrow('SELECT failed');
  });

  test('verifyEmailCode: propagates DB error on UPDATE', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ code_id: 1 }] }) // SELECT succeeds
      .mockRejectedValueOnce(new Error('UPDATE failed')); // UPDATE fails

    await expect(svc.verifyEmailCode(2, '123456')).rejects.toThrow('UPDATE failed');
  });

  test('verifyEmailCode: propagates DB error on DELETE', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ code_id: 1 }] }) // SELECT succeeds
      .mockResolvedValueOnce({}) // UPDATE succeeds
      .mockRejectedValueOnce(new Error('DELETE failed')); // DELETE fails

    await expect(svc.verifyEmailCode(2, '123456')).rejects.toThrow('DELETE failed');
  });
});