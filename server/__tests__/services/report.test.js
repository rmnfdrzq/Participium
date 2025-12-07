const { Pool } = require('pg');

describe('services/report - insertReport', () => {
  let svc;
  let connectSpy;
  let clientQuery;
  let client;

  beforeAll(async () => {
    svc = await import('../../services/report.mjs');
  });

  afterEach(() => {
    if (connectSpy) {
      connectSpy.mockRestore();
      connectSpy = null;
    }
    clientQuery && clientQuery.mockReset();
  });

  test('success: inserts report, images and commits', async () => {
    // prepare client query call sequence
    clientQuery = jest.fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ office_id: 7 }] }) // categorySql
      .mockResolvedValueOnce({ rows: [{ status_id: 99 }] }) // statusSql
      .mockResolvedValueOnce({ rows: [{ report_id: 123, citizen_id: 5, category_id: 1, office_id: 7, status_id: 99, title: 'T', description: 'desc', latitude: 1, longitude: 2, anonymous: false, created_at: '2025-01-01T00:00:00Z' }] }) // report INSERT
      .mockResolvedValueOnce({ rows: [{ photo_id: 9, report_id: 123, image_url: 'img.png', uploaded_at: '2025-01-01T00:00:00Z' }] }) // image insert (one url)
      .mockResolvedValueOnce({}); // COMMIT

    client = { query: clientQuery, release: jest.fn() };
    connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

    const input = {
      title: 'T',
      citizen_id: 5,
      description: 'desc',
      image_urls: ['img.png'],
      latitude: 1,
      longitude: 2,
      category_id: 1,
      anonymous: false
    };

    const res = await svc.insertReport(input);
    expect(res).toHaveProperty('report_id', 123);
    expect(Array.isArray(res.images)).toBe(true);
    expect(res.images[0]).toHaveProperty('image_url', 'img.png');

    expect(clientQuery).toHaveBeenCalled();
    expect(client.release).toHaveBeenCalled();
  });

  test('invalid category -> throws and rolls back', async () => {
    clientQuery = jest.fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // categorySql returns no rows
      .mockResolvedValueOnce({}); // ROLLBACK

    client = { query: clientQuery, release: jest.fn() };
    connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

    const input = {
      title: 'T',
      citizen_id: 5,
      description: 'desc',
      image_urls: ['img.png'],
      latitude: 1,
      longitude: 2,
      category_id: 9999,
      anonymous: false
    };

    await expect(svc.insertReport(input)).rejects.toThrow('Invalid category_id');

    // ensure ROLLBACK attempted and client released
    expect(clientQuery).toHaveBeenCalled();
    expect(client.release).toHaveBeenCalled();
  });

  test('image insert error -> rolls back and rethrows', async () => {
    clientQuery = jest.fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ office_id: 7 }] }) // categorySql
      .mockResolvedValueOnce({ rows: [{ status_id: 99 }] }) // statusSql
      .mockResolvedValueOnce({ rows: [{ report_id: 321, citizen_id: 5, category_id: 1, office_id: 7, status_id: 99, title: 'T', description: 'desc', latitude: 1, longitude: 2, anonymous: false, created_at: '2025-01-01T00:00:00Z' }] }) // report INSERT
      .mockRejectedValueOnce(new Error('image insert failed')) // fail on image insert
      .mockResolvedValueOnce({}); // ROLLBACK (after catch)

    client = { query: clientQuery, release: jest.fn() };
    connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

    const input = {
      title: 'T',
      citizen_id: 5,
      description: 'desc',
      image_urls: ['bad.png'],
      latitude: 1,
      longitude: 2,
      category_id: 1,
      anonymous: false
    };

    await expect(svc.insertReport(input)).rejects.toThrow('image insert failed');

    expect(clientQuery).toHaveBeenCalled();
    expect(client.release).toHaveBeenCalled();
  });
});