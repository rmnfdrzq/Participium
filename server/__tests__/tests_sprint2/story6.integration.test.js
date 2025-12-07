const request = require('supertest');
const crypto = require('crypto');

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
    Object.assign(expressFn, {
        json: realExpress.json,
        urlencoded: realExpress.urlencoded,
        Router: realExpress.Router,
        static: realExpress.static,
    });
    return expressFn;
});

jest.mock('pg', () => {
    const mQuery = jest.fn();
    const Pool = jest.fn().mockImplementation(() => ({ query: mQuery }));
    return { Pool, __queryMock: mQuery };
});

describe('Reports Integration Tests (Mocked)', () => {
    let agent;
    let dao;
    let supabase; 
    let mockCreateSignedUploadUrl; 


    beforeAll(async () => {
        jest.resetModules();
        process.env.SUPABASE_BUCKET = 'participium';
        process.env.SUPABASE_URL = 'https://supabase.test';

        await jest.unstable_mockModule('../../dao.mjs', () => {
            return {
                getUser: jest.fn(async (username, password) => {
                    if (password !== 'correct') return null;

                    switch (username) {
                        case 'admin':
                            return { username: 'admin', role: 'Admin', id: 900 };
                        case 'operator':
                            return { username: 'operator', role: 'Municipal public relations officer', id: 201 };
                        case 'tech':
                            return { username: 'tech', role: 'Technical office staff member', id: 301 };
                        case 'citizen':
                            return { username: 'citizen', role: 'User', id: 555 };
                        default:
                            return null;
                    }
                }),
                
                getUserInfoById: jest.fn(async (id) => {
                    if (id === 900) return { user_id: 900, username: 'admin', role: 'Admin' };
                    if (id === 201) return { user_id: 201, username: 'operator', role: 'Operator' };
                    if (id === 301) return { user_id: 301, username: 'tech', role: 'Technical office staff member' };
                    if (id === 555) return { user_id: 555, username: 'citizen', role: 'User' };
                    return null;
                }),

                getAllReports: jest.fn(async () => [
                    { report_id: 1, description: 'Test report', status_id: 1, citizen_id: 555 }
                ]),

                updateReportStatus: jest.fn(async (reportId, status_id, rejection_reason) => {
                    if (String(reportId) === '999999') return null; 
                    return { report_id: parseInt(reportId), status_id, rejection_reason };
                }),

                setOperatorByReport: jest.fn(async (reportId, operatorId) => {
                    if (String(reportId) === '999999') return null;
                    return { report_id: parseInt(reportId), operator_id: operatorId };
                }),

                getReportsAssigned: jest.fn(async (operatorId) => {
                    if (operatorId === 301) {
                        return [
                            { report_id: 1, description: 'Assigned report', status_id: 2, operator_id: 301 }
                        ];
                    }
                    return [];
                }),

                createUser: jest.fn(),
                getAllOffices: jest.fn(async () => []),
                createMunicipalityUser: jest.fn(),
                getAllOperators: jest.fn(async () => []),
                getAllRoles: jest.fn(async () => []),
                getAllCategories: jest.fn(async () => []),
                insertReport: jest.fn(),
                getTechnicalOfficersByOffice: jest.fn(),
                getAllApprovedReports: jest.fn(),
                updateUserById: jest.fn(),
                getAllCompanies: jest.fn(async () => [{id:1, name: "Participium"},{id:2, name: "Enel"}] ),
                getMainteinerByOffice:jest.fn (async (office_id) => [{id:3,name:"Mario", company:"Enel"}]),
                setMainteinerByReport: jest.fn( async (report_id, operator_id) => {id:3}),
            };
        });

          await jest.unstable_mockModule('@supabase/supabase-js', () => {
            mockCreateSignedUploadUrl = jest.fn(async (filename) => {
                return {
                    data: { 
                        signedUrl: `https://supabase.test/storage/v1/upload/sign/${filename}?token=mock-token`,
                        path: filename
                    },
                    error: null
                };
            });

            return {
                createClient: jest.fn(() => ({
                    storage: {
                        from: jest.fn(() => ({
                            createSignedUploadUrl: mockCreateSignedUploadUrl
                        }))
                    }
                }))
            };
        });

        jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
            const hex = (password === 'correct') ? '01'.repeat(32) : '02'.repeat(32);
            const buf = Buffer.from(hex, 'hex');
            process.nextTick(() => cb(null, buf));
        });

        dao = await import('../../dao.mjs');
        const supabaseModule = await import('@supabase/supabase-js');
        supabase = supabaseModule.createClient();

        await import('../../index.mjs');
        
        agent = request.agent('http://localhost:3001');
        await new Promise((r) => setTimeout(r, 100));
    });

    afterAll(async () => {
        jest.restoreAllMocks();
        if (global.__TEST_SERVER__ && typeof global.__TEST_SERVER__.close === 'function') {
            await new Promise((resolve) => global.__TEST_SERVER__.close(resolve));
            global.__TEST_SERVER__ = undefined;
        }
    });

    beforeEach(async () => {
        await agent.delete('/api/sessions/current').catch(() => {});
        jest.clearAllMocks();
    });

    const loginAs = async (username) => {
        await agent.post('/api/sessions').send({ username, password: 'correct' });
    };

    describe('GET /api/reports/approved - Get approved reports for map', () => {

       test('Database error during approved report retrieval returns 503', async () => {
            dao.getAllApprovedReports.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });
            
            const response = await agent.get('/api/reports/approved');
            
            expect(response.status).toBe(503);
            expect(response.body).toEqual({ 
                error: 'Database error during report retrieval' 
            });
        });
    });

    describe('POST /api/upload-url - Get signed URL for image upload', () => {

         test('Supabase error during signed URL creation returns 500', async () => {
            // Mock Supabase to return an error
            const mockError = new Error('Supabase storage error');
            supabase.storage.from().createSignedUploadUrl.mockResolvedValueOnce({
                data: null,
                error: mockError
            });
            
            const response = await agent.post('/api/upload-url').send({
                filename: 'test.jpg'
            });
            
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ 
                error: 'Could not create signed URL' 
            });
        });
    });

    describe('GET /api/reports/assigned - Get all reports', () => {
        
        test('Technical office staff member should be able to get all reports assigned to him', async () => {
            await loginAs('tech');
            const response = await agent.get('/api/reports/assigned');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('Operator (Municipal) should NOT be able to get all reports', async () => {
            await loginAs('operator');
            const response = await agent.get('/api/reports/assigned');
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Forbidden');
        });

        test('Citizen should NOT be able to get all reports', async () => {
            await loginAs('citizen');
            const response = await agent.get('/api/reports/assigned');
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Forbidden');
        });

        test('Unauthenticated user should NOT be able to get all reports', async () => {
            const response = await agent.get('/api/reports/assigned');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Not authenticated');
        });

        test('Database error during assigned report retrieval returns 503', async () => {
            await loginAs('tech');

            dao.getReportsAssigned.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const response = await agent.get('/api/reports/assigned');
            
            expect(response.status).toBe(503);
            expect(response.body).toEqual({ 
                error: 'Database error during assigned report retrieval' 
            });
            
        });

    });

    describe('PUT /api/reports/:id/status - Update report status', () => {
        const testReportId = 1;

        test('Admin should be able to update report status', async () => {
            await loginAs('admin');
            const response = await agent.put(`/api/reports/${testReportId}/status`)
                .send({ status_id: 2 });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('report_id', testReportId);
        });

        test('Should be able to reject report with reason', async () => {
            await loginAs('admin');
            const response = await agent.put(`/api/reports/${testReportId}/status`)
                .send({ status_id: 4, rejection_reason: 'Not valid' });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('rejection_reason', 'Not valid');
        });

        test('Database error during status update returns 503', async () => {
            await loginAs('admin');
        
            dao.updateReportStatus.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const response = await agent.put(`/api/reports/${testReportId}/status`)
                .send({ status_id: 2 });
            
            expect(response.status).toBe(503);
            expect(response.body).toEqual({ 
                error: 'Database error during status update' 
            });
        });

        test('Citizen should NOT be able to update report status', async () => {
            await loginAs('citizen');
            const response = await agent.put(`/api/reports/${testReportId}/status`)
                .send({ status_id: 2 });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Forbidden');
        });

        test('Should fail with invalid report id format (423 or 404 depending on impl)', async () => {
            // Nota: Se la validazione ID avviene prima, potrebbe essere 422/423.
            // Assumiamo che il controller validi l'input numerico o il DB fallisca.
            await loginAs('admin');
            const response = await agent.put('/api/reports/invalid/status')
                .send({ status_id: 2 });
            // Controlla se il tuo codice restituisce 423 (Locked/Validation) o 422
            expect([422, 423]).toContain(response.status);
        });

        test('Should fail with non-numeric status_id', async () => {
            await loginAs('admin');
            const response = await agent.put(`/api/reports/${testReportId}/status`)
                .send({ status_id: 'invalid' });
            expect(response.status).toBe(422);
        });

        test('Should fail with non-existent report id', async () => {
            await loginAs('admin');
            // Usiamo 999999 che è mockato per restituire null nel DAO
            const response = await agent.put('/api/reports/999999/status')
                .send({ status_id: 2 });
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Report not found');
        });

        test('Unauthenticated user should NOT be able to update status', async () => {
            const response = await agent.put(`/api/reports/${testReportId}/status`)
                .send({ status_id: 2 });
            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/reports/:id/operator - Assign operator to report', () => {
        const testReportId = 1;
        const testOperatorId = 301;

        test('Admin should be able to assign operator to report', async () => {
            await loginAs('admin');
            const response = await agent.put(`/api/reports/${testReportId}/operator`)
                .send({ operatorId: testOperatorId });
            expect(response.status).toBe(200);
        });

        test('Database error during operator assignment returns 503', async () => {
            await loginAs('admin');
        
            dao.setOperatorByReport.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const response = await agent.put(`/api/reports/${testReportId}/operator`)
                .send({ operatorId: testOperatorId });
            
            expect(response.status).toBe(503);
            expect(response.body).toEqual({ 
                error: 'Database error during operator assignment' 
            });
        });

        test('Technical officer should be able to self-assign (or assign others)', async () => {
            await loginAs('tech');
            const response = await agent.put(`/api/reports/${testReportId}/operator`)
                .send({ operatorId: testOperatorId });
            expect(response.status).toBe(200);
        });

        test('Citizen should NOT be able to assign operator', async () => {
            await loginAs('citizen');
            const response = await agent.put(`/api/reports/${testReportId}/operator`)
                .send({ operatorId: testOperatorId });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Forbidden');
        });

        test('Should fail with non-numeric operatorId', async () => {
            await loginAs('admin');
            const response = await agent.put(`/api/reports/${testReportId}/operator`)
                .send({ operatorId: 'invalid' });
            expect(response.status).toBe(422);
        });

        test('Should fail with non-existent report id', async () => {
            await loginAs('admin');
            const response = await agent.put('/api/reports/999999/operator')
                .send({ operatorId: testOperatorId });
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Report not found');
        });

        test('Should fail with invalid report id (423 or 404 depending on impl)', async () => {
            await loginAs('admin');
            const response = await agent.put('/api/reports/invalid/operator')
                .send({ operatorId: testOperatorId });
            expect(response.status).toBe(423);
        });

        test('Unauthenticated user should NOT be able to assign operator', async () => {
            const response = await agent.put(`/api/reports/${testReportId}/operator`)
                .send({ operatorId: testOperatorId });
            expect(response.status).toBe(401);
        });
    });
});