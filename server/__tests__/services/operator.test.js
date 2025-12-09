const { Pool } = require('pg');
const crypto = require('crypto');

describe('services/operator', () => {
  let svc;
  let queryMock;
  let querySpy;
  let scryptSpy;
  let randomBytesSpy;

  beforeAll(async () => {
    queryMock = jest.fn();
    querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));

    // default deterministic crypto behaviour for tests
    scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
      // return 32 bytes filled with 0x11
      cb(null, Buffer.alloc(32, 0x11));
    });
    randomBytesSpy = jest.spyOn(crypto, 'randomBytes').mockImplementation((n) => Buffer.alloc(n, 0x22));

    svc = await import('../../services/operator.mjs');
  });

  afterAll(() => {
    querySpy && querySpy.mockRestore();
    scryptSpy && scryptSpy.mockRestore();
    randomBytesSpy && randomBytesSpy.mockRestore();
  });

  beforeEach(() => {
    queryMock.mockReset();
    scryptSpy.mockClear();
    randomBytesSpy.mockClear();
  });

  test('getOperators: returns user on correct password', async () => {
    const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
    queryMock.mockResolvedValueOnce({
      rows: [{
        operator_id: 10,
        username: 'opuser',
        role_name: 'Admin',
        password_hash: hashedHex,
        salt: 'some-salt'
      }]
    });

    const res = await svc.getOperators('email@example.com', 'password');
    expect(res).toEqual({ id: 10, username: 'opuser', role: 'Admin' });

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+operators/i);
    expect(params).toEqual(['email@example.com']);
  });

  test('getOperators: returns false when user not found', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.getOperators('noone@example.com', 'pwd');
    expect(res).toBe(false);
  });

  test('getOperators: returns false on password mismatch', async () => {
    // row password_hash different from scrypt output
    const otherHash = Buffer.alloc(32, 0x99).toString('hex');
    queryMock.mockResolvedValueOnce({
      rows: [{
        operator_id: 11,
        username: 'op2',
        role_name: 'Operator',
        password_hash: otherHash,
        salt: 's'
      }]
    });

    const res = await svc.getOperators('op2@example.com', 'badpwd');
    expect(res).toBe(false);
  });

  test('getOperators: propagates scrypt error', async () => {
    // make scrypt call back with error for this invocation
    scryptSpy.mockImplementationOnce((password, salt, len, cb) => cb(new Error('scrypt failed')));

    const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
    queryMock.mockResolvedValueOnce({
      rows: [{
        operator_id: 12,
        username: 'op3',
        role_name: 'Operator',
        password_hash: hashedHex,
        salt: 's'
      }]
    });

    await expect(svc.getOperators('e', 'p')).rejects.toThrow('scrypt failed');
  });

  test('getAllOperators: maps DB rows to API shape', async () => {
    const rows = [{
      operator_id: 1,
      email: 'a@x',
      username: 'u1',
      office_id: 2,
      office_name: 'Office A',
      role_name: 'RoleX'
    }];
    queryMock.mockResolvedValueOnce({ rows });

    const res = await svc.getAllOperators();
    expect(res).toEqual([{
      id: 1,
      email: 'a@x',
      username: 'u1',
      office_id: 2,
      office_name: 'Office A',
      role: 'RoleX'
    }]);

    const [sql] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+o\.operator_id/i);
  });

  test('createMunicipalityUser: inserts and returns created user', async () => {
    // pool returns new operator id
    queryMock.mockResolvedValueOnce({ rows: [{ operator_id: 55 }] });

    const res = await svc.createMunicipalityUser('e@mail', 'uname', 'secret', 3, 4, 7);
    expect(res).toEqual({ id: 55, username: 'uname' });

    expect(randomBytesSpy).toHaveBeenCalledWith(16);
    expect(scryptSpy).toHaveBeenCalled();

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO operators/i);
    expect(params[0]).toBe('e@mail');
    expect(params[1]).toBe('uname');
    expect(params[2]).toBe(Buffer.alloc(32, 0x11).toString('hex'));
    expect(params[3]).toBe(Buffer.alloc(16, 0x22).toString('hex'));
    expect(params[4]).toBe(3);
    expect(params[5]).toBe(4);
    expect(params[6]).toBe(7);
  });

  test('createMunicipalityUser: propagates DB error', async () => {
    queryMock.mockRejectedValueOnce(new Error('db insert failed'));

    await expect(svc.createMunicipalityUser('x', 'y', 'p', 1, 2, null)).rejects.toThrow('db insert failed');
  });

  test('returns mapped maintainers when rows present', async () => {
    const officeId = 7;
    const row = { operator_id: 5, username: 'joe', company_name: 'FixCo' };
    queryMock.mockResolvedValueOnce({ rows: [row] });

    const res = await svc.getMainteinerByOffice(officeId);
    expect(res).toEqual([{ id: row.operator_id, username: row.username, company: row.company_name }]);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+o\.operator_id/i);
  });

  test('returns empty array when no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.getMainteinerByOffice(123);
    expect(res).toEqual([]);
  });

  test('propagates DB error', async () => {
    const err = new Error('db fail');
    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getMainteinerByOffice(1)).rejects.toBe(err);
  });
  
  test('returns mapped technical officers when rows present', async () => {
    const officeId = 10;
    const techRows = [
      { operator_id: 2, email: 'tec1@x', username: 'tec1', office_id: officeId },
      { operator_id: 3, email: 'tec2@x', username: 'tec2', office_id: officeId }
    ];
    queryMock.mockResolvedValueOnce({ rows: techRows });

    const res = await svc.getTechnicalOfficersByOffice(officeId);
    expect(res).toEqual([
      { id: 2, email: 'tec1@x', username: 'tec1', office_id: officeId },
      { id: 3, email: 'tec2@x', username: 'tec2', office_id: officeId }
    ]);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+operators/i);
    expect(params).toEqual([officeId]);
  });

  test('returns empty array when no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.getTechnicalOfficersByOffice(5);
    expect(res).toEqual([]);
  });

  test('propagates DB error', async () => {
    const err = new Error('db fail');
    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getTechnicalOfficersByOffice(1)).rejects.toBe(err);
  });

  // NUOVI TEST PER getUser (righe 17-66)
  describe('getUser', () => {
    test('returns operator user on correct password when found in operators table', async () => {
      const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 20,
          username: 'opuser',
          email: 'op@example.com',
          role_name: 'Admin',
          password_hash: hashedHex,
          salt: 'some-salt'
        }]
      });

      const res = await svc.getUser('op@example.com', 'password');
      expect(res).toEqual({ id: 20, username: 'opuser', role: 'Admin' });

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toMatch(/SELECT\s+o\.\*.*FROM\s+operators\s+o/i);
      expect(params).toEqual(['op@example.com']);
    });

    test('returns operator when searched by username', async () => {
      const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 21,
          username: 'admin_user',
          email: 'admin@x.com',
          role_name: 'Admin',
          password_hash: hashedHex,
          salt: 'salt'
        }]
      });

      const res = await svc.getUser('admin_user', 'password');
      expect(res).toEqual({ id: 21, username: 'admin_user', role: 'Admin' });
    });

    test('returns false when operator found but password mismatch', async () => {
      const otherHash = Buffer.alloc(32, 0x99).toString('hex');
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 22,
          username: 'op2',
          role_name: 'Operator',
          password_hash: otherHash,
          salt: 's'
        }]
      });

      const res = await svc.getUser('op2@example.com', 'wrongpassword');
      expect(res).toBe(false);
    });

    test('searches in citizens table when not found in operators', async () => {
      const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
      queryMock.mockResolvedValueOnce({ rows: [] });
      queryMock.mockResolvedValueOnce({
        rows: [{
          citizen_id: 100,
          username: 'citizen1',
          email: 'citizen@example.com',
          password_hash: hashedHex,
          salt: 'citizen-salt'
        }]
      });

      const res = await svc.getUser('citizen@example.com', 'password');
      expect(res).toEqual({ id: 100, username: 'citizen1', role: 'user' });

      expect(queryMock).toHaveBeenCalledTimes(2);
      const [sqlCitizen, paramsCitizen] = queryMock.mock.calls[1];
      expect(sqlCitizen).toMatch(/SELECT\s+\*\s+FROM\s+citizens/i);
      expect(paramsCitizen).toEqual(['citizen@example.com']);
    });

    test('returns citizen when searched by username', async () => {
      const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
      queryMock.mockResolvedValueOnce({ rows: [] });
      queryMock.mockResolvedValueOnce({
        rows: [{
          citizen_id: 101,
          username: 'citizen_user',
          email: 'c@x.com',
          password_hash: hashedHex,
          salt: 'salt'
        }]
      });

      const res = await svc.getUser('citizen_user', 'password');
      expect(res).toEqual({ id: 101, username: 'citizen_user', role: 'user' });
    });

    test('returns false when citizen found but password mismatch', async () => {
      const otherHash = Buffer.alloc(32, 0x99).toString('hex');
      queryMock.mockResolvedValueOnce({ rows: [] });
      queryMock.mockResolvedValueOnce({
        rows: [{
          citizen_id: 102,
          username: 'citizen2',
          password_hash: otherHash,
          salt: 's'
        }]
      });

      const res = await svc.getUser('citizen2', 'wrongpwd');
      expect(res).toBe(false);
    });

    test('returns false when user not found in both tables', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });
      queryMock.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getUser('nonexistent@example.com', 'password');
      expect(res).toBe(false);

      expect(queryMock).toHaveBeenCalledTimes(2);
    });

    test('propagates scrypt error for operator', async () => {
      scryptSpy.mockImplementationOnce((password, salt, len, cb) => cb(new Error('scrypt failed')));

      const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 23,
          username: 'op3',
          role_name: 'Operator',
          password_hash: hashedHex,
          salt: 's'
        }]
      });

      await expect(svc.getUser('op3@example.com', 'p')).rejects.toThrow('scrypt failed');
    });

    test('propagates scrypt error for citizen', async () => {
      scryptSpy.mockClear();
      queryMock.mockResolvedValueOnce({ rows: [] });
      
      scryptSpy.mockImplementationOnce((password, salt, len, cb) => cb(new Error('citizen scrypt failed')));
      
      const hashedHex = Buffer.alloc(32, 0x11).toString('hex');
      queryMock.mockResolvedValueOnce({
        rows: [{
          citizen_id: 103,
          username: 'cit3',
          password_hash: hashedHex,
          salt: 's'
        }]
      });

      await expect(svc.getUser('cit3', 'p')).rejects.toThrow('citizen scrypt failed');
    });

    test('propagates database error from operators query', async () => {
      queryMock.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(svc.getUser('user@example.com', 'pwd')).rejects.toThrow('DB connection failed');
    });

    test('propagates database error from citizens query', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });
      queryMock.mockRejectedValueOnce(new Error('Citizens table error'));

      await expect(svc.getUser('user@example.com', 'pwd')).rejects.toThrow('Citizens table error');
    });
  });
});