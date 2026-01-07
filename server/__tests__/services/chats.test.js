// Mock pg module BEFORE importing the service
const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
  })),
}));

describe('services/chat', () => {
  let svc;

  beforeAll(async () => {
    svc = await import('../../services/chat.mjs'); // adjust path if needed
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /* ------------------------------------------------------------------
   * getChatsByCitizen
   * ------------------------------------------------------------------ */
  test('getChatsByCitizen: returns mapped chats', async () => {
    const rows = [
      {
        report_id: 1,
        title: 'Broken streetlight',
        status_id: 2,
        status_name: 'In Progress',
        report_created_at: new Date('2024-01-01'),
        last_message: { content: 'We are working on it', sender_type: 'operator' },
        message_count: 3,
        last_activity: new Date('2024-01-05'),
      },
    ];

    mockQuery.mockResolvedValueOnce({ rows });

    const res = await svc.getChatsByCitizen(10);

    expect(res).toEqual([
      {
        report_id: 1,
        title: 'Broken streetlight',
        status_id: 2,
        status_name: 'In Progress',
        report_created_at: rows[0].report_created_at,
        last_message: rows[0].last_message,
        message_count: 3,
        last_activity: rows[0].last_activity,
      },
    ]);

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [10]);
  });

  test('getChatsByCitizen: falls back to report_created_at when last_activity is null', async () => {
    const row = {
      report_id: 2,
      title: 'No messages',
      status_id: 3,
      status_name: 'Open',
      report_created_at: new Date('2024-02-01'),
      last_message: null,
      message_count: 0,
      last_activity: null,
    };

    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const res = await svc.getChatsByCitizen(5);

    expect(res[0].last_activity).toEqual(row.report_created_at);
  });

  test('getChatsByCitizen: propagates database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB failure'));

    await expect(svc.getChatsByCitizen(1)).rejects.toThrow('DB failure');
  });

  /* ------------------------------------------------------------------
   * getChatsByOperator
   * ------------------------------------------------------------------ */
  test('getChatsByOperator: uses operator assignment for non-external role', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          report_id: 1,
          title: 'Issue',
          status_id: 2,
          status_name: 'In Progress',
          report_created_at: new Date(),
          citizen_id: 9,
          citizen_username: 'john',
          last_message: null,
          message_count: 0,
          last_activity: null,
        },
      ],
    });

    const res = await svc.getChatsByOperator(7, 'Operator');

    expect(res[0].citizen).toEqual({
      id: 9,
      username: 'john',
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/assigned_to_operator_id = \$1/i);
    expect(params).toEqual([7]);
  });

  test('getChatsByOperator: uses external assignment for External maintainer role', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await svc.getChatsByOperator(8, 'External maintainer');

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/assigned_to_external_id = \$1/i);
  });

  test('getChatsByOperator: sets citizen to null when no citizen_id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          report_id: 3,
          title: 'Anonymous',
          status_id: 2,
          status_name: 'In Progress',
          report_created_at: new Date(),
          citizen_id: null,
          citizen_username: null,
          last_message: null,
          message_count: 1,
          last_activity: null,
        },
      ],
    });

    const res = await svc.getChatsByOperator(1, 'Operator');
    expect(res[0].citizen).toBeNull();
  });

  test('getChatsByOperator: propagates database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Query failed'));

    await expect(
      svc.getChatsByOperator(1, 'Operator')
    ).rejects.toThrow('Query failed');
  });

  /* ------------------------------------------------------------------
   * getChatDetails
   * ------------------------------------------------------------------ */
  test('getChatDetails: returns chat details object', async () => {
    const row = {
      report_id: 5,
      title: 'Water leak',
      description: 'Pipe broken',
      status_id: 2,
      status_name: 'In Progress',
      created_at: new Date(),
      citizen_id: 4,
      citizen_username: 'alice',
      assigned_to_operator_id: 6,
      operator_username: 'operator1',
      assigned_to_external_id: null,
      external_username: null,
    };

    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const res = await svc.getChatDetails(5);

    expect(res).toEqual({
      report_id: 5,
      title: 'Water leak',
      description: 'Pipe broken',
      status_id: 2,
      status_name: 'In Progress',
      created_at: row.created_at,
      citizen: { id: 4, username: 'alice' },
      operator: { id: 6, username: 'operator1' },
      external: null,
    });
  });

  test('getChatDetails: returns null when report not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await svc.getChatDetails(999);
    expect(res).toBeNull();
  });

  test('getChatDetails: propagates database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    await expect(svc.getChatDetails(1)).rejects.toThrow('DB error');
  });

  /* ------------------------------------------------------------------
   * getReportParticipants
   * ------------------------------------------------------------------ */
  test('getReportParticipants: returns participant IDs', async () => {
    const row = {
      citizen_id: 2,
      operator_id: 3,
      external_id: 4,
    };

    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const res = await svc.getReportParticipants(1);
    expect(res).toEqual(row);
  });

  test('getReportParticipants: returns null when report not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await svc.getReportParticipants(123);
    expect(res).toBeNull();
  });

  test('getReportParticipants: propagates database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Participants query failed'));

    await expect(
      svc.getReportParticipants(1)
    ).rejects.toThrow('Participants query failed');
  });
});
