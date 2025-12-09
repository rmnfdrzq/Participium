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

describe('services/report - getAllReports', () => {
  let svc;
  let querySpy;

  beforeAll(async () => {
    svc = await import('../../services/report.mjs');
  });

  afterEach(() => {
    if (querySpy) {
      querySpy.mockRestore();
      querySpy = null;
    }
  });

  test('success: returns all reports with related data', async () => {
    const mockRows = [
      {
        report_id: 1,
        title: 'Report 1',
        description: 'Desc 1',
        latitude: 10.5,
        longitude: 20.5,
        anonymous: false,
        rejection_reason: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        citizen_id: 100,
        citizen_username: 'john_doe',
        citizen_first_name: 'John',
        citizen_last_name: 'Doe',
        category_id: 1,
        category_name: 'Road',
        office_id: 1,
        office_name: 'Main Office',
        status_id: 2,
        status_name: 'Approved',
        assigned_to_external_id: 50,
        external_username: 'ext_user',
        external_company_name: 'CompanyA',
        photos: [{ photo_id: 1, image_url: 'photo1.png' }]
      }
    ];

    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: mockRows });

    const result = await svc.getAllReports();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      title: 'Report 1',
      citizen: { id: 100, username: 'john_doe' },
      category: { id: 1, name: 'Road' },
      maintainer: { id: 50, username: 'ext_user', company: 'CompanyA' },
      photos: [{ photo_id: 1, image_url: 'photo1.png' }]
    });

    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  test('returns empty array when no reports exist', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: [] });

    const result = await svc.getAllReports();

    expect(result).toEqual([]);
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  test('throws error on database failure', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockRejectedValue(new Error('DB error'));

    await expect(svc.getAllReports()).rejects.toThrow('DB error');
  });
});

describe('services/report - getReportsAssigned', () => {
  let svc;
  let querySpy;

  beforeAll(async () => {
    svc = await import('../../services/report.mjs');
  });

  afterEach(() => {
    if (querySpy) {
      querySpy.mockRestore();
      querySpy = null;
    }
  });

  test('success: returns reports assigned to operator', async () => {
    const mockRows = [
      {
        report_id: 10,
        title: 'Assigned Report',
        description: 'Desc',
        latitude: 5.5,
        longitude: 15.5,
        anonymous: false,
        rejection_reason: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z',
        citizen_id: 200,
        citizen_username: 'jane_doe',
        citizen_first_name: 'Jane',
        citizen_last_name: 'Doe',
        category_id: 2,
        category_name: 'Water',
        office_id: 2,
        office_name: 'Second Office',
        status_id: 3,
        status_name: 'In Progress',
        assigned_to_operator_id: 10,
        assigned_to_external_id: null,
        operator_username: 'operator1',
        operator_email: 'op1@example.com',
        company_id: 1,
        company_name: 'CompanyB',
        photos: []
      }
    ];

    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: mockRows });

    const result = await svc.getReportsAssigned(10);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 10,
      title: 'Assigned Report',
      assigned_to_operator: { id: 10, username: 'operator1', email: 'op1@example.com', company: 'CompanyB' },
      assigned_to_external: null
    });

    expect(querySpy).toHaveBeenCalledWith(expect.any(String), [10]);
  });

  test('returns empty array when no reports assigned', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: [] });

    const result = await svc.getReportsAssigned(999);

    expect(result).toEqual([]);
  });

  test('throws error on database failure', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockRejectedValue(new Error('Query failed'));

    await expect(svc.getReportsAssigned(10)).rejects.toThrow('Query failed');
  });
});

describe('services/report - updateReportStatus', () => {
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

  test('success: updates status and returns full report', async () => {
    const updateRow = { report_id: 5 };
    const selectRow = {
      report_id: 5,
      title: 'Updated Report',
      description: 'Desc',
      latitude: 10,
      longitude: 20,
      anonymous: false,
      rejection_reason: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z',
      citizen_id: 300,
      citizen_username: 'user3',
      citizen_first_name: 'User',
      citizen_last_name: 'Three',
      category_id: 3,
      category_name: 'Electric',
      office_id: 1,
      office_name: 'Office1',
      status_id: 4,
      status_name: 'Completed',
      assigned_to_operator_id: null,
      operator_username: null,
      operator_email: null,
      assigned_to_external_id: 20,
      external_operator_username: 'ext2',
      external_operator_email: 'ext2@example.com',
      external_company_name: 'ExtCo',
      photos: []
    };

    clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [updateRow] }) // UPDATE query
      .mockResolvedValueOnce({ rows: [selectRow] }); // SELECT query

    client = { query: clientQuery, release: jest.fn() };
    connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

    const result = await svc.updateReportStatus(5, 4);

    expect(result).toMatchObject({
      id: 5,
      title: 'Updated Report',
      status: { id: 4, name: 'Completed' },
      assigned_to_external: { id: 20, username: 'ext2', email: 'ext2@example.com', company: 'ExtCo' }
    });

    expect(clientQuery).toHaveBeenCalledTimes(2);
    expect(client.release).toHaveBeenCalled();
  });

  test('sets rejection_reason when status is Rejected (5)', async () => {
    const updateRow = { report_id: 7 };
    const selectRow = {
      report_id: 7,
      title: 'Rejected Report',
      description: 'Desc',
      latitude: 10,
      longitude: 20,
      anonymous: false,
      rejection_reason: 'Invalid content',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z',
      citizen_id: 400,
      citizen_username: 'user4',
      citizen_first_name: 'User',
      citizen_last_name: 'Four',
      category_id: 1,
      category_name: 'Road',
      office_id: 1,
      office_name: 'Office1',
      status_id: 5,
      status_name: 'Rejected',
      assigned_to_operator_id: null,
      operator_username: null,
      operator_email: null,
      assigned_to_external_id: null,
      external_operator_username: null,
      external_operator_email: null,
      external_company_name: null,
      photos: []
    };

    clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [updateRow] })
      .mockResolvedValueOnce({ rows: [selectRow] });

    client = { query: clientQuery, release: jest.fn() };
    connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

    const result = await svc.updateReportStatus(7, 5, 'Invalid content');

    expect(result.rejection_reason).toBe('Invalid content');
    expect(result.status.id).toBe(5);
  });

  test('returns null when report not found', async () => {
    clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [] }); // UPDATE returns no rows

    client = { query: clientQuery, release: jest.fn() };
    connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

    const result = await svc.updateReportStatus(9999, 2);

    expect(result).toBeNull();
    expect(client.release).toHaveBeenCalled();
  });

  test('throws error on database failure', async () => {
    clientQuery = jest.fn().mockRejectedValue(new Error('Update failed'));

    client = { query: clientQuery, release: jest.fn() };
    connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

    await expect(svc.updateReportStatus(5, 2)).rejects.toThrow('Update failed');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('services/report - getAllApprovedReports', () => {
  let svc;
  let querySpy;

  beforeAll(async () => {
    svc = await import('../../services/report.mjs');
  });

  afterEach(() => {
    if (querySpy) {
      querySpy.mockRestore();
      querySpy = null;
    }
  });

  test('success: returns only approved reports (status 2, 3, 4)', async () => {
    const mockRows = [
      {
        report_id: 20,
        title: 'Approved Report',
        description: 'Desc',
        latitude: 11,
        longitude: 22,
        anonymous: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        citizen_id: 500,
        citizen_username: 'user5',
        citizen_first_name: 'User',
        citizen_last_name: 'Five',
        category_id: 1,
        category_name: 'Road',
        office_id: 1,
        office_name: 'Office1',
        status_id: 2,
        status_name: 'Approved',
        photos: [{ photo_id: 10, image_url: 'photo10.png' }]
      }
    ];

    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: mockRows });

    const result = await svc.getAllApprovedReports();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 20,
      title: 'Approved Report',
      status: { id: 2, name: 'Approved' },
      citizen: { username: 'user5', first_name: 'User', last_name: 'Five' }
    });
  });

  test('hides citizen info for anonymous reports', async () => {
    const mockRows = [
      {
        report_id: 21,
        title: 'Anonymous Report',
        description: 'Desc',
        latitude: 11,
        longitude: 22,
        anonymous: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        citizen_id: 600,
        citizen_username: 'user6',
        citizen_first_name: 'User',
        citizen_last_name: 'Six',
        category_id: 1,
        category_name: 'Road',
        office_id: 1,
        office_name: 'Office1',
        status_id: 2,
        status_name: 'Approved',
        photos: []
      }
    ];

    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: mockRows });

    const result = await svc.getAllApprovedReports();

    expect(result[0].anonymous).toBe(true);
    expect(result[0].citizen).toBeNull();
  });

  test('throws error on database failure', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockRejectedValue(new Error('Query error'));

    await expect(svc.getAllApprovedReports()).rejects.toThrow('Query error');
  });
});

describe('services/report - setOperatorByReport', () => {
  let svc;
  let querySpy;

  beforeAll(async () => {
    svc = await import('../../services/report.mjs');
  });

  afterEach(() => {
    if (querySpy) {
      querySpy.mockRestore();
      querySpy = null;
    }
  });

  test('success: assigns operator to report', async () => {
    const mockResult = {
      rows: [{
        report_id: 30,
        assigned_to_operator_id: 15,
        title: 'Report 30',
        status_id: 2,
        updated_at: '2025-01-15T00:00:00Z'
      }]
    };

    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue(mockResult);

    const result = await svc.setOperatorByReport(30, 15);

    expect(result).toMatchObject({
      report_id: 30,
      assigned_to_operator_id: 15,
      title: 'Report 30'
    });

    expect(querySpy).toHaveBeenCalledWith(expect.any(String), [30, 15]);
  });

  test('returns null when report not found', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: [] });

    const result = await svc.setOperatorByReport(9999, 15);

    expect(result).toBeNull();
  });

  test('throws error on database failure', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockRejectedValue(new Error('Assignment failed'));

    await expect(svc.setOperatorByReport(30, 15)).rejects.toThrow('Assignment failed');
  });
});

describe('services/report - setMainteinerByReport', () => {
  let svc;
  let querySpy;

  beforeAll(async () => {
    svc = await import('../../services/report.mjs');
  });

  afterEach(() => {
    if (querySpy) {
      querySpy.mockRestore();
      querySpy = null;
    }
  });

  test('success: assigns maintainer to report', async () => {
    const mockResult = {
      rows: [{
        report_id: 40,
        assigned_to_external_id: 25,
        title: 'Report 40',
        status_id: 3,
        updated_at: '2025-01-20T00:00:00Z'
      }]
    };

    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue(mockResult);

    const result = await svc.setMainteinerByReport(40, 25);

    expect(result).toMatchObject({
      report_id: 40,
      assigned_to_external_id: 25,
      title: 'Report 40'
    });

    expect(querySpy).toHaveBeenCalledWith(expect.any(String), [40, 25]);
  });

  test('returns null when report not found', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockResolvedValue({ rows: [] });

    const result = await svc.setMainteinerByReport(9999, 25);

    expect(result).toBeNull();
  });

  test('throws error on database failure', async () => {
    querySpy = jest.spyOn(Pool.prototype, 'query').mockRejectedValue(new Error('Maintainer assignment failed'));

    await expect(svc.setMainteinerByReport(40, 25)).rejects.toThrow('Maintainer assignment failed');
  });
});