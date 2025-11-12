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

    beforeAll(async () => {
        // set env values used by index.mjs
        process.env.SUPABASE_BUCKET = 'participium';
        process.env.SUPABASE_URL = 'https://supabase.test';

        // get the mock query reference from the mocked module
        const pg = require('pg');
        queryMock = pg.__queryMock;

        // --- MOCK dao.mjs to bypass crypto.scrypt and provide deterministic users ---
        await jest.unstable_mockModule('../dao.mjs', () => {
            return {
                getUser: async (username, password) => {
                    if (username === 'admin' && password === 'correct') {
                      return { username: 'admin', role: 'Admin', id: 900, type: 'operator' };
                    }
                    if (username === 'found@operator' && password === 'correct') {
                      return { username: 'operator_user', role: 'Operator', id: 201, type: 'operator' };
                    }
                    if (username === 'plain' && password === 'correct') {
                      return { username: 'plainuser', role: 'User', id: 555, type: 'user' };
                    }
                    // emulate failed auth
                    return null;
                },
                createUser: async (username, email, first_name, last_name, email_notifications, password) => {
                    return { id: 111, username };
                },
                getAllOffices: async () => [{ id: 1, name: 'Office A' }, { id: 2, name: 'Office B' }],
                createMunicipalityUser: async (email, username, password, office_id, role_id) => ({ id: 222, username }),
                getAllOperators: async () => [{ operator_id: 301, email: 'op1@example.com', username: 'op1', office_id: 1, role: 'municipality_user' }],
                getAllRoles: async () => [{ role_id: 1, name: 'municipality_user' }],
                getAllCategories: async () => [{ category_id: 1, name: 'Noise' }],
                insertReport: async (obj) => ({ report_id: 555, description: obj.description || 'desc', image_name: (obj.image_urls && obj.image_urls[0]) || 'img.png' })
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

    test('POST /api/registration with empty body -> 422', async () => {
        const res = await agent.post('/api/registration').send({});
        expect(res.status).toBe(422);
        expect(Array.isArray(res.body.errors)).toBe(true);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    test('POST /api/registration invalid email & short password -> 422 with messages', async () => {
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

    test('POST /api/registration valid -> 201 created user', async () => {
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

    test('GET /api/offices -> 200 offices', async () => {
        const res = await agent.get('/api/offices');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toEqual({ id: 1, name: 'Office A' });
    });

    test('GET /api/roles -> 200 roles', async () => {
        const res = await agent.get('/api/roles');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toEqual({ role_id: 1, name: 'municipality_user' });
    });

    test('GET /api/categories -> 200 categories', async () => {
        const res = await agent.get('/api/categories');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toEqual({ category_id: 1, name: 'Noise' });
    });

    test('POST /api/upload-url returns signed url', async () => {
        const res = await agent.post('/api/upload-url').send({ filename: 'my img.png' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('signedUrl');
        expect(res.body).toHaveProperty('path');
        expect(res.body).toHaveProperty('publicUrl');
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

    test('login as admin, access /api/admin and create user', async () => {
        const loginRes = await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
        expect(loginRes.status).toBe(201);
        expect(loginRes.body).toMatchObject({ username: 'admin', type: 'operator' });

        const adminRes = await agent.get('/api/admin');
        expect(adminRes.status).toBe(200);
        expect(Array.isArray(adminRes.body)).toBe(true);
        expect(adminRes.body[0]).toHaveProperty('role', 'municipality_user');

        const createPayload = { username: 'newop', email: 'newop@example.com', password: 'validpass', office_id: 1, role: 2 };
        const createRes = await agent.post('/api/admin/createuser').send(createPayload);
        expect(createRes.status).toBe(201);
        expect(createRes.body).toMatchObject({ id: 222, username: 'newop' });
    });

    test('POST /api/sessions with wrong password -> 401', async () => {
        const res = await agent.post('/api/sessions').send({ username: 'admin', password: 'wrong' });
        expect(res.status).toBe(401);
    });

    test('POST /api/admin/createuser without authentication -> 401', async () => {
        const res = await request('http://localhost:3001').post('/api/admin/createuser').send({
            username: 'x'
        });
        expect(res.status).toBe(401);
    });

    test('POST /api/admin/createuser with invalid payload while authenticated -> 422', async () => {
        // ensure logged in as admin
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

    test('plain user cannot access /api/admin -> 403', async () => {
        // log in as plain user
        await agent.post('/api/sessions').send({ username: 'plain', password: 'correct' });
        const res = await agent.get('/api/admin');
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ error: 'Forbidden' });
    });

    test('POST /api/reports with authenticated user -> 201 created report', async () => {
        // login as admin (dao.insertReport mocked) to obtain session
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

    test('GET /api/sessions/current after login returns authenticated user', async () => {
        let res = await agent.post('/api/sessions').send({ username: 'admin', password: 'correct' });
        res = await agent.get('/api/sessions/current');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ username: 'admin', type: 'operator' });
    });

    test('DELETE /api/sessions/current logs out', async () => {
        const res = await agent.delete('/api/sessions/current');
        expect([200, 204]).toContain(res.status);
    });
});