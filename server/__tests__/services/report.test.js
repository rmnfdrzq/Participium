const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();

const mockClient = {
  query: mockClientQuery,
  release: mockRelease,
};

mockConnect.mockResolvedValue(mockClient);

const MockPool = jest.fn().mockImplementation(() => ({
  query: mockQuery,
  connect: mockConnect,
}));

// Mock 'pg' and '../dao.mjs' before importing the module under test
jest.unstable_mockModule('pg', () => ({ Pool: MockPool }));
const getUserInfoByIdMock = jest.fn();
jest.unstable_mockModule('../../dao.mjs', () => ({ getUserInfoById: getUserInfoByIdMock }));

// Now import the module under test (dynamic import so mocks take effect)
let reportsService;
beforeAll(async () => {
  reportsService = await import('../../services/report.mjs');
});

beforeEach(() => {
  jest.clearAllMocks();
  // default: pool.query resolves to empty result to avoid accidental failures
  mockQuery.mockResolvedValue({ rows: [] });
  mockClientQuery.mockResolvedValue({ rows: [] });
  getUserInfoByIdMock.mockResolvedValue(null);
});

describe('report service unit tests', () => {
  test('insertReport - success inserts report and photos and returns combined object', async () => {
    // Arrange
    const citizen_id = 1;
    getUserInfoByIdMock.mockResolvedValue({ citizen_id, verified: true });

    const categoryId = 5;
    const statusId = 2;
    const reportRow = {
      report_id: 100,
      citizen_id,
      category_id: categoryId,
      office_id: 10,
      status_id: statusId,
      title: 'Pothole',
      description: 'Big pothole',
      latitude: 45.0,
      longitude: 9.0,
      anonymous: false,
      created_at: new Date(),
    };

    const imageUrls = ['http://img/1.jpg', 'http://img/2.jpg'];

    // Implementation of client.query mock to return appropriate responses based on SQL text
    mockClientQuery.mockImplementation(async (text, params) => {
      if (text.startsWith('BEGIN')) return { rows: [] };
      if (text.includes('FROM categories WHERE category_id')) {
        return { rows: [{ office_id: 10 }] };
      }
      if (text.includes('FROM statuses WHERE name')) {
        return { rows: [{ status_id: statusId }] };
      }
      if (text.includes('INSERT INTO reports')) {
        return { rows: [reportRow] };
      }
      if (text.includes('INSERT INTO photos')) {
        // simulate returning a photo row; params: [report_id, url]
        const url = params[1];
        return { rows: [{ photo_id: Math.floor(Math.random() * 1000), report_id: reportRow.report_id, image_url: url, uploaded_at: new Date() }] };
      }
      if (text.startsWith('COMMIT')) return { rows: [] };
      if (text.startsWith('ROLLBACK')) return { rows: [] };
      return { rows: [] };
    });

    // Act
    const result = await reportsService.insertReport({
      title: reportRow.title,
      citizen_id,
      description: reportRow.description,
      image_urls: imageUrls,
      latitude: reportRow.latitude,
      longitude: reportRow.longitude,
      category_id: categoryId,
      anonymous: false,
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.report_id).toBe(reportRow.report_id);
    expect(result.images).toHaveLength(imageUrls.length);
    expect(mockClientQuery).toHaveBeenCalled(); // ensure queries executed
    // ensure COMMIT called (last calls include COMMIT)
    const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
    expect(calledSqls.some(sql => typeof sql === 'string' && sql.startsWith('COMMIT'))).toBe(true);
  });

  test('insertReport - throws when citizen not found or not verified', async () => {
    // citizen not found
    getUserInfoByIdMock.mockResolvedValue(null);
    await expect(reportsService.insertReport({
      title: 't',
      citizen_id: 999,
      description: 'd',
      image_urls: [],
      latitude: 0,
      longitude: 0,
      category_id: 1,
      anonymous: false,
    })).rejects.toThrow('Citizen not found');

    // citizen found but not verified
    getUserInfoByIdMock.mockResolvedValue({ citizen_id: 999, verified: false });
    await expect(reportsService.insertReport({
      title: 't',
      citizen_id: 999,
      description: 'd',
      image_urls: [],
      latitude: 0,
      longitude: 0,
      category_id: 1,
      anonymous: false,
    })).rejects.toThrow('Only verified citizens can submit reports');
  });

  test('insertReport - throws and rolls back when category_id is invalid', async () => {
    getUserInfoByIdMock.mockResolvedValue({ citizen_id: 1, verified: true });

    mockClientQuery.mockImplementation(async (text) => {
      if (text.startsWith('BEGIN')) return { rows: [] };
      if (text.includes('FROM categories WHERE category_id')) return { rows: [] }; // triggers invalid category
      if (text.startsWith('ROLLBACK')) return { rows: [] };
      return { rows: [] };
    });

    await expect(reportsService.insertReport({
      title: 't',
      citizen_id: 1,
      description: 'd',
      image_urls: [],
      latitude: 0,
      longitude: 0,
      category_id: 99,
      anonymous: false,
    })).rejects.toThrow('Invalid category_id');

    const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
    expect(calledSqls.some(sql => typeof sql === 'string' && sql.startsWith('ROLLBACK'))).toBe(true);
  });

  test('insertReport - handles anonymous flag and no images', async () => {
    getUserInfoByIdMock.mockResolvedValue({ citizen_id: 2, verified: true });

    const reportRow = {
      report_id: 101,
      citizen_id: 2,
      category_id: 1,
      office_id: 5,
      status_id: 1,
      title: 'Anonymous Report',
      description: 'No photos',
      latitude: 40.0,
      longitude: 10.0,
      anonymous: true,
      created_at: new Date(),
    };

    mockClientQuery.mockImplementation(async (text) => {
      if (text.startsWith('BEGIN')) return { rows: [] };
      if (text.includes('FROM categories WHERE category_id')) return { rows: [{ office_id: 5 }] };
      if (text.includes('FROM statuses WHERE name')) return { rows: [{ status_id: 1 }] };
      if (text.includes('INSERT INTO reports')) return { rows: [reportRow] };
      if (text.startsWith('COMMIT')) return { rows: [] };
      if (text.startsWith('ROLLBACK')) return { rows: [] };
      return { rows: [] };
    });

    const result = await reportsService.insertReport({
      title: reportRow.title,
      citizen_id: 2,
      description: reportRow.description,
      image_urls: [],
      latitude: reportRow.latitude,
      longitude: reportRow.longitude,
      category_id: 1,
      anonymous: true,
    });

    expect(result.report_id).toBe(101);
    expect(result.anonymous).toBe(true);
    expect(result.images).toEqual([]);
  });

  test('insertReport - throws when status lookup fails', async () => {
    getUserInfoByIdMock.mockResolvedValue({ citizen_id: 3, verified: true });

    mockClientQuery.mockImplementation(async (text) => {
      if (text.startsWith('BEGIN')) return { rows: [] };
      if (text.includes('FROM categories WHERE category_id')) return { rows: [{ office_id: 5 }] };
      if (text.includes('FROM statuses WHERE name')) return { rows: [] }; // no status found
      if (text.startsWith('ROLLBACK')) return { rows: [] };
      return { rows: [] };
    });

    await expect(reportsService.insertReport({
      title: 't',
      citizen_id: 3,
      description: 'd',
      image_urls: [],
      latitude: 0,
      longitude: 0,
      category_id: 1,
      anonymous: false,
    })).rejects.toThrow();

    const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
    expect(calledSqls.some(sql => typeof sql === 'string' && sql.startsWith('ROLLBACK'))).toBe(true);
  });


  test('updateReportStatus - returns null when report not found', async () => {
    // client.query for check returns empty rows
    mockClientQuery.mockResolvedValueOnce({ rows: [] });
    const res = await reportsService.updateReportStatus(123, 2, null);
    expect(res).toBeNull();
  });

  test('updateReportStatus - skip update when current status is 5 and still return mapped report', async () => {
    // When current status is 5, the update block must be skipped.
    mockClientQuery.mockImplementation(async (text, params) => {
      if (text.includes('SELECT status_id FROM reports')) {
        return { rows: [{ status_id: 5 }] };
      }
      if (text.includes('FROM reports r') && text.includes('WHERE r.report_id = $1')) {
        return {
          rows: [{
            report_id: 200,
            title: 'Broken Light',
            description: 'Light not working',
            latitude: 0,
            longitude: 0,
            anonymous: false,
            rejection_reason: null,
            created_at: new Date(),
            updated_at: new Date(),
            citizen_id: 2,
            citizen_username: 'user2',
            citizen_first_name: 'First',
            citizen_last_name: 'Last',
            category_id: 3,
            category_name: 'Lighting',
            office_id: 4,
            office_name: 'Public Works',
            status_id: 5,
            status_name: 'Resolved',
            assigned_to_operator_id: null,
            operator_username: null,
            operator_email: null,
            assigned_to_external_id: null,
            external_operator_username: null,
            external_operator_email: null,
            external_company_name: null,
            photos: [],
          }],
        };
      }
      return { rows: [] };
    });

    const result = await reportsService.updateReportStatus(200, 3, null);
    expect(result).toBeDefined();
    expect(result.id).toBe(200);

    // Ensure that no UPDATE was executed
    const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
    const updateCalled = calledSqls.some(sql => typeof sql === 'string' && sql.includes('UPDATE reports') && sql.includes('SET status_id'));
    expect(updateCalled).toBe(false);
  });

  test('updateReportStatus - performs update when allowed and maps rejection_reason', async () => {
    const rejectionReason = 'Incomplete info';
    mockClientQuery.mockImplementation(async (text, params) => {
      if (text.includes('SELECT status_id FROM reports')) {
        return { rows: [{ status_id: 1 }] }; // current status allows update
      }
      if (text.includes('UPDATE reports')) {
        return { rows: [{ report_id: 300 }] }; // update succeeded
      }
      if (text.includes('FROM reports r') && text.includes('WHERE r.report_id = $1')) {
        return {
          rows: [{
            report_id: 300,
            title: 'Broken bench',
            description: 'bench',
            latitude: 1,
            longitude: 2,
            anonymous: false,
            rejection_reason: rejectionReason,
            created_at: new Date(),
            updated_at: new Date(),
            citizen_id: 10,
            citizen_username: 'citizen10',
            citizen_first_name: 'Name',
            citizen_last_name: 'Surname',
            category_id: 4,
            category_name: 'Furniture',
            office_id: 5,
            office_name: 'Maintenance',
            status_id: 5,
            status_name: 'Rejected',
            assigned_to_operator_id: null,
            operator_username: null,
            operator_email: null,
            assigned_to_external_id: null,
            external_operator_username: null,
            external_operator_email: null,
            external_company_name: null,
            photos: [],
          }],
        };
      }
      return { rows: [] };
    });

    const res = await reportsService.updateReportStatus(300, 5, rejectionReason);

    expect(res.id).toBe(300);
    expect(res.rejection_reason).toBe(rejectionReason);
    expect(res.status.id).toBe(5);

    const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
    const updateCalled = calledSqls.some(sql => typeof sql === 'string' && sql.includes('UPDATE reports') && sql.includes('SET status_id'));
    expect(updateCalled).toBe(true);
  });

  test('updateReportStatus - skip update when current status is 6 (rejected)', async () => {
    mockClientQuery.mockImplementation(async (text, params) => {
      if (text.includes('SELECT status_id FROM reports')) {
        return { rows: [{ status_id: 6 }] }; // rejected status
      }
      if (text.includes('FROM reports r') && text.includes('WHERE r.report_id = $1')) {
        return {
          rows: [{
            report_id: 400,
            title: 'Old report',
            description: 'desc',
            latitude: 0,
            longitude: 0,
            anonymous: false,
            rejection_reason: 'Already rejected',
            created_at: new Date(),
            updated_at: new Date(),
            citizen_id: null,
            citizen_username: null,
            citizen_first_name: null,
            citizen_last_name: null,
            category_id: 1,
            category_name: 'Cat',
            office_id: 1,
            office_name: 'Off',
            status_id: 6,
            status_name: 'Rejected',
            assigned_to_operator_id: null,
            operator_username: null,
            operator_email: null,
            assigned_to_external_id: null,
            external_operator_username: null,
            external_operator_email: null,
            external_company_name: null,
            photos: [],
          }],
        };
      }
      return { rows: [] };
    });

    const res = await reportsService.updateReportStatus(400, 2, null);
    expect(res.id).toBe(400);
    expect(res.status.id).toBe(6);

    const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
    const updateCalled = calledSqls.some(sql => typeof sql === 'string' && sql.includes('UPDATE reports') && sql.includes('SET status_id'));
    expect(updateCalled).toBe(false);
  });

  test('updateReportStatus - allows update to status 2 from status 1', async () => {
    const rejectionReason = null;
    mockClientQuery.mockImplementation(async (text, params) => {
      if (text.includes('SELECT status_id FROM reports')) {
        return { rows: [{ status_id: 1 }] }; // Pending Approval
      }
      if (text.includes('UPDATE reports')) {
        return { rows: [{ report_id: 350 }] };
      }
      if (text.includes('FROM reports r') && text.includes('WHERE r.report_id = $1')) {
        return {
          rows: [{
            report_id: 350,
            title: 'Report to approve',
            description: 'desc',
            latitude: 0,
            longitude: 0,
            anonymous: false,
            rejection_reason: null,
            created_at: new Date(),
            updated_at: new Date(),
            citizen_id: 11,
            citizen_username: 'user11',
            citizen_first_name: 'John',
            citizen_last_name: 'Doe',
            category_id: 2,
            category_name: 'Roads',
            office_id: 2,
            office_name: 'Transport',
            status_id: 2,
            status_name: 'Approved',
            assigned_to_operator_id: null,
            operator_username: null,
            operator_email: null,
            assigned_to_external_id: null,
            external_operator_username: null,
            external_operator_email: null,
            external_company_name: null,
            photos: [],
          }],
        };
      }
      return { rows: [] };
    });

    const res = await reportsService.updateReportStatus(350, 2, rejectionReason);
    expect(res.id).toBe(350);
    expect(res.status.id).toBe(2);
    expect(res.status.name).toBe('Approved');
  });

  test('updateReportStatus - sets rejection_reason when status is 5', async () => {
    const rejectionReason = 'Invalid location data';
    mockClientQuery.mockImplementation(async (text, params) => {
      if (text.includes('SELECT status_id FROM reports')) {
        return { rows: [{ status_id: 2 }] };
      }
      if (text.includes('UPDATE reports')) {
        // Verify rejection_reason is passed
        expect(params[2]).toBe(rejectionReason);
        return { rows: [{ report_id: 351 }] };
      }
      if (text.includes('FROM reports r') && text.includes('WHERE r.report_id = $1')) {
        return {
          rows: [{
            report_id: 351,
            title: 'Rejected report',
            description: 'desc',
            latitude: 0,
            longitude: 0,
            anonymous: false,
            rejection_reason: rejectionReason,
            created_at: new Date(),
            updated_at: new Date(),
            citizen_id: 12,
            citizen_username: 'user12',
            citizen_first_name: 'Jane',
            citizen_last_name: 'Smith',
            category_id: 1,
            category_name: 'Potholes',
            office_id: 1,
            office_name: 'Roads',
            status_id: 5,
            status_name: 'Rejected',
            assigned_to_operator_id: null,
            operator_username: null,
            operator_email: null,
            assigned_to_external_id: null,
            external_operator_username: null,
            external_operator_email: null,
            external_company_name: null,
            photos: [],
          }],
        };
      }
      return { rows: [] };
    });

    const res = await reportsService.updateReportStatus(351, 5, rejectionReason);
    expect(res.rejection_reason).toBe(rejectionReason);
    expect(res.status.name).toBe('Rejected');
  });

  test('setOperatorByReport - returns null if no row', async () => {
    // pool.query is mockQuery
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await reportsService.setOperatorByReport(1, 2);
    expect(res).toBeNull();
    expect(mockQuery).toHaveBeenCalled();
  });

  test('setOperatorByReport - returns row when update succeeds', async () => {
    const row = { report_id: 10, assigned_to_operator_id: 2, title: 't', status_id: 1, updated_at: new Date() };
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const res = await reportsService.setOperatorByReport(10, 2);
    expect(res).toEqual(row);
  });

  test('setMainteinerByReport - returns null when none updated and row when updated', async () => {
    // null case
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const r1 = await reportsService.setMainteinerByReport(5, 7);
    expect(r1).toBeNull();

    // success case
    const row = { report_id: 5, assigned_to_external_id: 7, title: 't', status_id: 1, updated_at: new Date() };
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const r2 = await reportsService.setMainteinerByReport(5, 7);
    expect(r2).toEqual(row);
  });

  test('getAllReports maps rows into expected shape', async () => {
    const sampleRow = {
      report_id: 1,
      title: 'A',
      description: 'B',
      latitude: 44,
      longitude: 11,
      anonymous: false,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: 2,
      citizen_username: 'u',
      citizen_first_name: 'f',
      citizen_last_name: 'l',
      category_id: 3,
      category_name: 'cat',
      office_id: 4,
      office_name: 'office',
      status_id: 2,
      status_name: 'Approved',
      assigned_to_external_id: null,
      external_username: null,
      external_company_name: null,
      photos: [{ photo_id: 10, image_url: 'u.jpg' }],
    };
    mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });

    const list = await reportsService.getAllReports();
    expect(Array.isArray(list)).toBe(true);
    expect(list[0]).toMatchObject({
      id: sampleRow.report_id,
      title: sampleRow.title,
      photos: sampleRow.photos,
      citizen: {
        id: sampleRow.citizen_id,
        username: sampleRow.citizen_username,
      },
    });
  });

  test('getAllReports returns empty array when no reports', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const list = await reportsService.getAllReports();
    expect(list).toEqual([]);
  });

  test('getAllReports handles null citizen when not anonymous', async () => {
    const rowNoCitizen = {
      report_id: 5,
      title: 'X',
      description: 'Y',
      latitude: 0,
      longitude: 0,
      anonymous: false,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: null,
      citizen_username: null,
      citizen_first_name: null,
      citizen_last_name: null,
      category_id: 1,
      category_name: 'c',
      office_id: 1,
      office_name: 'o',
      status_id: 1,
      status_name: 's',
      assigned_to_external_id: null,
      external_username: null,
      external_company_name: null,
      photos: [],
    };
    mockQuery.mockResolvedValueOnce({ rows: [rowNoCitizen] });
    const list = await reportsService.getAllReports();
    expect(list[0].citizen).toBeNull();
    expect(list[0].maintainer).toBeNull();
  });

  test('getAllReports includes maintainer when assigned_to_external_id exists', async () => {
    const rowWithMaintainer = {
      report_id: 6,
      title: 'T6',
      description: 'D6',
      latitude: 0,
      longitude: 0,
      anonymous: false,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: 3,
      citizen_username: 'c3',
      citizen_first_name: 'C',
      citizen_last_name: '3',
      category_id: 2,
      category_name: 'c2',
      office_id: 2,
      office_name: 'o2',
      status_id: 3,
      status_name: 's3',
      assigned_to_external_id: 8,
      external_username: 'external8',
      external_company_name: 'CompanyX',
      photos: [],
    };
    mockQuery.mockResolvedValueOnce({ rows: [rowWithMaintainer] });
    const list = await reportsService.getAllReports();
    expect(list[0].maintainer).toMatchObject({
      id: 8,
      username: 'external8',
      company: 'CompanyX',
    });
  });

  test('getAllApprovedReports filters statuses and maps citizen to null when anonymous', async () => {
    const anonRow = {
      report_id: 2,
      title: 'X',
      description: 'Y',
      latitude: 0,
      longitude: 0,
      anonymous: true,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: 99,
      citizen_username: 'an',
      citizen_first_name: 'A',
      citizen_last_name: 'N',
      category_id: 1,
      category_name: 'c',
      office_id: 1,
      office_name: 'o',
      status_id: 2,
      status_name: 'Approved',
      photos: [],
    };
    mockQuery.mockResolvedValueOnce({ rows: [anonRow] });

    const res = await reportsService.getAllApprovedReports();
    expect(res[0].citizen).toBeNull();
    expect(res[0].status.name).toBe('Approved');
  });

  test('getAllApprovedReports includes approved statuses 2, 3, 4', async () => {
    const rows = [
      { ...{ report_id: 7, title: 'R7', description: 'D7', latitude: 0, longitude: 0, anonymous: false, created_at: new Date(), updated_at: new Date(), citizen_id: 13, citizen_username: 'u13', citizen_first_name: 'F13', citizen_last_name: 'L13', category_id: 1, category_name: 'c1', office_id: 1, office_name: 'o1', status_id: 2, status_name: 'Approved', photos: [] } },
      { ...{ report_id: 8, title: 'R8', description: 'D8', latitude: 0, longitude: 0, anonymous: false, created_at: new Date(), updated_at: new Date(), citizen_id: 14, citizen_username: 'u14', citizen_first_name: 'F14', citizen_last_name: 'L14', category_id: 2, category_name: 'c2', office_id: 2, office_name: 'o2', status_id: 3, status_name: 'In Progress', photos: [] } },
      { ...{ report_id: 9, title: 'R9', description: 'D9', latitude: 0, longitude: 0, anonymous: false, created_at: new Date(), updated_at: new Date(), citizen_id: 15, citizen_username: 'u15', citizen_first_name: 'F15', citizen_last_name: 'L15', category_id: 3, category_name: 'c3', office_id: 3, office_name: 'o3', status_id: 4, status_name: 'Completed', photos: [] } },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const res = await reportsService.getAllApprovedReports();
    expect(res).toHaveLength(3);
    expect(res[0].status.id).toBe(2);
    expect(res[1].status.id).toBe(3);
    expect(res[2].status.id).toBe(4);
  });

  test('getReportsAssigned maps assigned operator and external correctly', async () => {
    const assignedRow = {
      report_id: 3,
      title: 'T',
      description: 'D',
      latitude: 0,
      longitude: 0,
      anonymous: false,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: 7,
      citizen_username: 'u7',
      citizen_first_name: 'F7',
      citizen_last_name: 'L7',
      category_id: 11,
      category_name: 'c11',
      office_id: 12,
      office_name: 'o12',
      status_id: 2,
      status_name: 'In Progress',
      assigned_to_operator_id: 99,
      assigned_to_external_id: null,
      operator_username: 'op99',
      operator_email: 'op@example.com',
      company_name: 'Comp',
      photos: [],
    };
    mockQuery.mockResolvedValueOnce({ rows: [assignedRow] });

    const res = await reportsService.getReportsAssigned(99);
    expect(res[0].assigned_to_operator).toMatchObject({
      id: 99,
      username: 'op99',
      company: 'Comp',
    });
  });

  test('getReportsAssigned handles external operator assignment', async () => {
    const externalRow = {
      report_id: 4,
      title: 'External',
      description: 'External work',
      latitude: 0,
      longitude: 0,
      anonymous: false,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: 8,
      citizen_username: 'u8',
      citizen_first_name: 'F8',
      citizen_last_name: 'L8',
      category_id: 12,
      category_name: 'c12',
      office_id: 13,
      office_name: 'o13',
      status_id: 3,
      status_name: 'In Progress',
      assigned_to_operator_id: null,
      assigned_to_external_id: 50,
      operator_username: null,
      operator_email: null,
      company_name: null,
      photos: [],
    };
    mockQuery.mockResolvedValueOnce({ rows: [externalRow] });

    const res = await reportsService.getReportsAssigned(50);
    expect(res[0].assigned_to_operator).toBeNull();
    expect(res[0].assigned_to_external).toBe(50);
  });
});
