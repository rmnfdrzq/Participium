const { Pool } = require('pg');

describe('services/role - getAllRoles', () => {
  let svc;
  let queryMock;
  let querySpy;

  beforeAll(async () => {
    queryMock = jest.fn();
    querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));
    svc = await import('../../services/role.mjs');
  });

  afterAll(() => {
    querySpy && querySpy.mockRestore();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  test('getAllRoles returns mapped roles', async () => {
    const rows = [
      { role_id: 1, name: 'municipality_user' },
      { role_id: 2, name: 'technical_officer' },
    ];
    queryMock.mockResolvedValueOnce({ rows });

    const res = await svc.getAllRoles();
    expect(res).toEqual([
      { id: 1, name: 'municipality_user' },
      { id: 2, name: 'technical_officer' },
    ]);

    const [sql] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+roles/i);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  test('getAllRoles returns empty array when no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.getAllRoles();
    expect(res).toEqual([]);
  });

  test('getAllRoles ignores extra columns and passes no params', async () => {
    const rows = [{ role_id: 3, name: 'maintainer', extra: 'ignore-me' }];
    queryMock.mockResolvedValueOnce({ rows });

    const res = await svc.getAllRoles();

    expect(res).toEqual([{ id: 3, name: 'maintainer' }]);
    expect(queryMock).toHaveBeenCalledWith(expect.stringMatching(/SELECT\s+\*\s+FROM\s+roles/i));
    // Pool.query should be invoked without parameters for this statement
    const [, params] = queryMock.mock.calls[0];
    expect(params).toBeUndefined();
  });

  test('getAllRoles propagates DB errors', async () => {
    const err = new Error('db failure');
    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getAllRoles()).rejects.toBe(err);
  });
});