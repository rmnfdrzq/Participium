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

describe('API integration', () => {
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

    
  describe('Combined workflow tests', () => {
    let agent;

    beforeAll(() => {
        // init of agent for all tests
        agent = request.agent('http://localhost:3001');
    });

    beforeEach(async () => {
        // reset of the session
        await agent.delete('/api/sessions/current').catch(() => {});
    });

    test('Admin workflow: login -> get operators -> create valid operators -> create invalid operator', async () => {
        // 1. Admin login
        const loginRes = await agent.post('/api/sessions').send({ 
            username: 'admin', 
            password: 'correct' 
        });
        expect(loginRes.status).toBe(201);
        expect(loginRes.body).toMatchObject({ username: 'admin' });

        // 2. Get all operators
        const operatorsRes = await agent.get('/api/admin');
        expect(operatorsRes.status).toBe(200);
        expect(Array.isArray(operatorsRes.body)).toBe(true);

        // 3. Create first valid operator
        const createOp1 = await agent.post('/api/admin/createuser').send({
            username: 'operator1',
            email: 'operator1@example.com',
            password: 'validpass123',
            office_id: 1,
            role: 1, company:1
        });
        expect(createOp1.status).toBe(201);
        expect(createOp1.body).toMatchObject({ id: 222, username: 'operator1' });

        // 4. Create second valid operator
        const createOp2 = await agent.post('/api/admin/createuser').send({
            username: 'operator2',
            email: 'operator2@example.com',
            password: 'validpass456',
            office_id: 2,
            role: 1
        });
        expect(createOp2.status).toBe(201);
        expect(createOp2.body).toMatchObject({ id: 222, username: 'operator2' });

        // 5. Try to create invalid operator (invalid email, short password)
        const createInvalid = await agent.post('/api/admin/createuser').send({
            username: 'bad_operator',
            email: 'not-an-email',
            password: '123',
            office_id: 1,
            role: 1
        });
        expect(createInvalid.status).toBe(422);
        expect(Array.isArray(createInvalid.body.errors)).toBe(true);
        expect(createInvalid.body.errors.length).toBeGreaterThan(0);
    });

    test('User registration -> login -> create report -> logout', async () => {
    const dao = await import('../dao.mjs');
    
    // 1. Register new user
    const registerRes = await agent.post('/api/registration').send({
        username: 'reportuser',
        first_name: 'Report',
        last_name: 'User',
        email_notifications: true,
        email: 'reportuser@example.com',
        password: 'securepass123'
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toMatchObject({ id: 111, username: 'reportuser' });

    // 2. Mock getUser per permettere il login con l'utente appena creato
    dao.getUser.mockImplementationOnce(async (username, password) => {
        if (username === 'reportuser' && password === 'securepass123') {
            return { username: 'reportuser', role: 'User', id: 111 };
        }
        return null;
    });

    const loginRes = await agent.post('/api/sessions').send({
        username: 'reportuser',
        password: 'securepass123'
    });
    expect(loginRes.status).toBe(201);

    // 3. Create a report
    const reportRes = await agent.post('/api/reports').send({
        title: 'Street Light Issue',
        description: 'The street light is broken',
        image_urls: ['light_broken.png'],
        latitude: 45.0703,
        longitude: 7.6869,
        category_id: 1,
        anonymous: false
    });
    expect(reportRes.status).toBe(201);
    expect(reportRes.body).toHaveProperty('report_id');

    // 4. Logout
    const logoutRes = await agent.delete('/api/sessions/current');
    expect([200, 204]).toContain(logoutRes.status);

    // 5. Verify cannot access reports after logout
    const unauthorizedRes = await agent.post('/api/reports').send({
        title: 'Should fail',
        description: 'desc',
        image_urls: ['img.png'],
        latitude: 45.07,
        longitude: 7.68,
        category_id: 1,
        anonymous: false
    });
    expect(unauthorizedRes.status).toBe(401);
    });


    test('Plain user tries admin actions: login -> try get reports (forbidden) -> try create operator (forbidden)', async () => {
    const dao = await import('../dao.mjs');
    
    // Mock getUserInfoById per la deserializzazione della sessione
    dao.getUserInfoById.mockImplementation(async (id) => {
        if (id === 555) {
            return { user_id: 555, username: 'plainuser', role: 'User' };
        }
        return null;
    });

    // 1. Login as plain user
    const loginRes = await agent.post('/api/sessions').send({
        username: 'plain',
        password: 'correct'
    });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body).toMatchObject({ username: 'plainuser'});

    // 2. Try to access reports (forbidden for plain users)
    const reportsRes = await agent.get('/api/reports');
    expect(reportsRes.status).toBe(403);
    expect(reportsRes.body).toEqual({ error: 'Forbidden' });

    // 3. Try to access admin panel (forbidden)
    const adminRes = await agent.get('/api/admin');
    expect(adminRes.status).toBe(403);
    expect(adminRes.body).toMatchObject({ error: 'Forbidden' });

    // 4. Try to create operator (forbidden)
    const createOpRes = await agent.post('/api/admin/createuser').send({
        username: 'shouldfail',
        email: 'shouldfail@example.com',
        password: 'password123',
        office_id: 1,
        role: 1
    });
    expect(createOpRes.status).toBe(401);
    expect(createOpRes.body).toMatchObject({ error: 'Not authorized' });
    });

    test('Multiple users workflow: register 3 users, some succeed, one fails duplicate', async () => {
        const dao = await import('../dao.mjs');

        // 1. Register first user (success)
        const user1 = await agent.post('/api/registration').send({
            username: 'user1',
            first_name: 'First',
            last_name: 'User',
            email_notifications: true,
            email: 'user1@example.com',
            password: 'password123'
        });
        expect(user1.status).toBe(201);

        // 2. Register second user (success)
        const user2 = await agent.post('/api/registration').send({
            username: 'user2',
            first_name: 'Second',
            last_name: 'User',
            email_notifications: false,
            email: 'user2@example.com',
            password: 'password456'
        });
        expect(user2.status).toBe(201);

        // 3. Try to register duplicate user (fail)
        mockCreateUser.mockImplementationOnce(() => {
            const err = new Error('duplicate key');
            err.code = '23505';
            throw err;
        });

        const user3 = await agent.post('/api/registration').send({
            username: 'user1', // duplicate username
            first_name: 'Third',
            last_name: 'User',
            email_notifications: true,
            email: 'user1@example.com', // duplicate email
            password: 'password789'
        });
        expect(user3.status).toBe(409);
    });

    test('Session management: login -> check current session -> logout -> check session again', async () => {
        // 1. Initially not authenticated
        const notAuthRes = await agent.get('/api/sessions/current');
        expect(notAuthRes.status).toBe(401);

        // 2. Login
        const loginRes = await agent.post('/api/sessions').send({
            username: 'admin',
            password: 'correct'
        });
        expect(loginRes.status).toBe(201);

        // 3. Check authenticated session
        const authRes = await agent.get('/api/sessions/current');
        expect(authRes.status).toBe(200);
        expect(authRes.body).toMatchObject({ username: 'admin' });

        // 4. Logout
        const logoutRes = await agent.delete('/api/sessions/current');
        expect([200, 204]).toContain(logoutRes.status);

        // 5. Verify session is gone
        const noSessionRes = await agent.get('/api/sessions/current');
        expect(noSessionRes.status).toBe(401);
    });

    test('Categories and offices access: get categories -> get offices -> verify data', async () => {
        // 1. Get all categories
        const categoriesRes = await agent.get('/api/categories');
        expect(categoriesRes.status).toBe(200);
        expect(Array.isArray(categoriesRes.body)).toBe(true);
        expect(categoriesRes.body[0]).toHaveProperty('category_id');
        expect(categoriesRes.body[0]).toHaveProperty('name');

        // 2. Get all offices
        const officesRes = await agent.get('/api/offices');
        expect(officesRes.status).toBe(200);
        expect(Array.isArray(officesRes.body)).toBe(true);
        expect(officesRes.body[0]).toHaveProperty('id');
        expect(officesRes.body[0]).toHaveProperty('name');

        // 3. Verify we can access both without authentication
        await agent.delete('/api/sessions/current');
        
        const categoriesNoAuth = await agent.get('/api/categories');
        expect(categoriesNoAuth.status).toBe(200);
        
        const officesNoAuth = await agent.get('/api/offices');
        expect(officesNoAuth.status).toBe(200);
    });

});


});
