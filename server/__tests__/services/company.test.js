const { Pool } = require('pg');

describe('services/company - getAllCompanies', () => {
  let svc;
  let queryMock;
  let querySpy;

  beforeAll(async () => {
    queryMock = jest.fn();
    querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));
    svc = await import('../../services/company.mjs');
  });

  afterAll(() => {
    querySpy && querySpy.mockRestore();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  test('getAllCompanies returns mapped companies', async () => {
    const rows = [{ company_id: 1, name: 'FixCo', description: 'Repairs' }];
    queryMock.mockResolvedValueOnce({ rows });

    const res = await svc.getAllCompanies();
    expect(res).toEqual([{ id: 1, name: 'FixCo', description: 'Repairs' }]);

    const [sql] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+companies/i);
  });

  test('getAllCompanies returns empty array when no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.getAllCompanies();
    expect(res).toEqual([]);
  });

  test('getAllCompanies propagates DB errors', async () => {
    const err = new Error('db fail');
    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getAllCompanies()).rejects.toBe(err);
  });
});