const request = require('supertest');
const crypto = require('crypto');

// Mock express so we can grab the server instance and close it later
jest.mock('express', () => {
    const realExpress = jest.requireActual('express');

    // function that builds the app and exposes server instance for tests
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

    // copy commonly used express properties so express.json() etc. work
    Object.assign(expressFn, {
        json: realExpress.json,
        urlencoded: realExpress.urlencoded,
        Router: realExpress.Router,
        static: realExpress.static,
    });

    return expressFn;
});

// Provide a pg mock that exposes the internal query mock we can configure
jest.mock('pg', () => {
    const mQuery = jest.fn();
    const Pool = jest.fn().mockImplementation(() => ({ query: mQuery }));
    return { Pool, __queryMock: mQuery };
});

describe('API (index.mjs) - improved coverage', () => {
    let agent;
    let queryMock;
    let mockCreateUser;

    beforeAll(async () => {
        jest.resetModules();
        // set env values used by index.mjs
        process.env.SUPABASE_BUCKET = 'participium';
        process.env.SUPABASE_URL = 'https://supabase.test';

        // get the mock query reference from the mocked module
        const pg = require('pg');
        queryMock = pg.__queryMock;

        mockCreateUser = jest.fn(async (username, email, first_name, last_name, email_notifications, password) => {
            return { id: 111, username };
        });

        // --- MOCK dao.mjs to bypass crypto.scrypt and provide deterministic users ---
        await jest.unstable_mockModule('../dao.mjs', () => {
            return {
                getUser: jest.fn(async (username, password) => {
                    if (username === 'admin' && password === 'correct') {
                        return { username: 'admin', role: 'Admin', id: 900 };
                    }
                    if (username === 'found@operator' && password === 'correct') {
                        return { username: 'operator_user', role: 'Operator', id: 201 };
                    }
                    if (username === 'plain' && password === 'correct') {
                        return { username: 'plainuser', role: 'User', id: 555 };
                    }
                    // emulate failed auth
                    return null;
                }),
                createUser: mockCreateUser,
                getAllOffices: jest.fn(async () => [
                    { id: 1, name: 'Office A' },
                    { id: 2, name: 'Office B' }
                ]),
                createMunicipalityUser: jest.fn(async (email, username, password, office_id, role_id) => (
                    { id: 222, username }
                )),
                getAllOperators: jest.fn(async () => [
                    { operator_id: 301, email: 'op1@example.com', username: 'op1', office_id: 1, role: 'municipality_user' }
                ]),
                getAllRoles: jest.fn(async () => [
                    { role_id: 1, name: 'municipality_user' }
                ]),
                getAllCategories: jest.fn(async () => [
                    { category_id: 1, name: 'Noise' }
                ]),
                insertReport: jest.fn(async (obj) => (
                    { report_id: 555, description: obj.description || 'desc', image_name: (obj.image_urls && obj.image_urls[0]) || 'img.png' }
                )),
                getTechnicalOfficersByOffice: jest.fn(async (office_id) => []),
                getUserInfoById: jest.fn(async (id) => null),
                getAllReports: jest.fn(async () => []),
                updateReportStatus: jest.fn(async (reportId, status_id, rejection_reason) => null),
                getAllApprovedReports: jest.fn(async () => []),
                setOperatorByReport: jest.fn(async (reportId, operatorId) => null),
                getReportsAssigned: jest.fn(async (operatorId) => []),
                updateUserById: jest.fn(async (userId, updates) => null),
                getAllCompanies: jest.fn(async () => [{id:1, name: "Participium"},{id:2, name: "Enel"}] ),
                getMainteinerByOffice:jest.fn (async (office_id) => [{id:3,name:"Mario", company:"Enel"}]),
                setMainteinerByReport: jest.fn( async (report_id, operator_id) => {id:3}),
            };
        });


        // --- MOCK supabase client used by index.mjs (createSignedUploadUrl) ---
        await jest.unstable_mockModule('@supabase/supabase-js', () => {
            return {
                createClient: () => ({
                    storage: {
                        from: (bucket) => ({
                            createSignedUploadUrl: async (name) => ({ data: { signedUrl: `https://signed.example/${name}` }, error: null })
                        })
                    }
                })
            };
        });

        // deterministic crypto.scrypt stub (keeps other tests stable)
        jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
            const hex = (password === 'correct') ? '01'.repeat(32) : '02'.repeat(32);
            const buf = Buffer.from(hex, 'hex');
            process.nextTick(() => cb(null, buf));
        });

        // configure pg query behaviour (kept minimal; dao is mocked)
        queryMock.mockImplementation((sql, values) => {
            const s = (sql || '').toString().toLowerCase();
            if (s.includes('select * from offices') || s.includes('from offices')) {
                return Promise.resolve({ rows: [{ office_id: 1, name: 'Office A' }, { office_id: 2, name: 'Office B' }] });
            }
            if (s.includes('select * from roles') || s.includes('from roles')) {
                return Promise.resolve({ rows: [{ role_id: 1, name: 'municipality_user' }] });
            }
            return Promise.resolve({ rows: [] });
        });

        // import the ESM index after mocks are ready
        await import('../index.mjs');

        agent = request.agent('http://localhost:3001');

        // small delay to ensure server listening
        await new Promise((r) => setTimeout(r, 100));
    });

    afterAll(async () => {
        jest.restoreAllMocks();
        if (global.__TEST_SERVER__ && typeof global.__TEST_SERVER__.close === 'function') {
            await new Promise((resolve) => global.__TEST_SERVER__.close(resolve));
            global.__TEST_SERVER__ = undefined;
        }
    });


    test('POST /api/upload-url returns signed url', async () => {
        const res = await agent.post('/api/upload-url').send({ filename: 'my img.png' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('signedUrl');
        expect(res.body).toHaveProperty('path');
        expect(res.body).toHaveProperty('publicUrl');
    });

    describe('GET /api/admin', () => {
        test('unauthenticated -> 401', async () => {
            await agent.delete('/api/sessions/current'); // assicuriamoci di essere disconnessi
            const res = await agent.get('/api/admin');
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Not authenticated' });
        });

        test('database error -> 500', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllOperators.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });

            // simuliamo login come Admin
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });

            const res = await agent.get('/api/admin');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Failed to fetch users' });
        });

        test('login as admin, access /api/admin and create user', async () => {
            const loginRes = await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            expect(loginRes.status).toBe(201);
            expect(loginRes.body).toMatchObject({ username: 'admin' });

            const adminRes = await agent.get('/api/admin');
            expect(adminRes.status).toBe(200);
            expect(Array.isArray(adminRes.body)).toBe(true);
            expect(adminRes.body[0]).toHaveProperty('role', 'municipality_user');

            const createPayload = { username: 'newop', email: 'newop@example.com', password: 'validpass', office_id: 1, role: 2, company:1 };
            const createRes = await agent.post('/api/admin/createuser').send(createPayload);
            expect(createRes.status).toBe(201);
            expect(createRes.body).toMatchObject({ id: 222, username: 'newop' });
        });

        test('plain user cannot access -> 403', async () => {
            // log in as plain user
            await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
            const res = await agent.get('/api/admin');
            expect(res.status).toBe(403);
            expect(res.body).toMatchObject({ error: 'Forbidden' });
        });
    });

    describe('POST /api/registration', () => {
        test('with empty body -> 422', async () => {
            const res = await agent.post('/api/registration').send({});
            expect(res.status).toBe(422);
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(res.body.errors.length).toBeGreaterThan(0);
        });

        test('invalid email & short password -> 422 with messages', async () => {
            const payload = {
                username: 't',
                first_name: 'F',
                last_name: 'L',
                email_notifications: true,
                email: 'bad',
                password: '123'
            };
            const res = await agent.post('/api/registration').send(payload);
            expect(res.status).toBe(422);
            const msgs = res.body.errors.map(e => e.msg.toLowerCase());
            expect(msgs.some(m => m.includes('invalid email'))).toBe(true);
            expect(msgs.some(m => m.includes('at least 6'))).toBe(true);
        });

        test('database error -> 503', async () => {
            // Forziamo il mock a lanciare un errore generico
            mockCreateUser.mockImplementationOnce(async () => {
                const err = new Error('DB failure');
                err.code = 'ECONNREFUSED'; // qualsiasi codice diverso da 23505
                throw err;
            });

            const payload = {
                username: 'brokenuser',
                first_name: 'First',
                last_name: 'Last',
                email_notifications: true,
                email: 'broken@user.it',
                password: 'validpassword'
            };

            const res = await agent.post('/api/registration').send(payload);
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during user creation' });
        });

        test('valid -> 201 created user', async () => {
            const payload = {
                username: 'newuser',
                first_name: 'First',
                last_name: 'Last',
                email_notifications: true,
                email: 'new@user.it',
                password: 'validpassword'
            };
            const res = await agent.post('/api/registration').send(payload);
            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({ id: 111, username: 'newuser' });
        });

        test('duplicate user -> 409', async () => {
            mockCreateUser.mockImplementationOnce(() => {
                const err = new Error('duplicate key value violates unique constraint');
                err.code = '23505';
                throw err;
            });
            const payload = {
                username: 'newuser',
                first_name: 'First',
                last_name: 'Last',
                email_notifications: true,
                email: 'new@user.it',
                password: 'validpassword'
            };
            const res = await agent.post('/api/registration').send(payload);
            expect(res.status).toBe(409);
        });

    });

    describe('GET /api/offices', () => {
        test('database error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllOffices.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });

            const res = await agent.get('/api/offices');
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during office retrieval' });
        });

        test('-> 200 offices', async () => {
            const res = await agent.get('/api/offices');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toEqual({ id: 1, name: 'Office A' });
        });
    });

    describe('GET /api/roles', () => {
        test('database error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllRoles.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });

            const res = await agent.get('/api/roles');
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during role retrieval' });
        });

        test('-> 200 roles', async () => {
            const res = await agent.get('/api/roles');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toEqual({ role_id: 1, name: 'municipality_user' });
        });
    });

    describe('GET /api/categories', () => {
        test('database error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllCategories.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });

            const res = await agent.get('/api/categories');
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during category retrieval' });
        });

        test('-> 200 categories', async () => {
            const res = await agent.get('/api/categories');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toEqual({ category_id: 1, name: 'Noise' });
        });
    });

    describe('API sessions', () => {
        test('GET /api/sessions/current after login returns authenticated user', async () => {
            let res = await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            res = await agent.get('/api/sessions/current');
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ username: 'admin' });
        });

        test('GET /api/sessions/current unauthenticated -> 401', async () => {
            const res = await request('http://localhost:3001').get('/api/sessions/current');
            expect(res.status).toBe(401);
            expect(res.body).toMatchObject({ error: 'Not authenticated' });
        });

        test('DELETE /api/sessions/current logs out', async () => {
            const res = await agent.delete('/api/sessions/current');
            expect([200, 204]).toContain(res.status);
        });

        test('DELETE /api/sessions/current logs out', async () => {
            const res = await agent.delete('/api/sessions/current');
            expect([200, 204]).toContain(res.status);
        });

        test('POST /api/sessions with wrong password -> 401', async () => {
            const res = await agent.post('/api/sessions').send({ username: 'admin', password: 'wrong' });
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/admin/createuser', () => {
        test('without authentication -> 401', async () => {
            const res = await request('http://localhost:3001')
                .post('/api/admin/createuser')
                .send({ username: 'x' });
            expect(res.status).toBe(401);
        });

        test('with invalid payload while authenticated -> 422', async () => {
            // login come Admin
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });

            const res = await agent.post('/api/admin/createuser').send({
                username: '',
                email: 'bad-email',
                password: '123',
                office_id: 'not-an-int'
            });

            expect(res.status).toBe(422);
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(res.body.errors.length).toBeGreaterThan(0);
        });

        test('duplicate -> 409', async () => {
            const dao = await import('../dao.mjs');
            dao.createMunicipalityUser.mockImplementationOnce(async () => {
                const err = new Error('duplicate');
                err.code = '23505';
                throw err;
            });

            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });

            const payload = {
                username: 'dupuser',
                email: 'dup@example.com',
                password: 'validpassword',
                office_id: 1,
                role: 1, company:1
            };

            const res = await agent.post('/api/admin/createuser').send(payload);
            expect(res.status).toBe(409);
            expect(res.body).toEqual({ error: 'Username or email already exists' });
        });

        test('database error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.createMunicipalityUser.mockImplementationOnce(async () => {
                const err = new Error('DB failure');
                err.code = 'ECONNREFUSED'; // qualsiasi codice diverso da 23505
                throw err;
            });

            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });

            const payload = {
                username: 'brokenuser',
                email: 'broken@example.com',
                password: 'validpassword',
                office_id: 1,
                role: 1, company:1
            };

            const res = await agent.post('/api/admin/createuser').send(payload);
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during user creation' });
        });

    });

    describe('POST /api/reports', () => {
        test('authenticated user -> 201 created report', async () => {
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            const payload = {
                title: 'T',
                description: 'desc',
                image_urls: ['img.png'],
                latitude: 12.34,
                longitude: 56.78,
                category_id: 1,
                anonymous: false
            };
            const res = await agent.post('/api/reports').send(payload);
            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({ report_id: 555, description: 'desc', image_name: 'img.png' });
        });

        test('unauthenticated -> 401', async () => {
            await agent.delete('/api/sessions/current');
            const payload = {
                title: 'Noise complaint',
                description: 'Too loud',
                image_urls: ['img.png'],
                latitude: 45.07,
                longitude: 7.68,
                category_id: 1,
                anonymous: false
            };
            const res = await agent.post('/api/reports').send(payload);
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Not authenticated or forbidden' });
        });

        test('database error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.insertReport.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });
            await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
            const payload = {
                title: 'Noise complaint',
                description: 'Too loud',
                image_urls: ['img.png'],
                latitude: 45.07,
                longitude: 7.68,
                category_id: 1,
                anonymous: false
            };
            const res = await agent.post('/api/reports').send(payload);
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'DB failure' });
        });
    });

    describe('GET /api/reports', () => {
        test('unauthenticated -> 401', async () => {
            await agent.delete('/api/sessions/current');
            const res = await agent.get('/api/reports');
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Not authenticated' });
        });

        test('authenticated but not Admin or Municipal officer -> 403', async () => {
            await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
            const res = await agent.get('/api/reports');
            expect(res.status).toBe(403);
            expect(res.body).toEqual({ error: 'Forbidden' });
        });

        test('authenticated as Admin -> 200 reports', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllReports.mockImplementationOnce(async () => [
                { report_id: 1, description: 'Noise complaint' },
                { report_id: 2, description: 'Garbage issue' }
            ]);
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            const res = await agent.get('/api/reports');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toEqual({ report_id: 1, description: 'Noise complaint' });
        });

        test('authenticated as Admin but DB error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllReports.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            const res = await agent.get('/api/reports');
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during report retrieval' });
        });
    });

    describe('GET /api/operators', () => {
        test('authenticated -> 200', async () => {
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            const res = await agent.get('/api/operators?officeId=1');
            expect(res.status).toBe(200);
        });

        test('unauthenticated -> 401', async () => {
            await agent.delete('/api/sessions/current');
            const res = await agent.get('/api/operators?officeId=1');
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Not authenticated' });
        });

        test('invalid params -> 422', async () => {
            const dao = await import('../dao.mjs');
            dao.getTechnicalOfficersByOffice.mockImplementationOnce(async () => {
                throw new Error('officer_id or office_id must be provided');
            });
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            const res = await agent.get('/api/operators');
            expect(res.status).toBe(422);
            expect(res.body).toEqual({ error: 'officer_id or office_id must be provided' });
        });

        test('database error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.getTechnicalOfficersByOffice.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
            const res = await agent.get('/api/operators?officeId=1');
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during operators retrieval' });
        });

    });

    describe('GET /api/reports', () => {
        test('unauthenticated -> 401', async () => {
            // logout per sicurezza
            await agent.delete('/api/sessions/current');

            const res = await agent.get('/api/reports');
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Not authenticated' });
        });

        test('authenticated but not Admin or Municipal officer -> 403', async () => {
            // login come utente normale
            await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });

            const res = await agent.get('/api/reports');
            expect(res.status).toBe(403);
            expect(res.body).toEqual({ error: 'Forbidden' });
        });

        test('authenticated as Admin -> 200 reports', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllReports.mockImplementationOnce(async () => [
                { report_id: 1, description: 'Noise complaint' },
                { report_id: 2, description: 'Garbage issue' }
            ]);

            // login come Admin
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });

            const res = await agent.get('/api/reports');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toEqual({ report_id: 1, description: 'Noise complaint' });
        });

        test('authenticated as Admin but DB error -> 503', async () => {
            const dao = await import('../dao.mjs');
            dao.getAllReports.mockImplementationOnce(async () => {
                throw new Error('DB failure');
            });

            // login come Admin
            await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });

            const res = await agent.get('/api/reports');
            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Database error during report retrieval' });
        });
    });

    describe('Additional endpoints coverage (status/operator/approved/assigned/citizens)', () => {

        describe('PUT /api/reports/:id/status', () => {
            test('unauthenticated -> 401', async () => {
                await agent.delete('/api/sessions/current');
                const res = await agent.put('/api/reports/1/status').send({ status_id: 2 });
                expect(res.status).toBe(401);
                expect(res.body).toEqual({ error: 'Not authenticated' });
            });

            test('invalid report id -> 423', async () => {
                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/abc/status').send({ status_id: 2 });
                expect(res.status).toBe(423);
                expect(res.body).toEqual({ error: 'Invalid report id' });
            });

            test('status_id not number -> 422', async () => {
                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/1/status').send({ status_id: 'x' });
                expect(res.status).toBe(422);
                expect(res.body).toEqual({ error: 'status_id must be a number' });
            });

            test('report not found -> 404', async () => {
                const dao = await import('../dao.mjs');
                dao.updateReportStatus.mockImplementationOnce(async () => null);

                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/999/status').send({ status_id: 2 });
                expect(res.status).toBe(404);
                expect(res.body).toEqual({ error: 'Report not found' });
            });

            test('success -> 200 and updated report returned', async () => {
                const dao = await import('../dao.mjs');
                const updated = { id: 5, title: 'X', description: 'Y', status: { id: 2, name: 'Assigned' }, photos: [] };
                dao.updateReportStatus.mockImplementationOnce(async () => updated);

                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/5/status').send({ status_id: 2 });
                expect(res.status).toBe(200);
                expect(res.body).toMatchObject(updated);
            });
        });

        describe('PUT /api/reports/:id/operator', () => {
            test('unauthenticated -> 401', async () => {
                await agent.delete('/api/sessions/current');
                const res = await agent.put('/api/reports/1/operator').send({ operatorId: 2 });
                expect(res.status).toBe(401);
                expect(res.body).toEqual({ error: 'Not authenticated' });
            });

            test('invalid report id -> 423', async () => {
                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/abc/operator').send({ operatorId: 2 });
                expect(res.status).toBe(423);
                expect(res.body).toEqual({ error: 'Invalid report id' });
            });

            test('operatorId not number -> 422', async () => {
                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/1/operator').send({ operatorId: 'nope' });
                expect(res.status).toBe(422);
                expect(res.body).toEqual({ error: 'operatorId must be a number' });
            });

            test('report not found -> 404', async () => {
                const dao = await import('../dao.mjs');
                dao.setOperatorByReport.mockImplementationOnce(async () => null);

                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/999/operator').send({ operatorId: 2 });
                expect(res.status).toBe(404);
                expect(res.body).toEqual({ error: 'Report not found' });
            });

            test('success -> 200', async () => {
                const dao = await import('../dao.mjs');
                dao.setOperatorByReport.mockImplementationOnce(async () => ({ report_id: 10, assigned_to_operator_id: 2 }));

                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.put('/api/reports/10/operator').send({ operatorId: 2 });
                expect(res.status).toBe(200);
                expect(res.body).toEqual({});
            });
        });

        describe('GET /api/reports/approved', () => {
            test('returns approved reports -> 200', async () => {
                const dao = await import('../dao.mjs');
                dao.getAllApprovedReports.mockImplementationOnce(async () => [{ report_id: 1 }]);

                const res = await agent.get('/api/reports/approved');
                expect(res.status).toBe(200);
                expect(res.body).toEqual([{ report_id: 1 }]);
            });

            test('DB error -> 503', async () => {
                const dao = await import('../dao.mjs');
                dao.getAllApprovedReports.mockImplementationOnce(async () => { throw new Error('DB'); });

                const res = await agent.get('/api/reports/approved');
                expect(res.status).toBe(503);
                expect(res.body).toEqual({ error: 'Database error during report retrieval' });
            });
        });

        describe('GET /api/reports/assigned', () => {
            test('unauthenticated -> 401', async () => {
                await agent.delete('/api/sessions/current');
                const res = await agent.get('/api/reports/assigned');
                expect(res.status).toBe(401);
                expect(res.body).toEqual({ error: 'Not authenticated' });
            });

            test('forbidden when not Technical staff -> 403', async () => {
                await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
                const res = await agent.get('/api/reports/assigned');
                expect(res.status).toBe(403);
                expect(res.body).toEqual({ error: 'Forbidden' });
            });

            test('success -> 200 returns assigned reports', async () => {
                const dao = await import('../dao.mjs');
                // make next login return a Technical office staff member
                dao.getUser.mockImplementationOnce(async () => ({ username: 'tech', id: 123, role: 'Technical office staff member' }));
                dao.getReportsAssigned.mockImplementationOnce(async () => [{ report_id: 77 }]);

                await agent.post('/api/sessions').send({ username: 'tech', password: 'correct' });
                const res = await agent.get('/api/reports/assigned');
                expect(res.status).toBe(200);
                expect(res.body).toEqual([{ report_id: 77 }]);
            });
        });

        describe('GET/PUT /api/citizens', () => {
            test('GET unauthenticated -> 401', async () => {
                await agent.delete('/api/sessions/current');
                const res = await agent.get('/api/citizens');
                expect(res.status).toBe(401);
                expect(res.body).toEqual({ error: 'Not authenticated' });
            });

            test('GET user not found -> 404', async () => {
                await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
                const res = await agent.get('/api/citizens');
                expect(res.status).toBe(404);
                expect(res.body).toEqual({ error: 'User not found' });
            });

            test('GET success -> 200 user returned', async () => {
                const dao = await import('../dao.mjs');
                const user = { id: 555, username: 'plainuser' };
                dao.getUserInfoById.mockImplementationOnce(async () => user);

                await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
                const res = await agent.get('/api/citizens');
                expect(res.status).toBe(200);
                expect(res.body).toEqual(user);
            });

            test('PUT no updates -> 400', async () => {
                await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
                const res = await agent.put('/api/citizens').send({});
                expect(res.status).toBe(400);
                expect(res.body).toEqual({ error: 'No update fields provided' });
            });

            test('PUT not found -> 404', async () => {
                const dao = await import('../dao.mjs');
                dao.updateUserById.mockImplementationOnce(async () => null);

                await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
                const res = await agent.put('/api/citizens').send({ first_name: 'New' });
                expect(res.status).toBe(404);
                expect(res.body).toEqual({ error: 'User not found or no changes applied' });
            });

            test('PUT success -> returns updated user', async () => {
                const dao = await import('../dao.mjs');
                const updated = { id: 555, first_name: 'New' };
                dao.updateUserById.mockImplementationOnce(async () => updated);

                await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
                const res = await agent.put('/api/citizens').send({ first_name: 'New' });
                expect(res.status).toBe(200);
                expect(res.body).toEqual(updated);
            });
        });

    });


});
