const { Pool } = require('pg');
const request = require('supertest');

describe('Story 8 - get reports assigned', () => {
    describe('DAO - some DAO description here', () => {

        let dao;
        let queryMock;
        let querySpy;

        beforeAll(async () => {
            queryMock = jest.fn();
            querySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation((...args) => queryMock(...args));
            dao = await import('../../dao.mjs');
        });

        afterAll(() => {
            querySpy && querySpy.mockRestore();
        });

        beforeEach(() => {
            queryMock.mockReset();
        });

        test('getReportsAssigned maps DB rows to API shape (with photos and citizen)', async () => {
            const sampleRow = {
                report_id: 101,
                title: 'Blocked drain',
                description: 'Drain clogged near park',
                latitude: 45.1,
                longitude: 9.1,
                anonymous: false,
                rejection_reason: null,
                created_at: '2024-05-01T12:00:00Z',
                updated_at: '2024-05-02T12:00:00Z',
                citizen_id: 7,
                citizen_username: 'alice',
                citizen_first_name: 'Alice',
                citizen_last_name: 'Smith',
                category_id: 3,
                category_name: 'Sewer System',
                office_id: 4,
                office_name: 'Sewage Department',
                status_id: 2,
                status_name: 'Assigned',
                photos: [{ photo_id: 55, image_url: 'photo1.png' }]
            };

            queryMock.mockResolvedValueOnce({ rows: [sampleRow] });

            const res = await dao.getReportsAssigned(301);
            expect(Array.isArray(res)).toBe(true);
            expect(res).toHaveLength(1);
            expect(res[0]).toMatchObject({
                id: 101,
                title: 'Blocked drain',
                description: 'Drain clogged near park',
                latitude: 45.1,
                longitude: 9.1,
                anonymous: false,
                rejection_reason: null,
                created_at: '2024-05-01T12:00:00Z',
                updated_at: '2024-05-02T12:00:00Z',
                citizen: { id: 7, username: 'alice', first_name: 'Alice', last_name: 'Smith' },
                category: { id: 3, name: 'Sewer System' },
                office: { id: 4, name: 'Sewage Department' },
                status: { id: 2, name: 'Assigned' },
                photos: sampleRow.photos
            });
        });

        test('getReportsAssigned returns null citizen when citizen_id is null and empty photos when photos falsy', async () => {
            const sampleRow = {
                report_id: 102,
                title: 'Anonymous report',
                description: 'No citizen info',
                latitude: 0,
                longitude: 0,
                anonymous: true,
                rejection_reason: null,
                created_at: null,
                updated_at: null,
                citizen_id: null,
                citizen_username: null,
                citizen_first_name: null,
                citizen_last_name: null,
                category_id: 1,
                category_name: 'Other',
                office_id: 1,
                office_name: 'General Services',
                status_id: 3,
                status_name: 'In Progress',
                photos: null
            };

            queryMock.mockResolvedValueOnce({ rows: [sampleRow] });

            const res = await dao.getReportsAssigned(302);
            expect(res[0].citizen).toBeNull();
            expect(res[0].photos).toEqual([]);
        });

        test('getReportsAssigned returns empty array when no assigned reports', async () => {
            queryMock.mockResolvedValueOnce({ rows: [] });
            const res = await dao.getReportsAssigned(999);
            expect(res).toEqual([]);
        });

        test('getReportsAssigned propagates DB error', async () => {
            const err = new Error('db fail');
            queryMock.mockRejectedValueOnce(err);
            await expect(dao.getReportsAssigned(123)).rejects.toThrow('db fail');
        });

    });
});