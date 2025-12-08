const { Pool } = require('pg');

describe('services/office - getAllOffices', () => {
  let svc;
  let queryMock;
  let querySpy;

  beforeAll(async () => {
    queryMock = jest.fn();
    querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));
    svc = await import('../../services/office.mjs');
  });

  afterAll(() => {
    querySpy && querySpy.mockRestore();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  test('getAllOffices returns mapped offices', async () => {
    const rows = [{ office_id: 1, name: 'Office A' }, { office_id: 2, name: 'Office B' }];
    queryMock.mockResolvedValueOnce({ rows });

    const res = await svc.getAllOffices();
    expect(res).toEqual([
      { id: 1, name: 'Office A' },
      { id: 2, name: 'Office B' }
    ]);

    const [sql] = queryMock.mock.calls[0];
  });

  test('getAllOffices returns empty array when no rows', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await svc.getAllOffices();
    expect(res).toEqual([]);
  });

  test('getAllOffices propagates DB errors', async () => {
    const err = new Error('db failure');
    queryMock.mockRejectedValueOnce(err);
    await expect(svc.getAllOffices()).rejects.toBe(err);
  });
});