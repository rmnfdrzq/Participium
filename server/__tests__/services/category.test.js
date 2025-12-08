const { Pool } = require('pg');

describe('services/category - getAllCategories', () => {
  let svc;
  let queryMock;
  let querySpy;

  beforeAll(async () => {
    queryMock = jest.fn();
    querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));
    svc = await import('../../services/category.mjs');
  });

  afterAll(() => {
    querySpy && querySpy.mockRestore();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  test('getAllCategories returns mapped categories', async () => {
    const rows = [{ category_id: 1, name: 'Noise', office_id: 2 }];
    queryMock.mockResolvedValueOnce({ rows });

    const res = await svc.getAllCategories();
    expect(res).toEqual([{ id: 1, name: 'Noise', office_id: 2 }]);

    const [sql] = queryMock.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+categories/i);
  });

  test('getAllCategories returns empty array when no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.getAllCategories();
    expect(res).toEqual([]);
  });

  test('getAllCategories propagates DB errors', async () => {
    const err = new Error('db failure');
    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getAllCategories()).rejects.toBe(err);
  });
});