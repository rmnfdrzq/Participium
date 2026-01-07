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
  mockQuery.mockResolvedValue({ rows: [] });
  mockClientQuery.mockResolvedValue({ rows: [] });
  mockRelease.mockResolvedValue(undefined);
  mockConnect.mockResolvedValue(mockClient);
  getUserInfoByIdMock.mockResolvedValue(null);
});

describe('Report Service', () => {
  describe('insertReport', () => {
    test('success inserts report and photos and returns combined object', async () => {
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
        description: 'Large pothole on main street',
        latitude: 44.123,
        longitude: 11.456,
        anonymous: false,
        created_at: new Date('2024-01-01'),
      };

      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('FROM categories WHERE category_id')) return { rows: [{ office_id: 10 }] };
        if (text.includes('FROM statuses WHERE name')) return { rows: [{ status_id: statusId }] };
        if (text.includes('INSERT INTO reports')) return { rows: [reportRow] };
        if (text.includes('INSERT INTO photos')) return { rows: [] };
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const result = await reportsService.insertReport({
        title: reportRow.title,
        citizen_id,
        description: reportRow.description,
        image_urls: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg'],
        latitude: reportRow.latitude,
        longitude: reportRow.longitude,
        category_id: categoryId,
        anonymous: false,
      });

      expect(result.report_id).toBe(100);
      expect(result.citizen_id).toBe(citizen_id);
      expect(result.title).toBe(reportRow.title);
      expect(result.anonymous).toBe(false);
      expect(Array.isArray(result.images)).toBe(true);
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    });

    test('throws error when citizen not found', async () => {
      getUserInfoByIdMock.mockResolvedValue(null);

      await expect(reportsService.insertReport({
        title: 'Test',
        citizen_id: 999,
        description: 'Description',
        image_urls: [],
        latitude: 0,
        longitude: 0,
        category_id: 1,
        anonymous: false,
      })).rejects.toThrow('Citizen not found');
    });

    test('throws error when citizen is not verified', async () => {
      getUserInfoByIdMock.mockResolvedValue({ citizen_id: 1, verified: false });

      await expect(reportsService.insertReport({
        title: 'Test',
        citizen_id: 1,
        description: 'Description',
        image_urls: [],
        latitude: 0,
        longitude: 0,
        category_id: 1,
        anonymous: false,
      })).rejects.toThrow('Only verified citizens can submit reports');
    });

    test('throws error and rolls back when category is invalid', async () => {
      getUserInfoByIdMock.mockResolvedValue({ citizen_id: 1, verified: true });

      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('FROM categories WHERE category_id')) return { rows: [] };
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.insertReport({
        title: 'Test',
        citizen_id: 1,
        description: 'Description',
        image_urls: [],
        latitude: 0,
        longitude: 0,
        category_id: 999,
        anonymous: false,
      })).rejects.toThrow('Invalid category_id');

      const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
      expect(calledSqls.some(sql => typeof sql === 'string' && sql.startsWith('ROLLBACK'))).toBe(true);
    });

    test('throws error when status lookup fails', async () => {
      getUserInfoByIdMock.mockResolvedValue({ citizen_id: 1, verified: true });

      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('FROM categories WHERE category_id')) return { rows: [{ office_id: 5 }] };
        if (text.includes('FROM statuses WHERE name')) return { rows: [] };
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.insertReport({
        title: 'Test',
        citizen_id: 1,
        description: 'Description',
        image_urls: [],
        latitude: 0,
        longitude: 0,
        category_id: 1,
        anonymous: false,
      })).rejects.toThrow();

      const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
      expect(calledSqls.some(sql => typeof sql === 'string' && sql.startsWith('ROLLBACK'))).toBe(true);
    });

    test('handles anonymous flag correctly', async () => {
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

      expect(result.anonymous).toBe(true);
      expect(result.images).toEqual([]);
    });

    test('inserts multiple photos correctly', async () => {
      getUserInfoByIdMock.mockResolvedValue({ citizen_id: 3, verified: true });

      const reportRow = {
        report_id: 102,
        citizen_id: 3,
        category_id: 1,
        office_id: 5,
        status_id: 1,
        title: 'Report with photos',
        description: 'Multiple photos',
        latitude: 40.0,
        longitude: 10.0,
        anonymous: false,
        created_at: new Date(),
      };

      const photoInsertCalls = [];
      mockClientQuery.mockImplementation(async (text, params) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('FROM categories WHERE category_id')) return { rows: [{ office_id: 5 }] };
        if (text.includes('FROM statuses WHERE name')) return { rows: [{ status_id: 1 }] };
        if (text.includes('INSERT INTO reports')) return { rows: [reportRow] };
        if (text.includes('INSERT INTO photos')) {
          photoInsertCalls.push({ text, params });
          return { rows: [] };
        }
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      await reportsService.insertReport({
        title: reportRow.title,
        citizen_id: 3,
        description: reportRow.description,
        image_urls: ['url1.jpg', 'url2.jpg', 'url3.jpg'],
        latitude: reportRow.latitude,
        longitude: reportRow.longitude,
        category_id: 1,
        anonymous: false,
      });

      expect(photoInsertCalls.length).toBeGreaterThanOrEqual(3);
    });

    test('commits transaction on successful report insertion', async () => {
      getUserInfoByIdMock.mockResolvedValue({ citizen_id: 1, verified: true });

      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('FROM categories WHERE category_id')) return { rows: [{ office_id: 5 }] };
        if (text.includes('FROM statuses WHERE name')) return { rows: [{ status_id: 1 }] };
        if (text.includes('INSERT INTO reports')) return { rows: [{ report_id: 1 }] };
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      await reportsService.insertReport({
        title: 'Test',
        citizen_id: 1,
        description: 'Description',
        image_urls: [],
        latitude: 0,
        longitude: 0,
        category_id: 1,
        anonymous: false,
      });

      const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
      expect(calledSqls.some(sql => typeof sql === 'string' && sql.startsWith('COMMIT'))).toBe(true);
    });
  });

  describe('updateReportStatus', () => {
    test('returns null when report not found', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [] });

      const res = await reportsService.updateReportStatus(999, 2, null);

      expect(res).toBeNull();
      expect(mockClientQuery).toHaveBeenCalled();
    });

    test('returns mapped report when found', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.includes('SELECT status_id FROM reports')) {
          return { rows: [{ status_id: 1 }] };
        }
        if (text.includes('UPDATE reports')) {
          return { rows: [{ report_id: 100 }] };
        }
        if (text.includes('FROM reports r') && text.includes('WHERE r.report_id')) {
          return {
            rows: [{
              report_id: 100,
              title: 'Report',
              description: 'Description',
              latitude: 0,
              longitude: 0,
              anonymous: false,
              rejection_reason: null,
              created_at: new Date(),
              updated_at: new Date(),
              citizen_id: 1,
              citizen_username: 'user1',
              citizen_first_name: 'John',
              citizen_last_name: 'Doe',
              category_id: 1,
              category_name: 'Roads',
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

      const result = await reportsService.updateReportStatus(100, 2, null);

      expect(result).toBeDefined();
      expect(result.id).toBe(100);
      expect(result.status.name).toBe('Approved');
    });

    test('skips update when current status is 5 (resolved)', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.includes('SELECT status_id FROM reports')) {
          return { rows: [{ status_id: 5 }] };
        }
        if (text.includes('FROM reports r')) {
          return {
            rows: [{
              report_id: 200,
              title: 'Resolved',
              description: 'Desc',
              latitude: 0,
              longitude: 0,
              anonymous: false,
              rejection_reason: null,
              created_at: new Date(),
              updated_at: new Date(),
              citizen_id: 1,
              citizen_username: 'user1',
              citizen_first_name: 'John',
              citizen_last_name: 'Doe',
              category_id: 1,
              category_name: 'Roads',
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

      expect(result.status.id).toBe(5);
      const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
      const updateCalled = calledSqls.some(sql => typeof sql === 'string' && sql.includes('UPDATE reports'));
      expect(updateCalled).toBe(false);
    });

    test('skips update when current status is 6 (rejected)', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.includes('SELECT status_id FROM reports')) {
          return { rows: [{ status_id: 6 }] };
        }
        if (text.includes('FROM reports r')) {
          return {
            rows: [{
              report_id: 201,
              title: 'Rejected',
              description: 'Desc',
              latitude: 0,
              longitude: 0,
              anonymous: false,
              rejection_reason: 'Invalid',
              created_at: new Date(),
              updated_at: new Date(),
              citizen_id: 1,
              citizen_username: 'user1',
              citizen_first_name: 'John',
              citizen_last_name: 'Doe',
              category_id: 1,
              category_name: 'Roads',
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

      const result = await reportsService.updateReportStatus(201, 2, null);

      expect(result.status.id).toBe(6);
      const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
      const updateCalled = calledSqls.some(sql => typeof sql === 'string' && sql.includes('UPDATE reports'));
      expect(updateCalled).toBe(false);
    });

    test('sets rejection_reason when updating to rejected status', async () => {
      const rejectionReason = 'Invalid location data';

      mockClientQuery.mockImplementation(async (text, params) => {
        if (text.includes('SELECT status_id FROM reports')) {
          return { rows: [{ status_id: 2 }] };
        }
        if (text.includes('UPDATE reports')) {
          expect(params[2]).toBe(rejectionReason);
          return { rows: [{ report_id: 300 }] };
        }
        if (text.includes('FROM reports r')) {
          return {
            rows: [{
              report_id: 300,
              title: 'Report',
              description: 'Desc',
              latitude: 0,
              longitude: 0,
              anonymous: false,
              rejection_reason: rejectionReason,
              created_at: new Date(),
              updated_at: new Date(),
              citizen_id: 1,
              citizen_username: 'user1',
              citizen_first_name: 'John',
              citizen_last_name: 'Doe',
              category_id: 1,
              category_name: 'Roads',
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

      const result = await reportsService.updateReportStatus(300, 5, rejectionReason);

      expect(result.rejection_reason).toBe(rejectionReason);
      expect(result.status.name).toBe('Rejected');
    });

    test('allows status transitions from non-terminal states', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.includes('SELECT status_id FROM reports')) {
          return { rows: [{ status_id: 1 }] };
        }
        if (text.includes('UPDATE reports')) {
          return { rows: [{ report_id: 350 }] };
        }
        if (text.includes('FROM reports r')) {
          return {
            rows: [{
              report_id: 350,
              title: 'Report',
              description: 'Desc',
              latitude: 0,
              longitude: 0,
              anonymous: false,
              rejection_reason: null,
              created_at: new Date(),
              updated_at: new Date(),
              citizen_id: 1,
              citizen_username: 'user1',
              citizen_first_name: 'John',
              citizen_last_name: 'Doe',
              category_id: 1,
              category_name: 'Roads',
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

      const result = await reportsService.updateReportStatus(350, 2, null);

      expect(result.status.id).toBe(2);
      expect(result.status.name).toBe('Approved');
    });
  });

  describe('setOperatorByReport', () => {
    test('returns null when report not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportsService.setOperatorByReport(999, 5);

      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalled();
    });

    test('returns updated row when operator assigned', async () => {
      const updatedRow = {
        report_id: 100,
        assigned_to_operator_id: 5,
        title: 'Report',
        status_id: 2,
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await reportsService.setOperatorByReport(100, 5);

      expect(result).toEqual(updatedRow);
      expect(result.assigned_to_operator_id).toBe(5);
    });

    test('includes RETURNING clause with proper fields', async () => {
      const updatedRow = {
        report_id: 101,
        assigned_to_operator_id: 6,
        title: 'Test',
        status_id: 1,
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await reportsService.setOperatorByReport(101, 6);

      expect(result.report_id).toBeDefined();
      expect(result.assigned_to_operator_id).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.status_id).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    test('passes correct parameters to query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ report_id: 102 }] });

      await reportsService.setOperatorByReport(102, 7);

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toEqual([102, 7]);
    });
  });

  describe('setMainteinerByReport', () => {
    test('returns null when report not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportsService.setMainteinerByReport(999, 8);

      expect(result).toBeNull();
    });

    test('returns updated row when maintainer assigned', async () => {
      const updatedRow = {
        report_id: 150,
        assigned_to_external_id: 8,
        title: 'Report',
        status_id: 2,
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await reportsService.setMainteinerByReport(150, 8);

      expect(result).toEqual(updatedRow);
      expect(result.assigned_to_external_id).toBe(8);
    });

    test('assigns external maintainer correctly', async () => {
      const updatedRow = {
        report_id: 151,
        assigned_to_external_id: 9,
        title: 'External Work',
        status_id: 3,
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await reportsService.setMainteinerByReport(151, 9);

      expect(result.assigned_to_external_id).toBe(9);
    });

    test('passes correct parameters to query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ report_id: 152 }] });

      await reportsService.setMainteinerByReport(152, 10);

      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[1]).toEqual([152, 10]);
    });
  });

  describe('getAllReports', () => {
    test('returns empty array when no reports exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportsService.getAllReports();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('maps database rows to correct format', async () => {
      const dbRow = {
        report_id: 1,
        title: 'Pothole',
        description: 'Large hole in road',
        latitude: 44.0,
        longitude: 11.0,
        anonymous: false,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        citizen_id: 1,
        citizen_username: 'john',
        citizen_first_name: 'John',
        citizen_last_name: 'Doe',
        category_id: 1,
        category_name: 'Roads',
        office_id: 1,
        office_name: 'Public Works',
        status_id: 2,
        status_name: 'Approved',
        assigned_to_external_id: null,
        external_username: null,
        external_company_name: null,
        photos: [{ photo_id: 1, image_url: 'url1.jpg' }],
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await reportsService.getAllReports();

      expect(result[0]).toMatchObject({
        id: 1,
        title: 'Pothole',
        description: 'Large hole in road',
        latitude: 44.0,
        longitude: 11.0,
        anonymous: false,
        citizen: {
          id: 1,
          username: 'john',
          first_name: 'John',
          last_name: 'Doe',
        },
        category: {
          id: 1,
          name: 'Roads',
        },
        status: {
          id: 2,
          name: 'Approved',
        },
      });
    });

    test('sets citizen to null when citizen_id is null', async () => {
      const dbRow = {
        report_id: 2,
        title: 'Report',
        description: 'Desc',
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
        category_name: 'Cat',
        office_id: 1,
        office_name: 'Off',
        status_id: 1,
        status_name: 'Pending',
        assigned_to_external_id: null,
        external_username: null,
        external_company_name: null,
        photos: [],
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await reportsService.getAllReports();

      expect(result[0].citizen).toBeNull();
    });

    test('includes maintainer when assigned_to_external_id exists', async () => {
      const dbRow = {
        report_id: 3,
        title: 'Report',
        description: 'Desc',
        latitude: 0,
        longitude: 0,
        anonymous: false,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        citizen_id: 1,
        citizen_username: 'user1',
        citizen_first_name: 'John',
        citizen_last_name: 'Doe',
        category_id: 1,
        category_name: 'Cat',
        office_id: 1,
        office_name: 'Off',
        status_id: 2,
        status_name: 'In Progress',
        assigned_to_external_id: 5,
        external_username: 'maintainer',
        external_company_name: 'CompanyX',
        photos: [],
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await reportsService.getAllReports();

      expect(result[0].maintainer).toMatchObject({
        id: 5,
        username: 'maintainer',
        company: 'CompanyX',
      });
    });

    test('handles multiple reports', async () => {
      const rows = [
        {
          report_id: 1,
          title: 'R1',
          description: 'D1',
          latitude: 0,
          longitude: 0,
          anonymous: false,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 1,
          citizen_username: 'u1',
          citizen_first_name: 'F1',
          citizen_last_name: 'L1',
          category_id: 1,
          category_name: 'c1',
          office_id: 1,
          office_name: 'o1',
          status_id: 1,
          status_name: 's1',
          assigned_to_external_id: null,
          external_username: null,
          external_company_name: null,
          photos: [],
        },
        {
          report_id: 2,
          title: 'R2',
          description: 'D2',
          latitude: 1,
          longitude: 1,
          anonymous: false,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 2,
          citizen_username: 'u2',
          citizen_first_name: 'F2',
          citizen_last_name: 'L2',
          category_id: 2,
          category_name: 'c2',
          office_id: 2,
          office_name: 'o2',
          status_id: 2,
          status_name: 's2',
          assigned_to_external_id: null,
          external_username: null,
          external_company_name: null,
          photos: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const result = await reportsService.getAllReports();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  describe('getReportsAssigned', () => {
    test('returns empty array when no reports assigned', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportsService.getReportsAssigned(1);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('filters reports by operator_id', async () => {
      const rows = [
        {
          report_id: 1,
          title: 'R1',
          description: 'D1',
          latitude: 0,
          longitude: 0,
          anonymous: false,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 1,
          citizen_username: 'u1',
          citizen_first_name: 'F1',
          citizen_last_name: 'L1',
          category_id: 1,
          category_name: 'c1',
          office_id: 1,
          office_name: 'o1',
          status_id: 2,
          status_name: 's2',
          assigned_to_operator_id: 5,
          assigned_to_external_id: null,
          operator_username: 'op5',
          operator_email: 'op5@example.com',
          company_name: 'Comp',
          photos: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const result = await reportsService.getReportsAssigned(5);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('r.assigned_to_operator_id = $1 OR r.assigned_to_external_id = $1'), [5]);
      expect(result).toHaveLength(1);
      expect(result[0].assigned_to_operator).toMatchObject({
        id: 5,
        username: 'op5',
        email: 'op5@example.com',
      });
    });

    test('maps assigned_to_operator correctly', async () => {
      const rows = [
        {
          report_id: 10,
          title: 'Internal',
          description: 'D',
          latitude: 0,
          longitude: 0,
          anonymous: false,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 1,
          citizen_username: 'u1',
          citizen_first_name: 'F1',
          citizen_last_name: 'L1',
          category_id: 1,
          category_name: 'c1',
          office_id: 1,
          office_name: 'o1',
          status_id: 3,
          status_name: 's3',
          assigned_to_operator_id: 10,
          assigned_to_external_id: null,
          operator_username: 'internal_op',
          operator_email: 'internal@example.com',
          company_name: 'Internal',
          photos: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const result = await reportsService.getReportsAssigned(10);

      expect(result[0].assigned_to_operator).toBeDefined();
      expect(result[0].assigned_to_operator.id).toBe(10);
      expect(result[0].assigned_to_external).toBeNull();
    });

    test('maps assigned_to_external correctly', async () => {
      const rows = [
        {
          report_id: 11,
          title: 'External',
          description: 'D',
          latitude: 0,
          longitude: 0,
          anonymous: false,
          rejection_reason: null,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 1,
          citizen_username: 'u1',
          citizen_first_name: 'F1',
          citizen_last_name: 'L1',
          category_id: 1,
          category_name: 'c1',
          office_id: 1,
          office_name: 'o1',
          status_id: 2,
          status_name: 's2',
          assigned_to_operator_id: null,
          assigned_to_external_id: 20,
          operator_username: null,
          operator_email: null,
          company_name: null,
          photos: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const result = await reportsService.getReportsAssigned(20);

      expect(result[0].assigned_to_operator).toBeNull();
      expect(result[0].assigned_to_external).toBe(20);
    });
  });

  describe('getAllApprovedReports', () => {
    test('returns empty array when no approved reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportsService.getAllApprovedReports();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('filters only approved status codes 2, 3, 4', async () => {
      const rows = [
        {
          report_id: 1,
          title: 'R1',
          description: 'D1',
          latitude: 0,
          longitude: 0,
          anonymous: false,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 1,
          citizen_username: 'u1',
          citizen_first_name: 'F1',
          citizen_last_name: 'L1',
          category_id: 1,
          category_name: 'c1',
          office_id: 1,
          office_name: 'o1',
          status_id: 2,
          status_name: 'Approved',
          assigned_to_operator_id: null,
          assigned_to_external_id: null,
          operator_username: null,
          operator_email: null,
          external_operator_username: null,
          external_operator_email: null,
          external_company_name: null,
          photos: [],
        },
        {
          report_id: 2,
          title: 'R2',
          description: 'D2',
          latitude: 1,
          longitude: 1,
          anonymous: false,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 2,
          citizen_username: 'u2',
          citizen_first_name: 'F2',
          citizen_last_name: 'L2',
          category_id: 2,
          category_name: 'c2',
          office_id: 2,
          office_name: 'o2',
          status_id: 3,
          status_name: 'In Progress',
          assigned_to_operator_id: null,
          assigned_to_external_id: null,
          operator_username: null,
          operator_email: null,
          external_operator_username: null,
          external_operator_email: null,
          external_company_name: null,
          photos: [],
        },
        {
          report_id: 3,
          title: 'R3',
          description: 'D3',
          latitude: 2,
          longitude: 2,
          anonymous: false,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 3,
          citizen_username: 'u3',
          citizen_first_name: 'F3',
          citizen_last_name: 'L3',
          category_id: 3,
          category_name: 'c3',
          office_id: 3,
          office_name: 'o3',
          status_id: 4,
          status_name: 'Completed',
          assigned_to_operator_id: null,
          assigned_to_external_id: null,
          operator_username: null,
          operator_email: null,
          external_operator_username: null,
          external_operator_email: null,
          external_company_name: null,
          photos: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const result = await reportsService.getAllApprovedReports();

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE r.status_id IN (2, 3, 4)'));
      expect(result).toHaveLength(3);
      expect(result[0].status.id).toBe(2);
      expect(result[1].status.id).toBe(3);
      expect(result[2].status.id).toBe(4);
    });

    test('sets citizen to null when anonymous is true', async () => {
      const rows = [
        {
          report_id: 1,
          title: 'Anon',
          description: 'D',
          latitude: 0,
          longitude: 0,
          anonymous: true,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 99,
          citizen_username: 'anon_user',
          citizen_first_name: 'Anon',
          citizen_last_name: 'User',
          category_id: 1,
          category_name: 'c1',
          office_id: 1,
          office_name: 'o1',
          status_id: 2,
          status_name: 'Approved',
          assigned_to_operator_id: null,
          assigned_to_external_id: null,
          operator_username: null,
          operator_email: null,
          external_operator_username: null,
          external_operator_email: null,
          external_company_name: null,
          photos: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const result = await reportsService.getAllApprovedReports();

      expect(result[0].citizen).toBeNull();
    });

    test('includes citizen when anonymous is false', async () => {
      const rows = [
        {
          report_id: 1,
          title: 'Public',
          description: 'D',
          latitude: 0,
          longitude: 0,
          anonymous: false,
          created_at: new Date(),
          updated_at: new Date(),
          citizen_id: 1,
          citizen_username: 'user1',
          citizen_first_name: 'John',
          citizen_last_name: 'Doe',
          category_id: 1,
          category_name: 'c1',
          office_id: 1,
          office_name: 'o1',
          status_id: 2,
          status_name: 'Approved',
          assigned_to_operator_id: null,
          assigned_to_external_id: null,
          operator_username: null,
          operator_email: null,
          external_operator_username: null,
          external_operator_email: null,
          external_company_name: null,
          photos: [],
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const result = await reportsService.getAllApprovedReports();

      expect(result[0].citizen).toBeDefined();
      expect(result[0].citizen.id).toBe(1);
      expect(result[0].citizen.username).toBe('user1');
    });
  });

  describe('autoAssignMaintainer', () => {
    test('throws error when report not found', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [] };
        }
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.autoAssignMaintainer(999)).rejects.toThrow('Report non trovato');
    });

    test('skips maintainer assignment and returns result when maintainer already assigned', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 1, status_id: 2 }] };
        }
        if (text.includes('FROM operators o')) {
          return { rows: [{ operator_id: 11, username: 'maint', company_name: 'Co', assigned_reports_count: 1 }] };
        }
        if (text.includes('UPDATE reports')) {
          return { rows: [{ report_id: 103, assigned_to_external_id: 11, category_id: 1, title: 'Report', status_id: 2, updated_at: new Date() }] };
        }
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const result = await reportsService.autoAssignMaintainer(103);
      expect(result.report).toBeDefined();
    });

    test('throws error when no maintainer available for category', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 99, status_id: 1 }] };
        }
        if (text.includes('FROM operators o')) {
          return { rows: [] };
        }
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.autoAssignMaintainer(102)).rejects.toThrow('Nessun maintainer disponibile per la categoria');
    });

    test('releases client connection after use', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 1, status_id: 1 }] };
        }
        if (text.includes('FROM operators o')) {
          return { rows: [{ operator_id: 30, username: 'maint', company_name: 'Co', assigned_reports_count: 0 }] };
        }
        if (text.includes('UPDATE reports')) {
          return { rows: [{ report_id: 106, assigned_to_external_id: 30, category_id: 1, title: 'Report', status_id: 2, updated_at: new Date() }] };
        }
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      await reportsService.autoAssignMaintainer(106);
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('autoAssignTechnicalOfficer', () => {
    test('throws error when report not found', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [] };
        }
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.autoAssignTechnicalOfficer(999)).rejects.toThrow('Report non trovato');
    });

    test('throws error when report is not in pending approval', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 1, status_id: 2 }] };
        }
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.autoAssignTechnicalOfficer(200)).rejects.toThrow('Impossibile assegnare un technical officer a un report non in pending approval');
    });

    test('throws error when no officer available for category', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 99, status_id: 1 }] };
        }
        if (text.includes('FROM operators o')) {
          return { rows: [] };
        }
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.autoAssignTechnicalOfficer(201)).rejects.toThrow('Nessun technical officer disponibile per la categoria');
    });

    test('successfully assigns technical officer with least reports', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 1, status_id: 1 }] };
        }
        if (text.includes('FROM operators o')) {
          return {
            rows: [
              { operator_id: 41, username: 'officer2', email: 'off2@example.com', assigned_reports_count: 2 },
              { operator_id: 42, username: 'officer3', email: 'off3@example.com', assigned_reports_count: 3 },
              { operator_id: 40, username: 'officer1', email: 'off1@example.com', assigned_reports_count: 5 },
            ],
          };
        }
        if (text.includes('UPDATE reports')) {
          return { rows: [{ report_id: 202, assigned_to_operator_id: 41, category_id: 1, title: 'Report', status_id: 2, updated_at: new Date() }] };
        }
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const result = await reportsService.autoAssignTechnicalOfficer(202);

      expect(result.report).toBeDefined();
      expect(result.assigned_officer).toBeDefined();
      expect(result.assigned_officer.operator_id).toBe(41);
      expect(result.assigned_officer.username).toBe('officer2');
    });

    test('assigns status to 2 (Assigned)', async () => {
      mockClientQuery.mockImplementation(async (text, params) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('UPDATE reports')) {
          return { rows: [{ report_id: 203, assigned_to_operator_id: 50, category_id: 1, title: 'Report', status_id: 2, updated_at: new Date() }] };
        }
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 1, status_id: 1 }] };
        }
        if (text.includes('FROM operators o')) {
          return {
            rows: [
              { operator_id: 50, username: 'officer', email: 'off@example.com', assigned_reports_count: 0 },
            ],
          };
        }
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const result = await reportsService.autoAssignTechnicalOfficer(203);

      expect(result.report.status_id).toBe(2);
    });

    test('rolls back on error', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          throw new Error('Database error');
        }
        if (text.startsWith('ROLLBACK')) return { rows: [] };
        return { rows: [] };
      });

      await expect(reportsService.autoAssignTechnicalOfficer(204)).rejects.toThrow('Database error');

      const calledSqls = mockClientQuery.mock.calls.map(call => call[0]);
      expect(calledSqls.some(sql => typeof sql === 'string' && sql.startsWith('ROLLBACK'))).toBe(true);
    });

    test('releases client connection after assignment', async () => {
      mockClientQuery.mockImplementation(async (text) => {
        if (text.startsWith('BEGIN')) return { rows: [] };
        if (text.includes('WHERE report_id = $1')) {
          return { rows: [{ category_id: 1, status_id: 1 }] };
        }
        if (text.includes('FROM operators o')) {
          return { rows: [{ operator_id: 60, username: 'officer', email: 'off@example.com', assigned_reports_count: 0 }] };
        }
        if (text.includes('UPDATE reports')) {
          return { rows: [{ report_id: 205, assigned_to_operator_id: 60, category_id: 1, title: 'Report', status_id: 2, updated_at: new Date() }] };
        }
        if (text.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      await reportsService.autoAssignTechnicalOfficer(205);

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  // ===============================================
  // ANONYMOUS REPORT TESTS
  // ===============================================

  test('insertReport - creates anonymous report with citizen_id', async () => {
    // Arrange
    const citizen_id = 5;
    getUserInfoByIdMock.mockResolvedValue({ citizen_id, verified: true });

    const reportRow = {
      report_id: 150,
      citizen_id,
      category_id: 2,
      office_id: 8,
      status_id: 1,
      title: 'Anonymous Problem',
      description: 'Hidden issue',
      latitude: 41.5,
      longitude: 12.3,
      anonymous: true,
      created_at: new Date(),
    };

    mockClientQuery.mockImplementation(async (text, params) => {
      if (text.startsWith('BEGIN')) return { rows: [] };
      if (text.includes('FROM categories WHERE category_id')) return { rows: [{ office_id: 8 }] };
      if (text.includes('FROM statuses WHERE name')) return { rows: [{ status_id: 1 }] };
      if (text.includes('INSERT INTO reports')) return { rows: [reportRow] };
      if (text.startsWith('COMMIT')) return { rows: [] };
      return { rows: [] };
    });

    // Act
    const result = await reportsService.insertReport({
      title: reportRow.title,
      citizen_id,
      description: reportRow.description,
      image_urls: [],
      latitude: reportRow.latitude,
      longitude: reportRow.longitude,
      category_id: 2,
      anonymous: true,
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.report_id).toBe(150);
    expect(result.anonymous).toBe(true);
    expect(result.citizen_id).toBe(citizen_id);
  });

  test('getAllApprovedReports - masks citizen info when report is anonymous', async () => {
    // Arrange
    const anonRow = {
      report_id: 11,
      title: 'Hidden Report',
      description: 'Secret issue',
      latitude: 45.1,
      longitude: 9.1,
      anonymous: true,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: 25, // citizen exists but should be masked
      citizen_username: 'anonymous_user',
      citizen_first_name: 'John',
      citizen_last_name: 'Doe',
      category_id: 1,
      category_name: 'Organization',
      office_name: 'Organization Office',
      status_id: 2,
      status_name: 'Assigned',
      assigned_to_operator_id: null,
      assigned_to_external_id: null,
      operator_username: null,
      operator_email: null,
      external_operator_username: null,
      external_operator_email: null,
      external_company_name: null,
      photos: [],
    };
    mockQuery.mockResolvedValueOnce({ rows: [anonRow] });

    // Act
    const res = await reportsService.getAllApprovedReports();

    // Assert
    expect(res).toHaveLength(1);
    expect(res[0].anonymous).toBe(true);
    expect(res[0].citizen).toBeNull(); // citizen info must be null
    expect(res[0].status.name).toBe('Assigned');
  });

  test('getAllApprovedReports - correctly handles multiple anonymous and non-anonymous reports', async () => {
    // Arrange
    const rows = [
      {
        report_id: 12,
        title: 'Anonymous Report 1',
        description: 'D12',
        latitude: 0,
        longitude: 0,
        anonymous: true,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        citizen_id: 100,
        citizen_username: 'hidden1',
        citizen_first_name: 'H1',
        citizen_last_name: 'L1',
        category_id: 1,
        category_name: 'c1',
        office_name: 'o1',
        status_id: 2,
        status_name: 'Assigned',
        assigned_to_operator_id: null,
        assigned_to_external_id: null,
        operator_username: null,
        operator_email: null,
        external_operator_username: null,
        external_operator_email: null,
        external_company_name: null,
        photos: [],
      },
      {
        report_id: 13,
        title: 'Public Report',
        description: 'D13',
        latitude: 0,
        longitude: 0,
        anonymous: false,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        citizen_id: 101,
        citizen_username: 'public_user',
        citizen_first_name: 'P',
        citizen_last_name: 'User',
        category_id: 2,
        category_name: 'c2',
        office_name: 'o2',
        status_id: 3,
        status_name: 'In Progress',
        assigned_to_operator_id: null,
        assigned_to_external_id: null,
        operator_username: null,
        operator_email: null,
        external_operator_username: null,
        external_operator_email: null,
        external_company_name: null,
        photos: [],
      },
      {
        report_id: 14,
        title: 'Anonymous Report 2',
        description: 'D14',
        latitude: 0,
        longitude: 0,
        anonymous: true,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        citizen_id: 102,
        citizen_username: 'hidden2',
        citizen_first_name: 'H2',
        citizen_last_name: 'L2',
        category_id: 3,
        category_name: 'c3',
        office_name: 'o3',
        status_id: 4,
        status_name: 'Completed',
        assigned_to_operator_id: null,
        assigned_to_external_id: null,
        operator_username: null,
        operator_email: null,
        external_operator_username: null,
        external_operator_email: null,
        external_company_name: null,
        photos: [],
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    // Act
    const res = await reportsService.getAllApprovedReports();

    // Assert
    expect(res).toHaveLength(3);
    // First anonymous report
    expect(res[0].citizen).toBeNull();
    expect(res[0].anonymous).toBe(true);
    // Public report should show citizen info
    expect(res[1].citizen).not.toBeNull();
    expect(res[1].citizen.username).toBe('public_user');
    // Second anonymous report
    expect(res[2].citizen).toBeNull();
    expect(res[2].anonymous).toBe(true);
  });


  test('getAllReports - includes anonymous reports in list', async () => {
    // Arrange
    const anonRow = {
      report_id: 15,
      title: 'List Anonymous',
      description: 'Anon in list',
      latitude: 45.2,
      longitude: 9.2,
      anonymous: true,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      citizen_id: 30,
      citizen_username: 'citizen30',
      citizen_first_name: 'C',
      citizen_last_name: '30',
      category_id: 2,
      category_name: 'cat2',
      office_id: 5,
      office_name: 'office2',
      status_id: 2,
      status_name: 'Approved',
      assigned_to_external_id: null,
      external_username: null,
      external_company_name: null,
      photos: [],
    };
    mockQuery.mockResolvedValueOnce({ rows: [anonRow] });

    // Act
    const list = await reportsService.getAllReports();

    // Assert
    expect(list).toHaveLength(1);
    expect(list[0].anonymous).toBe(true);
    expect(list[0].id).toBe(15);
    expect(list[0].title).toBe('List Anonymous');
  });

});
