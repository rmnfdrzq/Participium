const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Mock pg module before any imports
const mockQuery = jest.fn();
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery
  }))
}));

describe('services/citizen', () => {
  let svc;
  let scryptSpy;
  let randomBytesSpy;
  let sendMailMock;
  let createTransportSpy;

  beforeAll(async () => {
    // Mock nodemailer transporter
    sendMailMock = jest.fn().mockResolvedValue({ messageId: '123' });
    createTransportSpy = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailMock
    });

    // deterministic crypto
    scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
      cb(null, Buffer.alloc(32, 0x11));
    });
    randomBytesSpy = jest.spyOn(crypto, 'randomBytes').mockImplementation((n) => Buffer.alloc(n, 0x22));

    svc = await import('../../services/citizen.mjs');
  });

  afterAll(() => {
    scryptSpy && scryptSpy.mockRestore();
    randomBytesSpy && randomBytesSpy.mockRestore();
    createTransportSpy && createTransportSpy.mockRestore();
  });

  beforeEach(() => {
    mockQuery.mockReset();
    // Provide a default resolved value to prevent undefined returns
    mockQuery.mockResolvedValue({ rows: [] });
    sendMailMock.mockClear();
    scryptSpy.mockClear();
    randomBytesSpy.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {}); 
  });

  afterEach(() => {
    jest.restoreAllMocks(); 
  });

  test('createUser: inserts and returns new citizen id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ citizen_id: 101 }] });

    const res = await svc.createUser('uname', 'e@mail', 'First', 'Last', true, 'secret');

    expect(res).toEqual({ id: 101, username: 'uname', first_name: 'First' });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO citizens/i);
    expect(params[0]).toBe('uname');
    expect(params[1]).toBe('e@mail');
    expect(params[2]).toBe('First');
    expect(params[3]).toBe('Last');
    expect(params[4]).toBe(Buffer.alloc(32, 0x11).toString('hex'));
    expect(params[5]).toBe(true);
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
    mockQuery.mockRejectedValueOnce(new Error('DB insert failed'));

    await expect(svc.createUser('uname', 'e@mail', 'First', 'Last', true, 'secret'))
      .rejects.toThrow('DB insert failed');
  });

  test('getUserInfoById: returns row or null', async () => {
    const row = { email: 'x@y', username: 'u', first_name: 'F', last_name: 'L', profile_photo_url: null, telegram_username: null, email_notifications: true };
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const res = await svc.getUserInfoById(5);
    expect(res).toEqual(row);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [5]);

    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res2 = await svc.getUserInfoById(999);
    expect(res2).toBeNull();
  });

  test('getUserInfoById: propagates database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB query failed'));

    await expect(svc.getUserInfoById(5)).rejects.toThrow('DB query failed');
  });

  test('updateUserById: returns null when no updates', async () => {
    const res = await svc.updateUserById(1, {});
    expect(res).toBeNull();
  });

  test('updateUserById: updates and returns row', async () => {
    const updated = { citizen_id: 7, first_name: 'New' };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await svc.updateUserById(7, { first_name: 'New' });
    expect(res).toEqual(updated);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/UPDATE\s+citizens/i);
    expect(params[0]).toBe('New');
    expect(params[1]).toBe(7);
  });

  test('updateUserById: propagates database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Update failed'));

    await expect(svc.updateUserById(7, { first_name: 'New' }))
      .rejects.toThrow('Update failed');
  });

  test('generateEmailVerificationCode: does not call sendMail when user not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // DELETE
      .mockResolvedValueOnce({ rows: [] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // getUserInfoById -> null

    const expires_at = await svc.generateEmailVerificationCode(99);
    expect(expires_at instanceof Date).toBe(true);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  test('generateEmailVerificationCode: calls sendMail when user found', async () => {
    const userInfo = {
      email: 'user@example.com',
      username: 'testuser'
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // DELETE
      .mockResolvedValueOnce({ rows: [] }) // INSERT
      .mockResolvedValueOnce({ rows: [userInfo] }); // getUserInfoById

    sendMailMock.mockResolvedValueOnce({ messageId: '123' });

    const expires_at = await svc.generateEmailVerificationCode(5);

    expect(expires_at instanceof Date).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Your Email Verification Code'
      })
    );
  });

  test('generateEmailVerificationCode: propagates database error on DELETE', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DELETE failed'));

    await expect(svc.generateEmailVerificationCode(5))
      .rejects.toThrow('DELETE failed');
  });

  test('generateEmailVerificationCode: propagates database error on INSERT', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // DELETE succeeds
      .mockRejectedValueOnce(new Error('INSERT failed')); // INSERT fails

    await expect(svc.generateEmailVerificationCode(5))
      .rejects.toThrow('INSERT failed');
  });

  test('generateEmailVerificationCode: propagates sendMail error', async () => {
    const userInfo = { email: 'user@example.com' };

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // DELETE
      .mockResolvedValueOnce({ rows: [] }) // INSERT
      .mockResolvedValueOnce({ rows: [userInfo] }); // getUserInfoById

    sendMailMock.mockRejectedValueOnce(new Error('Email sending failed'));

    await expect(svc.generateEmailVerificationCode(5))
      .rejects.toThrow('Email sending failed');
  });

  test('verifyEmailCode: returns false when no matching code', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await svc.verifyEmailCode(1, '000000');
    expect(res).toBe(false);
  });

  test('verifyEmailCode: returns true and performs update/delete when code valid', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code_id: 1 }] }) // select verification_codes
      .mockResolvedValueOnce({ rows: [] }) // update citizens
      .mockResolvedValueOnce({ rows: [] }); // delete verification_codes

    const res = await svc.verifyEmailCode(2, '123456');
    expect(res).toBe(true);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(/SELECT \*/), [2, '123456']);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(/UPDATE citizens/), [2]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM verification_codes/), [2]);
  });

  test('verifyEmailCode: propagates DB error on SELECT', async () => {
    mockQuery.mockRejectedValueOnce(new Error('SELECT failed'));
    await expect(svc.verifyEmailCode(1, 'x')).rejects.toThrow('SELECT failed');
  });

  test('verifyEmailCode: propagates DB error on UPDATE', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code_id: 1 }] }) // SELECT succeeds
      .mockRejectedValueOnce(new Error('UPDATE failed')); // UPDATE fails

    await expect(svc.verifyEmailCode(2, '123456')).rejects.toThrow('UPDATE failed');
  });

  test('verifyEmailCode: propagates DB error on DELETE', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code_id: 1 }] }) // SELECT succeeds
      .mockResolvedValueOnce({ rows: [] }) // UPDATE succeeds
      .mockRejectedValueOnce(new Error('DELETE failed')); // DELETE fails

    await expect(svc.verifyEmailCode(2, '123456')).rejects.toThrow('DELETE failed');
  });
});