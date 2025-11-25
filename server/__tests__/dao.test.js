const crypto = require('crypto');
const { Pool } = require('pg');

let dao;
let queryMock;
let poolQuerySpy;
let connectSpy;
let scryptSpy;

beforeAll(async () => {
  queryMock = jest.fn();
  // route Pool.prototype.query calls to our queryMock for simple DAO methods
  poolQuerySpy = jest.spyOn(Pool.prototype, 'query').mockImplementation(function (...args) {
    return queryMock(...args);
  });

  // import ESM dao after stubbing Pool.prototype.query
  dao = await import('../dao.mjs');
});

afterAll(() => {
  poolQuerySpy && poolQuerySpy.mockRestore();
  connectSpy && connectSpy.mockRestore();
});

beforeEach(() => {
  if (scryptSpy) {
    scryptSpy.mockRestore();
    scryptSpy = null;
  }
  queryMock.mockReset();
});

afterEach(() => {
  if (scryptSpy) {
    scryptSpy.mockRestore();
    scryptSpy = null;
  }
  queryMock.mockReset();
});

const mkHex32 = (fill = 0x11) => Buffer.alloc(32, fill).toString('hex');

test('getOperators: returns false when no operator found', async () => {
  queryMock.mockResolvedValueOnce({ rows: [] });

  const res = await dao.getOperators('noone@example.com', 'password');
  expect(res).toBe(false);
});

test('getOperators: returns operator object when password matches', async () => {
  const passwordHashHex = mkHex32(0x22);
  const fakeRow = {
    operator_id: 42,
    username: 'opuser',
    salt: 'somesalt',
    password_hash: passwordHashHex,
    email: 'op@example.com',
    role_name: 'municipality_user'
  };

  queryMock.mockResolvedValueOnce({ rows: [fakeRow] });

  scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
    cb(null, Buffer.from(passwordHashHex, 'hex'));
  });

  const res = await dao.getOperators(fakeRow.email, 'irrelevant');
  expect(res).toEqual({ id: fakeRow.operator_id, username: fakeRow.username, role: fakeRow.role_name});
});

test('getOperators: returns false when password does not match', async () => {
  const passwordHashHex = mkHex32(0x33);
  const fakeRow = {
    operator_id: 43,
    username: 'opuser2',
    salt: 'othersalt',
    password_hash: passwordHashHex,
    email: 'op2@example.com',
    role_name: 'municipality_user'
  };

  queryMock.mockResolvedValueOnce({ rows: [fakeRow] });

  scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
    // different buffer same length
    cb(null, Buffer.from(mkHex32(0x44), 'hex'));
  });

  const res = await dao.getOperators(fakeRow.email, 'wrongpass');
  expect(res).toBe(false);
});

test('getOperators: propagates scrypt error', async () => {
  const passwordHashHex = mkHex32(0x55);
  const fakeRow = {
    operator_id: 44,
    username: 'opuser3',
    salt: 'salt3',
    password_hash: passwordHashHex,
    email: 'op3@example.com',
    role_name: 'municipality_user'
  };

  queryMock.mockResolvedValueOnce({ rows: [fakeRow] });

  const testErr = new Error('scrypt failed');
  scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
    cb(testErr);
  });

  await expect(dao.getOperators(fakeRow.email, 'any')).rejects.toBe(testErr);
});

test('getUser: returns operator when operator found and password matches', async () => {
  const opHashHex = mkHex32(0x66);
  const opRow = {
    operator_id: 101,
    username: 'opuserX',
    salt: 'salt-op',
    password_hash: opHashHex,
    email: 'opx@example.com',
    role_name: 'Admin'
  };

  // first query (operators) -> return the operator row
  queryMock.mockResolvedValueOnce({ rows: [opRow] });

  scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
    cb(null, Buffer.from(opHashHex, 'hex'));
  });

  const res = await dao.getUser(opRow.email, 'pw');
  expect(res).toEqual({ id: opRow.operator_id, username: opRow.username, role: opRow.role_name });
});

test('getUser: falls back to citizens when no operator and citizen matches', async () => {
  const citizenHash = mkHex32(0x77);
  const citizenRow = {
    citizen_id: 201,
    username: 'citizen1',
    salt: 'salt-cit',
    password_hash: citizenHash,
    email: 'citizen@example.com'
  };

  // first call (operators) -> no rows, second call (citizens) -> citizen row
  queryMock.mockImplementationOnce(() => Promise.resolve({ rows: [] }))
           .mockImplementationOnce(() => Promise.resolve({ rows: [citizenRow] }));

  scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
    cb(null, Buffer.from(citizenHash, 'hex'));
  });

  const res = await dao.getUser(citizenRow.email, 'pw');
  expect(res).toEqual({ id: citizenRow.citizen_id, username: citizenRow.username, role: 'user' });
});

test('createUser: inserts and returns new citizen id', async () => {
  const hashedBuf = Buffer.alloc(32, 0x88);
  const fakeId = 555;
  // scrypt should return a 32-byte buffer
  scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
    cb(null, hashedBuf);
  });

  // Expect INSERT to return the new citizen_id
  queryMock.mockResolvedValueOnce({ rows: [{ citizen_id: fakeId }] });

  const res = await dao.createUser('u1', 'u1@example.com', 'First', 'Last', true, 'password123');
  expect(res.id).toBe(fakeId);
});

test('createMunicipalityUser: inserts and returns operator id', async () => {
  const hashedBuf = Buffer.alloc(32, 0x99);
  const fakeOpId = 777;
  scryptSpy = jest.spyOn(crypto, 'scrypt').mockImplementation((password, salt, len, cb) => {
    cb(null, hashedBuf);
  });

  queryMock.mockResolvedValueOnce({ rows: [{ operator_id: fakeOpId }] });

  const res = await dao.createMunicipalityUser('op@example.com', 'opname', 'opPass', 3, 2);
  expect(res.id).toBe(fakeOpId);
});

test('getAllOffices: maps rows to id/name', async () => {
  const rows = [
    { office_id: 1, name: 'Office A' },
    { office_id: 2, name: 'Office B' }
  ];
  queryMock.mockResolvedValueOnce({ rows });

  const res = await dao.getAllOffices();
  expect(res).toEqual([
    { id: 1, name: 'Office A' },
    { id: 2, name: 'Office B' }
  ]);
});

test('getAllRoles: maps rows to id/name', async () => {
  const rows = [{ role_id: 1, name: 'municipality_user' }];
  queryMock.mockResolvedValueOnce({ rows });

  const res = await dao.getAllRoles();
  expect(res).toEqual([{ id: 1, name: 'municipality_user' }]);
});

test('getAllOperators: maps rows and includes office_name', async () => {
  const rows = [
    { operator_id: 10, email: 'a@x', username: 'a', office_id: 5, office_name: 'Off1', role_name: 'municipality_user'  },
    { operator_id: 11, email: 'b@x', username: 'b', office_id: null, office_name: null, role_name: 'municipality_user'  }
  ];
  queryMock.mockResolvedValueOnce({ rows });

  const res = await dao.getAllOperators();
  expect(res).toEqual([
    { id: 10, email: 'a@x', username: 'a', office_id: 5, office_name: 'Off1', role: 'municipality_user' },
    { id: 11, email: 'b@x', username: 'b', office_id: null, office_name: null, role: 'municipality_user' }
  ]);
});

test('getAllCategories: maps rows to id/name/office_id', async () => {
  const rows = [{ category_id: 1, name: 'Noise', office_id: 2 }];
  queryMock.mockResolvedValueOnce({ rows });

  const res = await dao.getAllCategories();
  expect(res).toEqual([{ id: 1, name: 'Noise', office_id: 2 }]);
});


test('insertReport: success path commits and returns report with images', async () => {
  // stub pool.connect to return a client with query/release
  const clientQuery = jest.fn()
    // BEGIN
    .mockResolvedValueOnce({}) 
    // categorySql -> returns office_id
    .mockResolvedValueOnce({ rows: [{ office_id: 7 }] })
    // statusSql -> returns status_id
    .mockResolvedValueOnce({ rows: [{ status_id: 99 }] })
    // report INSERT -> returns report row
    .mockResolvedValueOnce({ rows: [{ report_id: 123, citizen_id: 5, category_id: 1, office_id: 7, status_id: 99, title: 'T', description: 'desc', latitude: 1, longitude: 2, anonymous: false, created_at: new Date().toISOString() }] })
    // images insert (for each image) -> returns photo row (called once)
    .mockResolvedValueOnce({ rows: [{ photo_id: 9, report_id: 123, image_url: 'img.png', uploaded_at: new Date().toISOString() }] })
    // COMMIT
    .mockResolvedValueOnce({});

  const client = {
    query: clientQuery,
    release: jest.fn()
  };

  connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

  const input = {
    title: 'T',
    citizen_id: 5,
    description: 'desc',
    image_urls: ['img.png'],
    latitude: 1,
    longitude: 2,
    category_id: 1,
    anonymous: false
  };

  const res = await dao.insertReport(input);
  expect(res).toHaveProperty('report_id', 123);
  expect(Array.isArray(res.images)).toBe(true);
  expect(res.images[0]).toHaveProperty('image_url', 'img.png');

  // ensure client.connect was used and COMMIT was attempted
  expect(clientQuery).toHaveBeenCalled();
  connectSpy.mockRestore();
  connectSpy = null;
});

test('insertReport: invalid category causes rollback and throws', async () => {
  const clientQuery = jest.fn()
    // BEGIN
    .mockResolvedValueOnce({})
    // categorySql -> no rows -> invalid
    .mockResolvedValueOnce({ rows: [] })
    // ROLLBACK
    .mockResolvedValueOnce({});

  const client = {
    query: clientQuery,
    release: jest.fn()
  };

  connectSpy = jest.spyOn(Pool.prototype, 'connect').mockResolvedValue(client);

  const input = { title: 'T', citizen_id: 5, description: 'd', image_urls: ['i'], latitude: 1, longitude: 2, category_id: 999, anonymous: false };

  await expect(dao.insertReport(input)).rejects.toThrow('Invalid category_id');

  connectSpy.mockRestore();
  connectSpy = null;
});