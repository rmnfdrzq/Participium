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

  describe('getOperators', () => {
    test('returns user on correct password', async () => {
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

    test('returns false when user not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });
      const res = await svc.getOperators('noone@example.com', 'pwd');
      expect(res).toBe(false);
    });

    test('returns false on password mismatch', async () => {
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

    test('propagates scrypt error', async () => {
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
  });

  describe('getAllOperators', () => {
    test('maps DB rows to API shape', async () => {
      const rows = [{
        operator_id: 1,
        email: 'a@x',
        username: 'u1',
        role_name: 'RoleX',
        offices: ['Office A', 'Office B']
      }];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getAllOperators();
      expect(res).toEqual([{
        id: 1,
        email: 'a@x',
        username: 'u1',
        role: 'RoleX',
        offices: ['Office A', 'Office B']
      }]);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toMatch(/SELECT\s+o\.operator_id/i);
    });

    test('returns empty array when no operators', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });
      const res = await svc.getAllOperators();
      expect(res).toEqual([]);
    });

    test('handles multiple operators', async () => {
      const rows = [
        { operator_id: 1, email: 'op1@x', username: 'u1', role_name: 'Admin', offices: [] },
        { operator_id: 2, email: 'op2@x', username: 'u2', role_name: 'Operator', offices: ['Office A'] }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getAllOperators();
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe(1);
      expect(res[1].id).toBe(2);
    });

    test('propagates DB error', async () => {
      const err = new Error('query failed');
      queryMock.mockRejectedValueOnce(err);
      await expect(svc.getAllOperators()).rejects.toBe(err);
    });
  });

  describe('createMunicipalityUser', () => {
    test('inserts and returns created user', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ operator_id: 55 }] });

      const res = await svc.createMunicipalityUser('e@mail', 'uname', 'secret', 3, 4);
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
    });

    test('propagates DB error', async () => {
      queryMock.mockRejectedValueOnce(new Error('db insert failed'));

      await expect(svc.createMunicipalityUser('x', 'y', 'p', 1, 2)).rejects.toThrow('db insert failed');
    });

    test('generates unique salt and hash', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ operator_id: 56 }] });
      queryMock.mockResolvedValueOnce({ rows: [{ operator_id: 57 }] });

      await svc.createMunicipalityUser('a@b.com', 'user1', 'pwd1', 1, 2);
      await svc.createMunicipalityUser('c@d.com', 'user2', 'pwd2', 1, 2);

      expect(randomBytesSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMainteinerByOffice', () => {
    test('returns mapped maintainers when rows present', async () => {
      const categoryId = 7;
      const row = { operator_id: 5, username: 'joe', company_name: 'FixCo' };
      queryMock.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getMainteinerByOffice(categoryId);
      expect(res).toEqual([{ id: row.operator_id, username: row.username, company: row.company_name }]);

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toMatch(/SELECT\s+DISTINCT/i);
      expect(params).toEqual([categoryId]);
    });

    test('returns empty array when no rows', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });
      const res = await svc.getMainteinerByOffice(123);
      expect(res).toEqual([]);
    });

    test('handles multiple maintainers', async () => {
      const rows = [
        { operator_id: 1, username: 'joe', company_name: 'FixCo' },
        { operator_id: 2, username: 'jane', company_name: 'CleanCo' }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getMainteinerByOffice(7);
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe(1);
      expect(res[1].id).toBe(2);
    });

    test('propagates DB error', async () => {
      const err = new Error('db fail');
      queryMock.mockRejectedValueOnce(err);
      await expect(svc.getMainteinerByOffice(1)).rejects.toBe(err);
    });
  });
  
  describe('getTechnicalOfficersByOffice', () => {
    test('returns mapped technical officers when rows present', async () => {
      const categoryId = 10;
      const techRows = [
        { operator_id: 2, email: 'tec1@x', username: 'tec1' },
        { operator_id: 3, email: 'tec2@x', username: 'tec2' }
      ];
      queryMock.mockResolvedValueOnce({ rows: techRows });

      const res = await svc.getTechnicalOfficersByOffice(categoryId);
      expect(res).toEqual([
        { id: 2, email: 'tec1@x', username: 'tec1' },
        { id: 3, email: 'tec2@x', username: 'tec2' }
      ]);

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toMatch(/SELECT\s+DISTINCT/i);
      expect(params).toEqual([categoryId]);
    });

    test('returns empty array when no officers', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });
      const res = await svc.getTechnicalOfficersByOffice(5);
      expect(res).toEqual([]);
    });

    test('maps single officer correctly', async () => {
      const rows = [{ operator_id: 1, email: 'tech@office.com', username: 'techstaff' }];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getTechnicalOfficersByOffice(3);
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({ id: 1, email: 'tech@office.com', username: 'techstaff' });
    });

    test('propagates DB error', async () => {
      const err = new Error('db fail');
      queryMock.mockRejectedValueOnce(err);
      await expect(svc.getTechnicalOfficersByOffice(1)).rejects.toBe(err);
    });
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

  describe('addOperatorCategory', () => {
    test('adds category to technical staff member operator', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 50,
          company_id: 3,
          role_name: 'Technical office staff member'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{}]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{ operator_id: 50, category_id: 5 }]
      });

      const res = await svc.addOperatorCategory(50, 5);
      expect(res).toEqual({ operator_id: 50, category_id: 5 });

      expect(queryMock).toHaveBeenCalledTimes(3);
    });

    test('adds category to external maintainer operator', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 51,
          company_id: 2,
          role_name: 'External maintainer'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{}]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{ operator_id: 51, category_id: 3 }]
      });

      const res = await svc.addOperatorCategory(51, 3);
      expect(res).toEqual({ operator_id: 51, category_id: 3 });
    });

    test('throws 404 when operator not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(svc.addOperatorCategory(999, 5)).rejects.toEqual({
        status: 404,
        message: 'Operator not found'
      });
    });

    test('throws 422 when operator is not technical staff or maintainer', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 52,
          company_id: 1,
          role_name: 'Admin'
        }]
      });

      await expect(svc.addOperatorCategory(52, 5)).rejects.toEqual({
        status: 422,
        message: 'Operator is not a technical staff member or an external mainteiner'
      });
    });

    test('throws 422 when company does not manage category', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 53,
          company_id: 1,
          role_name: 'Technical office staff member'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: []
      });

      await expect(svc.addOperatorCategory(53, 99)).rejects.toEqual({
        status: 422,
        message: 'Company does not manage this category'
      });
    });

    test('throws 409 on unique constraint violation (category already assigned)', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 54,
          company_id: 1,
          role_name: 'Technical office staff member'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{}]
      });
      queryMock.mockRejectedValueOnce({
        code: '23505',
        message: 'duplicate key'
      });

      await expect(svc.addOperatorCategory(54, 5)).rejects.toEqual({
        status: 409,
        message: 'Operator already has this category'
      });
    });

    test('propagates unexpected DB errors', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 55,
          company_id: 1,
          role_name: 'Technical office staff member'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{}]
      });
      queryMock.mockRejectedValueOnce(new Error('Unexpected DB error'));

      await expect(svc.addOperatorCategory(55, 5)).rejects.toThrow('Unexpected DB error');
    });
  });

  describe('removeOperatorCategory', () => {
    test('removes category from technical staff member operator', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 60,
          role_name: 'Technical office staff member'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{ operator_id: 60 }]
      });

      const res = await svc.removeOperatorCategory(60, 7);
      expect(res).toEqual({ operator_id: 60, category_id: 7 });

      expect(queryMock).toHaveBeenCalledTimes(2);
    });

    test('removes category from external maintainer operator', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 61,
          role_name: 'External maintainer'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: [{ operator_id: 61 }]
      });

      const res = await svc.removeOperatorCategory(61, 4);
      expect(res).toEqual({ operator_id: 61, category_id: 4 });
    });

    test('throws 404 when operator not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(svc.removeOperatorCategory(999, 7)).rejects.toEqual({
        status: 404,
        message: 'Operator not found'
      });
    });

    test('throws 422 when operator is not technical staff or maintainer', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 62,
          role_name: 'Admin'
        }]
      });

      await expect(svc.removeOperatorCategory(62, 7)).rejects.toEqual({
        status: 422,
        message: 'Operator is not a technical staff member or an external mainteiner'
      });
    });

    test('throws 404 when operator-category association not found', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 63,
          role_name: 'Technical office staff member'
        }]
      });
      queryMock.mockResolvedValueOnce({
        rows: []
      });

      await expect(svc.removeOperatorCategory(63, 99)).rejects.toEqual({
        status: 404,
        message: 'Operator-category association not found'
      });
    });

    test('propagates DB errors', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{
          operator_id: 64,
          role_name: 'Technical office staff member'
        }]
      });
      queryMock.mockRejectedValueOnce(new Error('DELETE failed'));

      await expect(svc.removeOperatorCategory(64, 7)).rejects.toThrow('DELETE failed');
    });
  });
});