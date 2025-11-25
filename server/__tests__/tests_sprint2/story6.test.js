const { Pool } = require('pg');
const request = require('supertest');

describe('Story 6 - get all reports, getTechnicalOfficersByOffice', () => {
    describe('DAO - get all reports', () => {
        let dao;
        let querySpy;
        let queryMock;

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

        test('getAllReports maps DB rows to API shape (with photos)', async () => {
            const sampleRow = {
                report_id: 1,
                title: 'Pothole',
                description: 'Big pothole',
                latitude: 45.0,
                longitude: 9.0,
                anonymous: false,
                rejection_reason: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                citizen_id: 3,
                citizen_username: 'jdoe',
                citizen_first_name: 'John',
                citizen_last_name: 'Doe',
                category_id: 7,
                category_name: 'Roads',
                office_id: 2,
                office_name: 'Public Works',
                status_id: 2,
                status_name: 'Assigned',
                photos: [{ photo_id: 9, image_url: 'img1.png' }]
            };

            queryMock.mockResolvedValueOnce({ rows: [sampleRow] });

            const res = await dao.getAllReports();

            expect(Array.isArray(res)).toBe(true);
            expect(res).toHaveLength(1);
            expect(res[0]).toMatchObject({
                id: 1,
                title: 'Pothole',
                description: 'Big pothole',
                latitude: 45.0,
                longitude: 9.0,
                anonymous: false,
                rejection_reason: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                citizen: { id: 3, username: 'jdoe', first_name: 'John', last_name: 'Doe' },
                category: { id: 7, name: 'Roads' },
                office: { id: 2, name: 'Public Works' },
                status: { id: 2, name: 'Assigned' },
                photos: sampleRow.photos
            });
        });

        test('getAllReports returns empty photos array when photos is falsy', async () => {
            const sampleRow = {
                report_id: 2,
                title: 'NoPhoto',
                description: 'No photos here',
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
                office_name: 'Office A',
                status_id: 1,
                status_name: 'Pending',
                photos: null
            };

            queryMock.mockResolvedValueOnce({ rows: [sampleRow] });

            const res = await dao.getAllReports();
            expect(res[0].photos).toEqual([]);
            expect(res[0].citizen).toBeNull();
        });

        test('getAllReports propagates DB errors', async () => {
            queryMock.mockRejectedValueOnce(new Error('db failure'));
            await expect(dao.getAllReports()).rejects.toThrow('db failure');
        });


        test('getTechnicalOfficersByOffice: throws when officerId not found', async () => {
            queryMock.mockResolvedValueOnce({ rows: [] });

            await expect(dao.getTechnicalOfficersByOffice(999, undefined))
                .rejects.toThrow('Either valid officer_id or office_id must be provided');
        });

        test('getTechnicalOfficersByOffice: throws when officer is not municipal relations officer', async () => {
            const officerRow = { operator_id: 1, email: 'off@x', username: 'off', office_id: 10, role_id: 42 };
            queryMock
                .mockResolvedValueOnce({ rows: [officerRow] })
                .mockResolvedValueOnce({ rows: [] });

            await expect(dao.getTechnicalOfficersByOffice(officerRow.operator_id, undefined))
                .rejects.toThrow('Operatot not allowed, he is not a Municipal public relations officer');
        });

        test('getTechnicalOfficersByOffice: returns technical officers when called with officerId', async () => {
            const officerRow = { operator_id: 1, email: 'off@x', username: 'off', office_id: 10, role_id: 2 };
            const operatorRoleRow = { role_id: 2 };
            const techRows = [
                { operator_id: 2, email: 'tec1@x', username: 'tec1', office_id: 10 },
                { operator_id: 3, email: 'tec2@x', username: 'tec2', office_id: 10 }
            ];

            queryMock
                .mockResolvedValueOnce({ rows: [officerRow] })
                .mockResolvedValueOnce({ rows: [operatorRoleRow] })
                .mockResolvedValueOnce({ rows: techRows });

            const res = await dao.getTechnicalOfficersByOffice(officerRow.operator_id, undefined);
            expect(res).toEqual([
                { id: 2, email: 'tec1@x', username: 'tec1', office_id: 10 },
                { id: 3, email: 'tec2@x', username: 'tec2', office_id: 10 }
            ]);
        });

        test('getTechnicalOfficersByOffice: returns technical officers when called with officeId only', async () => {
            const techRows = [
                { operator_id: 4, email: 'tec3@x', username: 'tec3', office_id: 20 }
            ];

            queryMock.mockResolvedValueOnce({ rows: techRows }); // sqlGetTechnicalOfficers using officeId

            const res = await dao.getTechnicalOfficersByOffice(undefined, 20);
            expect(res).toEqual([{ id: 4, email: 'tec3@x', username: 'tec3', office_id: 20 }]);
        });

        test('getTechnicalOfficersByOffice: throws when neither officerId nor officeId provided', async () => {
            await expect(dao.getTechnicalOfficersByOffice(undefined, undefined))
                .rejects.toThrow('officer_id or office_id must be provided');
        });
    });
});