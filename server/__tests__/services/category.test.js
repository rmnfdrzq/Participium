const { Pool } = require('pg');

describe('services/category', () => {
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

  describe('getAllCategories', () => {
    test('returns mapped categories with all properties', async () => {
      const rows = [
        { category_id: 1, name: 'Noise', office: 'Main Office' },
        { category_id: 2, name: 'Potholes', office: 'Main Office' },
        { category_id: 3, name: 'Graffiti', office: 'Downtown' }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getAllCategories();

      expect(res).toEqual([
        { id: 1, name: 'Noise', office: 'Main Office' },
        { id: 2, name: 'Potholes', office: 'Main Office' },
        { id: 3, name: 'Graffiti', office: 'Downtown' }
      ]);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toMatch(/SELECT\s+\*\s+FROM\s+categories/i);
    });

    test('returns empty array when no categories exist', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getAllCategories();

      expect(res).toEqual([]);
      expect(Array.isArray(res)).toBe(true);
    });

    test('correctly maps category_id to id field', async () => {
      const rows = [{ category_id: 99, name: 'Test', office: 'Office' }];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getAllCategories();

      expect(res[0].id).toBe(99);
      expect(res[0].category_id).toBeUndefined();
    });

    test('preserves office field in mapping', async () => {
      const rows = [{ category_id: 1, name: 'Test', office: 'Special Office' }];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getAllCategories();

      expect(res[0].office).toBe('Special Office');
    });

    test('propagates database errors', async () => {
      const err = new Error('db failure');
      queryMock.mockRejectedValueOnce(err);

      await expect(svc.getAllCategories()).rejects.toBe(err);
    });

    test('handles null office field', async () => {
      const rows = [{ category_id: 1, name: 'Test', office: null }];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getAllCategories();

      expect(res[0].office).toBeNull();
    });
  });

  describe('getCompanyCategories', () => {
    test('returns mapped categories for a specific company', async () => {
      const rows = [
        { id: 1, name: 'Noise', office: 'Main' },
        { id: 3, name: 'Traffic', office: 'Main' }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getCompanyCategories(5);

      expect(res).toEqual([
        { id: 1, name: 'Noise', office: 'Main' },
        { id: 3, name: 'Traffic', office: 'Main' }
      ]);

      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toMatch(/company_categories/i);
      expect(params).toEqual([5]);
    });

    test('returns empty array when company has no categories', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getCompanyCategories(999);

      expect(res).toEqual([]);
    });

    test('passes company_id as parameter to query', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await svc.getCompanyCategories(42);

      const [, params] = queryMock.mock.calls[0];
      expect(params).toEqual([42]);
    });

    test('orders results by name', async () => {
      const rows = [
        { id: 1, name: 'Noise', office: 'Main' },
        { id: 3, name: 'Traffic', office: 'Main' }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      await svc.getCompanyCategories(1);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toMatch(/ORDER BY\s+c\.name/i);
    });

    test('handles multiple categories for company', async () => {
      const rows = [
        { id: 1, name: 'A', office: 'O1' },
        { id: 2, name: 'B', office: 'O2' },
        { id: 3, name: 'C', office: 'O3' },
        { id: 4, name: 'D', office: 'O4' }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getCompanyCategories(1);

      expect(res).toHaveLength(4);
      expect(res.map(c => c.id)).toEqual([1, 2, 3, 4]);
    });

    test('propagates database errors', async () => {
      const err = new Error('query error');
      queryMock.mockRejectedValueOnce(err);

      await expect(svc.getCompanyCategories(1)).rejects.toBe(err);
    });

    test('includes INNER JOIN in query', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await svc.getCompanyCategories(1);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toMatch(/INNER JOIN\s+company_categories/i);
    });
  });

  describe('getCategoriesByOperator', () => {
    test('returns category IDs for operator', async () => {
      const rows = [
        { category_id: 1 },
        { category_id: 3 },
        { category_id: 5 }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getCategoriesByOperator(10);

      expect(res).toEqual([1, 3, 5]);
      expect(Array.isArray(res)).toBe(true);

      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toMatch(/operator_categories/i);
      expect(params).toEqual([10]);
    });

    test('returns default [1] when operator has no categories', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getCategoriesByOperator(20);

      expect(res).toEqual([1]);
    });

    test('passes operator_id as parameter', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await svc.getCategoriesByOperator(7);

      const [, params] = queryMock.mock.calls[0];
      expect(params).toEqual([7]);
    });

    test('maps rows correctly to category_id values', async () => {
      const rows = [
        { category_id: 2 },
        { category_id: 4 }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getCategoriesByOperator(15);

      expect(res).toEqual([2, 4]);
      expect(res.every(id => typeof id === 'number')).toBe(true);
    });

    test('orders results by category_id', async () => {
      const rows = [
        { category_id: 5 },
        { category_id: 1 },
        { category_id: 3 }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      await svc.getCategoriesByOperator(1);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toMatch(/ORDER BY\s+category_id/i);
    });

    test('returns single category correctly', async () => {
      const rows = [{ category_id: 7 }];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getCategoriesByOperator(5);

      expect(res).toEqual([7]);
      expect(res.length).toBe(1);
    });

    test('returns multiple categories in correct order', async () => {
      const rows = [
        { category_id: 1 },
        { category_id: 2 },
        { category_id: 3 },
        { category_id: 4 }
      ];
      queryMock.mockResolvedValueOnce({ rows });

      const res = await svc.getCategoriesByOperator(1);

      expect(res).toHaveLength(4);
      expect(res).toEqual([1, 2, 3, 4]);
    });

    test('propagates database errors', async () => {
      const err = new Error('database error');
      queryMock.mockRejectedValueOnce(err);

      await expect(svc.getCategoriesByOperator(1)).rejects.toBe(err);
    });

    test('returns array even for single category', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ category_id: 10 }] });

      const res = await svc.getCategoriesByOperator(1);

      expect(Array.isArray(res)).toBe(true);
    });
  });
});