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
  });  test('returns mapped maintainers when rows present', async () => {
    const officeId = 7;
    const row = { operator_id: 5, username: 'joe', company_name: 'FixCo' };
    queryMock.mockResolvedValueOnce({ rows: [row] });

    const res = await svc.getMainteinerByOffice(officeId);
    expect(res).toEqual([{ id: row.operator_id, username: row.username, company: row.company_name }]);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+o\.operator_id/i);
    expect(params).toEqual([officeId]);
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
});