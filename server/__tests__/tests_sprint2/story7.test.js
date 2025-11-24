const { Pool } = require('pg');
const request = require('supertest');

describe('Story 7 - Approved reports (DAO + API)', () => {
  describe('DAO - getAllApprovedReports', () => {
    let dao;
    let queryMock;
    let poolQuerySpy;

    beforeAll(async () => {
      queryMock = jest.fn();
      poolQuerySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation(function (...args) {
        return queryMock(...args);
      });

      dao = await import('../../dao.mjs');
    });

    afterAll(() => {
      poolQuerySpy && poolQuerySpy.mockRestore();
    });

    beforeEach(() => {
      queryMock.mockReset();
    });

    test('returns empty array when no approved reports', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });
      const res = await dao.getAllApprovedReports();
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });
/*
    test('maps rows and hides citizen when anonymous', async () => {
      const rows = [{
        report_id: 1,
        title: 'Pothole',
        description: 'Hole in road',
        latitude: 12.34,
        longitude: 56.78,
        anonymous: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        citizen_id: 10,
        citizen_username: 'jdoe',
        citizen_first_name: 'John',
        citizen_last_name: 'Doe',
        category_id: 2,
        category_name: 'Roads',
        office_id: 3,
        office_name: 'Public Works',
        status_id: 3,
        status_name: 'In Progress',
        photos: []
      }];

      queryMock.mockResolvedValueOnce({ rows });

      const res = await dao.getAllApprovedReports();
      expect(res.length).toBe(1);
      expect(res[0]).toHaveProperty('id', 1);
      // when anonymous true, citizen should be null
      expect(res[0].citizen).toBeNull();
      expect(res[0].category).toEqual({ id: 2, name: 'Roads' });
      expect(res[0].office).toEqual({ id: 3, name: 'Public Works' });
    });
*/
    test('returns citizen info', async () => { // when anonymous false
      const rows = [{
        report_id: 2,
        title: 'Broken light',
        description: 'Streetlight off',
        latitude: 1,
        longitude: 2,
        anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        citizen_id: 20,
        citizen_username: 'asmith',
        citizen_first_name: 'Alice',
        citizen_last_name: 'Smith',
        category_id: 4,
        category_name: 'Lighting',
        office_id: 5,
        office_name: 'Lighting Department',
        status_id: 2,
        status_name: 'Assigned',
        photos: [{ photo_id: 7, image_url: 'u.png' }]
      }];

      queryMock.mockResolvedValueOnce({ rows });

      const res = await dao.getAllApprovedReports();
      expect(res.length).toBe(1);
      expect(res[0].citizen).toEqual({ username: 'asmith', first_name: 'Alice', last_name: 'Smith' });
      expect(res[0].photos).toEqual(rows[0].photos);
    });
  });

  describe('API - GET /api/reports/approved', () => {
    // mock express to capture server like other tests
    beforeAll(() => {
      jest.resetModules();
      jest.mock('express', () => {
        const realExpress = jest.requireActual('express');
        const expressFn = (...args) => {
          const app = realExpress(...args);
          const realListen = app.listen.bind(app);
          app.listen = (port, cb) => {
            const server = realListen(port, cb);
            global.__TEST_SERVER__ = server;
            return server;
          };
          return app;
        };
        Object.assign(expressFn, { json: realExpress.json, urlencoded: realExpress.urlencoded, Router: realExpress.Router, static: realExpress.static });
        return expressFn;
      });

      // mock pg to satisfy imports (index.mjs expects pg indirectly via dao but safe)
      jest.mock('pg', () => {
        const mQuery = jest.fn();
        const Pool = jest.fn().mockImplementation(() => ({ query: mQuery }));
        return { Pool, __queryMock: mQuery };
      });
    });

    afterAll(async () => {
      if (global.__TEST_SERVER__ && typeof global.__TEST_SERVER__.close === 'function') {
        await new Promise((r) => global.__TEST_SERVER__.close(r));
        global.__TEST_SERVER__ = undefined;
      }
      jest.restoreAllMocks();
    });

    test('GET /api/reports/approved returns approved reports (public)', async () => {
      // mock dao module by providing stubs for all commonly-used exports and overriding getAllApprovedReports
      await jest.unstable_mockModule('../../dao.mjs', () => {
        return {
          getTechnicalOfficersByOffice: async () => [],
          getUser: async () => null,
          getOperators: async () => false,
          createUser: async () => ({ id: 1, username: 'u' }),
          getAllOffices: async () => [],
          createMunicipalityUser: async () => ({ id: 2, username: 'op' }),
          getAllOperators: async () => [],
          getAllRoles: async () => [],
          getAllCategories: async () => [],
          insertReport: async () => ({ report_id: 1 }),
          getAllReports: async () => [],
          updateReportStatus: async () => ({}),
          getAllApprovedReports: async () => ([{ id: 99, title: 'Test approved', latitude: 0, longitude: 0, anonymous: false }]),
          getApprovedReports: async () => []
        };
      });

      // mock supabase client used by index.mjs
      await jest.unstable_mockModule('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { from: () => ({ createSignedUploadUrl: async () => ({ data: { signedUrl: 'ok' }, error: null }) }) } }) }));

      // import index (will start server and attach to global.__TEST_SERVER__)
      await import('../../index.mjs');

      const res = await request('http://localhost:3001').get('/api/reports/approved');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('id', 99);
    });
  });
});
