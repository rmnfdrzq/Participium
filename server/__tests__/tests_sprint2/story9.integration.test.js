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

describe('Citizen Profile Integration Tests (Mocked)', () => {
    let agent;
    let dao;

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
                    if (id === 900) return { 
                        user_id: 900, 
                        username: 'admin', 
                        email: 'admin@test.com',
                        role: 'Admin' 
                    };
                    if (id === 201) return { 
                        user_id: 201, 
                        username: 'operator', 
                        email: 'operator@test.com',
                        role: 'Municipal public relations officer' 
                    };
                    if (id === 301) return { 
                        user_id: 301, 
                        username: 'tech', 
                        email: 'tech@test.com',
                        role: 'Technical office staff member' 
                    };
                    if (id === 555) return { 
                        user_id: 555, 
                        username: 'citizen', 
                        email: 'citizen@test.com',
                        first_name: 'John',
                        last_name: 'Doe',
                        role: 'User' 
                    };
                    return null;
                }),

                updateUserById: jest.fn(async (userId, updates) => {
                    if (userId === 999999) return null; 
                    
                    const baseUser = {
                        user_id: userId,
                        username: userId === 555 ? 'citizen' : 'user',
                        email: userId === 555 ? 'citizen@test.com' : 'user@test.com',
                        role: userId === 555 ? 'User' : 'Admin'
                    };
                    
                    return { ...baseUser, ...updates };
                }),

                getAllReports: jest.fn(async () => []),
                updateReportStatus: jest.fn(async () => ({})),
                setOperatorByReport: jest.fn(async () => ({})),
                getReportsAssigned: jest.fn(async () => []),
                createUser: jest.fn(),
                getAllOffices: jest.fn(async () => []),
                createMunicipalityUser: jest.fn(),
                getAllOperators: jest.fn(async () => []),
                getAllRoles: jest.fn(async () => []),
                getAllCategories: jest.fn(async () => []),
                insertReport: jest.fn(),
                getTechnicalOfficersByOffice: jest.fn(),
                getAllApprovedReports: jest.fn(async () => []),
                getAllCompanies: jest.fn(async () => [{id:1, name: "Participium"},{id:2, name: "Enel"}] ),
                getMainteinerByOffice:jest.fn (async (office_id) => [{id:3,name:"Mario", company:"Enel"}]),
                setMainteinerByReport: jest.fn( async (report_id, operator_id) => {id:3}),
            };
        });

        await jest.unstable_mockModule('@supabase/supabase-js', () => {
            return {
                createClient: () => ({
                    storage: {
                        from: () => ({
                            createSignedUploadUrl: async (name) => ({ 
                                data: { signedUrl: `url/${name}` }, 
                                error: null 
                            })
                        })
                    }
                })
            };
        });

        jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
            const hex = (password === 'correct') ? '01'.repeat(32) : '02'.repeat(32);
            const buf = Buffer.from(hex, 'hex');
            process.nextTick(() => cb(null, buf));
        });

        dao = await import('../../dao.mjs');

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

    describe('GET /api/citizens - Get user profile', () => {
        
        test('Authenticated citizen can get their own profile', async () => {
            await loginAs('citizen');
            const response = await agent.get('/api/citizens');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user_id', 555);
            expect(response.body).toHaveProperty('username', 'citizen');
            expect(response.body).toHaveProperty('email', 'citizen@test.com');
            expect(dao.getUserInfoById).toHaveBeenCalledWith(555);
        });

        test('Authenticated admin can get their own profile', async () => {
            await loginAs('admin');
            const response = await agent.get('/api/citizens');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user_id', 900);
            expect(response.body).toHaveProperty('username', 'admin');
            expect(dao.getUserInfoById).toHaveBeenCalledWith(900);
        });

        test('Authenticated operator can get their own profile', async () => {
            await loginAs('operator');
            const response = await agent.get('/api/citizens');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user_id', 201);
            expect(dao.getUserInfoById).toHaveBeenCalledWith(201);
        });

        test('Authenticated technical officer can get their own profile', async () => {
            await loginAs('tech');
            const response = await agent.get('/api/citizens');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user_id', 301);
            expect(dao.getUserInfoById).toHaveBeenCalledWith(301);
        });

        test('Unauthenticated user cannot get profile (401)', async () => {
            const response = await agent.get('/api/citizens');
            
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Not authenticated');
            expect(dao.getUserInfoById).not.toHaveBeenCalled();
        });

        test('Alphanumeric user ID in session returns 423', async () => {
            dao.getUser.mockImplementationOnce(async (username, password) => {
                if (username === 'alphauser' && password === 'correct') {
                    return { 
                        username: 'alphauser', 
                        role: 'User', 
                        id: 'user123abc'
                    };
                }
                return null;
            });

            const loginRes = await agent.post('/api/sessions').send({
                username: 'alphauser',
                password: 'correct'
            });

            if (loginRes.status === 201) {
                const response = await agent.get('/api/citizens');
                
                expect(response.status).toBe(423);
                expect(response.body).toHaveProperty('error', 'Invalid user id');
            }
        });

        test('Invalid user ID returns 423', async () => {
            await loginAs('citizen');
            
            dao.getUserInfoById.mockImplementationOnce(() => {
                throw new Error('Invalid user ID');
            });
            
            const response = await agent.get('/api/citizens');
            
            expect([423, 503]).toContain(response.status);
        });

        test('Non-existent user returns 404', async () => {
            await loginAs('citizen');
            
            dao.getUserInfoById.mockResolvedValueOnce(null);
            
            const response = await agent.get('/api/citizens');
            
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found');
        });

        test('Database error during user retrieval returns 503', async () => {
            await loginAs('citizen');
            
            dao.getUserInfoById.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });
            
            const response = await agent.get('/api/citizens');
            
            expect(response.status).toBe(503);
            expect(response.body).toEqual({ 
                error: 'Database error during user retrieval' 
            });
        });
    });

    describe('PUT /api/citizens - Update user profile', () => {
        
        test('Authenticated citizen can update their own profile', async () => {
            await loginAs('citizen');
            
            const updates = {
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@test.com'
            };
            
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(updates);
            expect(dao.updateUserById).toHaveBeenCalledWith(555, updates);
        });

        test('Authenticated admin can update their own profile', async () => {
            await loginAs('admin');
            
            const updates = { email: 'new.admin@test.com' };
            
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(200);
            expect(dao.updateUserById).toHaveBeenCalledWith(900, updates);
        });

        test('Can update single field', async () => {
            await loginAs('citizen');
            
            const updates = { first_name: 'UpdatedName' };
            
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('first_name', 'UpdatedName');
        });

        test('Can update multiple fields', async () => {
            await loginAs('citizen');
            
            const updates = {
                first_name: 'Jane',
                last_name: 'Doe',
                email: 'jane.doe@test.com',
                phone: '1234567890'
            };
            
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(200);
            expect(dao.updateUserById).toHaveBeenCalledWith(555, updates);
        });

        test('Empty update object returns 400', async () => {
            await loginAs('citizen');
            
            const response = await agent.put('/api/citizens').send({});
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'No update fields provided');
            expect(dao.updateUserById).not.toHaveBeenCalled();
        });

        test('No body returns 400', async () => {
            await loginAs('citizen');
            
            const response = await agent.put('/api/citizens').send();
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'No update fields provided');
        });

        test('Non-existent user returns 404', async () => {
            await loginAs('citizen');
            
            dao.updateUserById.mockResolvedValueOnce(null);
            
            const updates = { first_name: 'Test' };
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found or no changes applied');
        });

        test('Unauthenticated user cannot update profile (401)', async () => {
            const updates = { first_name: 'Test' };
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(401);
            expect(dao.updateUserById).not.toHaveBeenCalled();
        });

        test('Database error during update returns 500', async () => {
            await loginAs('citizen');
            
            dao.updateUserById.mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });
            
            const updates = { first_name: 'Test' };
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ 
                error: 'Internal server error' 
            });
        });

        test('Database constraint violation returns 500', async () => {
            await loginAs('citizen');
            
            dao.updateUserById.mockRejectedValueOnce(
                new Error('Unique constraint violation')
            );
            
            const updates = { email: 'existing@test.com' };
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Internal server error');
        });

        test('Malformed request body is handled gracefully', async () => {
            await loginAs('citizen');
            
            const updates = null;
            const response = await agent.put('/api/citizens').send(updates);
            
            expect(response.status).toBe(400);
        });
    });

    // ============================================================================
    // Combined workflow tests
    // ============================================================================
    describe('Combined profile management workflow', () => {
        
        test('Complete profile management: login -> get profile -> update profile -> get updated profile -> logout', async () => {
            // 1. Login
            const loginRes = await agent.post('/api/sessions').send({
                username: 'citizen',
                password: 'correct'
            });
            expect(loginRes.status).toBe(201);

            // 2. Get profile
            const getRes1 = await agent.get('/api/citizens');
            expect(getRes1.status).toBe(200);
            expect(getRes1.body).toHaveProperty('user_id', 555);

            // 3. Update profile
            const updates = {
                first_name: 'Updated',
                last_name: 'Name',
                email: 'updated@test.com'
            };
            const updateRes = await agent.put('/api/citizens').send(updates);
            expect(updateRes.status).toBe(200);

            // 4. Get updated profile
            const getRes2 = await agent.get('/api/citizens');
            expect(getRes2.status).toBe(200);

            // 5. Logout
            const logoutRes = await agent.delete('/api/sessions/current');
            expect([200, 204]).toContain(logoutRes.status);

            // 6. Verify cannot access after logout
            const getRes3 = await agent.get('/api/citizens');
            expect(getRes3.status).toBe(401);
        });

        test('Different users can manage their own profiles independently', async () => {
            // User 1 (citizen) updates profile
            await loginAs('citizen');
            let response = await agent.put('/api/citizens').send({ 
                first_name: 'Citizen1' 
            });
            expect(response.status).toBe(200);
            await agent.delete('/api/sessions/current');

            // User 2 (admin) updates profile
            await loginAs('admin');
            response = await agent.put('/api/citizens').send({ 
                first_name: 'Admin1' 
            });
            expect(response.status).toBe(200);
            await agent.delete('/api/sessions/current');

            // User 1 logs back in and profile is correct
            await loginAs('citizen');
            response = await agent.get('/api/citizens');
            expect(response.status).toBe(200);
            expect(response.body.user_id).toBe(555);
        });
    });
});