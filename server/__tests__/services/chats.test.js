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
    svc = await import('../../services/chat.mjs');
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getChatsByCitizen', () => {
    test('returns mapped chats with all properties', async () => {
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
          unread_count: 1,
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
          unread_count: 1,
        },
      ]);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [10]);
    });

    test('falls back to report_created_at when last_activity is null', async () => {
      const row = {
        report_id: 2,
        title: 'No messages',
        status_id: 3,
        status_name: 'Open',
        report_created_at: new Date('2024-02-01'),
        last_message: null,
        message_count: 0,
        last_activity: null,
        unread_count: 0,
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getChatsByCitizen(5);

      expect(res[0].last_activity).toEqual(row.report_created_at);
    });

    test('defaults unread_count to 0 when null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            report_id: 3,
            title: 'Chat',
            status_id: 2,
            status_name: 'In Progress',
            report_created_at: new Date(),
            last_message: null,
            message_count: 0,
            last_activity: new Date(),
            unread_count: null,
          },
        ],
      });

      const res = await svc.getChatsByCitizen(1);
      expect(res[0].unread_count).toBe(0);
    });

    test('returns empty array when no chats', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getChatsByCitizen(999);
      expect(res).toEqual([]);
    });

    test('handles multiple chats', async () => {
      const rows = [
        {
          report_id: 1,
          title: 'Chat 1',
          status_id: 2,
          status_name: 'In Progress',
          report_created_at: new Date('2024-01-01'),
          last_message: { content: 'msg1', sender_type: 'operator' },
          message_count: 5,
          last_activity: new Date('2024-01-05'),
          unread_count: 2,
        },
        {
          report_id: 2,
          title: 'Chat 2',
          status_id: 3,
          status_name: 'Open',
          report_created_at: new Date('2024-01-10'),
          last_message: null,
          message_count: 0,
          last_activity: null,
          unread_count: 0,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows });

      const res = await svc.getChatsByCitizen(1);
      expect(res).toHaveLength(2);
      expect(res[0].report_id).toBe(1);
      expect(res[1].report_id).toBe(2);
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB failure'));

      await expect(svc.getChatsByCitizen(1)).rejects.toThrow('DB failure');
    });
  });

  describe('getChatsByOperator', () => {
    test('uses operator assignment for Operator role', async () => {
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
            last_message: { content: 'update', sender_type: 'operator' },
            message_count: 2,
            last_activity: new Date(),
            unread_count: 0,
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

    test('uses external assignment for External maintainer role', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await svc.getChatsByOperator(8, 'External maintainer');

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/assigned_to_external_id = \$1/i);
    });

    test('sets citizen to null when no citizen_id', async () => {
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
            last_activity: new Date(),
            unread_count: 0,
          },
        ],
      });

      const res = await svc.getChatsByOperator(1, 'Operator');
      expect(res[0].citizen).toBeNull();
    });

    test('maps citizen data correctly', async () => {
      const citizenData = { id: 5, username: 'janedoe' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            report_id: 1,
            title: 'Test',
            status_id: 2,
            status_name: 'In Progress',
            report_created_at: new Date(),
            citizen_id: citizenData.id,
            citizen_username: citizenData.username,
            last_message: null,
            message_count: 0,
            last_activity: new Date(),
            unread_count: 0,
          },
        ],
      });

      const res = await svc.getChatsByOperator(1, 'Operator');
      expect(res[0].citizen).toEqual(citizenData);
    });

    test('returns empty array when operator has no chats', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getChatsByOperator(999, 'Operator');
      expect(res).toEqual([]);
    });

    test('defaults unread_count to 0 when null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            report_id: 1,
            title: 'Test',
            status_id: 2,
            status_name: 'In Progress',
            report_created_at: new Date(),
            citizen_id: 1,
            citizen_username: 'user',
            last_message: null,
            message_count: 0,
            last_activity: new Date(),
            unread_count: null,
          },
        ],
      });

      const res = await svc.getChatsByOperator(1, 'Operator');
      expect(res[0].unread_count).toBe(0);
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      await expect(svc.getChatsByOperator(1, 'Operator')).rejects.toThrow('Query failed');
    });
  });

  describe('getChatDetails', () => {
    test('returns chat details with all fields populated', async () => {
      const row = {
        report_id: 5,
        title: 'Water leak',
        description: 'Pipe broken under sink',
        status_id: 2,
        status_name: 'In Progress',
        created_at: new Date('2024-01-15'),
        citizen_id: 4,
        citizen_username: 'alice',
        assigned_to_operator_id: 6,
        operator_username: 'operator1',
        assigned_to_external_id: 7,
        external_username: 'maintainer1',
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getChatDetails(5);

      expect(res).toEqual({
        report_id: 5,
        title: 'Water leak',
        description: 'Pipe broken under sink',
        status_id: 2,
        status_name: 'In Progress',
        created_at: row.created_at,
        citizen: { id: 4, username: 'alice' },
        operator: { id: 6, username: 'operator1' },
        external: { id: 7, username: 'maintainer1' },
      });

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [5]);
    });

    test('returns null for citizen when citizen_id is null', async () => {
      const row = {
        report_id: 6,
        title: 'Pothole',
        description: 'Street damage',
        status_id: 2,
        status_name: 'In Progress',
        created_at: new Date(),
        citizen_id: null,
        citizen_username: null,
        assigned_to_operator_id: 2,
        operator_username: 'op2',
        assigned_to_external_id: null,
        external_username: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getChatDetails(6);

      expect(res.citizen).toBeNull();
      expect(res.operator).toEqual({ id: 2, username: 'op2' });
      expect(res.external).toBeNull();
    });

    test('returns null for operator when assigned_to_operator_id is null', async () => {
      const row = {
        report_id: 7,
        title: 'Issue',
        description: 'Test',
        status_id: 3,
        status_name: 'Open',
        created_at: new Date(),
        citizen_id: 1,
        citizen_username: 'user',
        assigned_to_operator_id: null,
        operator_username: null,
        assigned_to_external_id: 3,
        external_username: 'ext1',
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getChatDetails(7);

      expect(res.citizen).toEqual({ id: 1, username: 'user' });
      expect(res.operator).toBeNull();
      expect(res.external).toEqual({ id: 3, username: 'ext1' });
    });

    test('returns null for all users when all IDs are null', async () => {
      const row = {
        report_id: 8,
        title: 'Issue',
        description: 'Test',
        status_id: 3,
        status_name: 'Open',
        created_at: new Date(),
        citizen_id: null,
        citizen_username: null,
        assigned_to_operator_id: null,
        operator_username: null,
        assigned_to_external_id: null,
        external_username: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getChatDetails(8);

      expect(res.citizen).toBeNull();
      expect(res.operator).toBeNull();
      expect(res.external).toBeNull();
    });

    test('returns null when report not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getChatDetails(999);
      expect(res).toBeNull();
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await expect(svc.getChatDetails(1)).rejects.toThrow('DB error');
    });
  });

  describe('getReportParticipants', () => {
    test('returns participant IDs when all are assigned', async () => {
      const row = {
        citizen_id: 2,
        operator_id: 3,
        external_id: 4,
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getReportParticipants(1);
      expect(res).toEqual(row);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [1]);
    });

    test('returns participant object with null IDs', async () => {
      const row = {
        citizen_id: 5,
        operator_id: null,
        external_id: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.getReportParticipants(2);
      expect(res).toEqual(row);
      expect(res.operator_id).toBeNull();
      expect(res.external_id).toBeNull();
    });

    test('returns null when report not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getReportParticipants(123);
      expect(res).toBeNull();
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Participants query failed'));

      await expect(svc.getReportParticipants(1)).rejects.toThrow('Participants query failed');
    });
  });

  describe('markChatAsRead', () => {
    test('inserts and returns chat_read record for citizen', async () => {
      const timestamp = new Date('2024-01-20T10:00:00Z');
      const row = {
        user_type: 'citizen',
        user_id: 5,
        report_id: 10,
        last_read_at: timestamp,
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.markChatAsRead('citizen', 5, 10);

      expect(res).toEqual(row);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO chat_reads'), ['citizen', 5, 10]);
    });

    test('inserts and returns chat_read record for operator', async () => {
      const row = {
        user_type: 'operator',
        user_id: 3,
        report_id: 15,
        last_read_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const res = await svc.markChatAsRead('operator', 3, 15);

      expect(res).toEqual(row);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['operator', 3, 15]);
    });

    test('uses ON CONFLICT for upsert behavior', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_type: 'citizen', user_id: 1, report_id: 1, last_read_at: new Date() }] });

      await svc.markChatAsRead('citizen', 1, 1);

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/ON CONFLICT/i);
      expect(sql).toMatch(/DO UPDATE/i);
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(svc.markChatAsRead('citizen', 1, 1)).rejects.toThrow('Insert failed');
    });
  });

  describe('getTotalUnreadCount', () => {
    test('returns total unread count for citizen', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: 5 }],
      });

      const res = await svc.getTotalUnreadCount('citizen', 10);

      expect(res).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [10]);
    });

    test('returns total unread count for operator', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: 8 }],
      });

      const res = await svc.getTotalUnreadCount('operator', 7);

      expect(res).toBe(8);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [7]);
    });

    test('returns 0 when no unread messages for citizen', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const res = await svc.getTotalUnreadCount('citizen', 20);

      expect(res).toBe(0);
    });

    test('returns 0 when no unread messages for operator', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const res = await svc.getTotalUnreadCount('operator', 20);

      expect(res).toBe(0);
    });

    test('defaults to 0 when result rows are empty', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await svc.getTotalUnreadCount('citizen', 1);

      expect(res).toBe(0);
    });

    test('uses different SQL for citizen vs operator', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      await svc.getTotalUnreadCount('citizen', 1);

      const citizenSql = mockQuery.mock.calls[0][0];

      mockQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      await svc.getTotalUnreadCount('operator', 1);

      const operatorSql = mockQuery.mock.calls[1][0];

      expect(citizenSql).toMatch(/sender_type != 'citizen'/i);
      expect(operatorSql).toMatch(/sender_type != 'operator'/i);
    });

    test('citizen query filters by citizen_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 3 }] });

      await svc.getTotalUnreadCount('citizen', 42);

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/r\.citizen_id = \$1/i);
    });

    test('operator query filters by assigned operator IDs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] });

      await svc.getTotalUnreadCount('operator', 15);

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toMatch(/assigned_to_operator_id = \$1 OR r\.assigned_to_external_id = \$1/i);
    });

    test('propagates database error for citizen query', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Citizen query error'));

      await expect(svc.getTotalUnreadCount('citizen', 1)).rejects.toThrow('Citizen query error');
    });

    test('propagates database error for operator query', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Operator query error'));

      await expect(svc.getTotalUnreadCount('operator', 1)).rejects.toThrow('Operator query error');
    });
  });
});
