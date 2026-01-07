// Mock pg module before any imports
const mockQuery = jest.fn();
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery
  }))
}));

describe('services/notification', () => {
  let svc;

  beforeAll(async () => {
    svc = await import('../../services/notification.mjs');
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createNotification', () => {
    test('creates notification without WebSocket', async () => {
      const notification = {
        notification_id: 1,
        citizen_id: 10,
        report_id: 5,
        message: 'Your report has been accepted',
        sent_at: new Date('2026-01-07T10:00:00Z'),
        seen: false
      };
      mockQuery.mockResolvedValueOnce({ rows: [notification] });

      const result = await svc.createNotification(10, 5, 'Your report has been accepted');

      expect(result).toEqual(notification);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [10, 5, 'Your report has been accepted']
      );
    });

    test('creates notification with WebSocket', async () => {
      const notification = {
        notification_id: 2,
        citizen_id: 10,
        report_id: 5,
        message: 'Your report has been accepted',
        sent_at: new Date('2026-01-07T10:00:00Z'),
        seen: false
      };
      mockQuery.mockResolvedValueOnce({ rows: [notification] });

      const mockIo = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };

      const result = await svc.createNotification(10, 5, 'Your report has been accepted', mockIo);

      expect(result).toEqual(notification);
      expect(mockIo.to).toHaveBeenCalledWith('citizen:10');
      expect(mockIo.emit).toHaveBeenCalledWith('new_notification', {
        id: 2,
        report_id: 5,
        message: 'Your report has been accepted',
        sent_at: notification.sent_at,
        seen: false
      });
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB insert failed'));

      await expect(
        svc.createNotification(10, 5, 'Test message')
      ).rejects.toThrow('DB insert failed');
    });
  });

  describe('getNotificationsByCitizen', () => {
    test('returns list of notifications for citizen', async () => {
      const notifications = [
        {
          id: 1,
          report_id: 5,
          message: 'Report accepted',
          sent_at: new Date('2026-01-07T10:00:00Z'),
          seen: false,
          report_title: 'Pothole on Main St'
        },
        {
          id: 2,
          report_id: 6,
          message: 'Report in progress',
          sent_at: new Date('2026-01-06T10:00:00Z'),
          seen: true,
          report_title: 'Broken streetlight'
        }
      ];
      mockQuery.mockResolvedValueOnce({ rows: notifications });

      const result = await svc.getNotificationsByCitizen(10);

      expect(result).toEqual(notifications);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [10]
      );
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('FROM notifications');
      expect(sql).toContain('ORDER BY n.sent_at DESC');
      expect(sql).toContain('LIMIT 50');
    });

    test('returns empty array when no notifications', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await svc.getNotificationsByCitizen(10);

      expect(result).toEqual([]);
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB query failed'));

      await expect(
        svc.getNotificationsByCitizen(10)
      ).rejects.toThrow('DB query failed');
    });
  });

  describe('getUnreadCount', () => {
    test('returns count of unread notifications', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const result = await svc.getUnreadCount(10);

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        [10]
      );
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('WHERE citizen_id = $1 AND seen = FALSE');
    });

    test('returns 0 when no unread notifications', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await svc.getUnreadCount(10);

      expect(result).toBe(0);
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB query failed'));

      await expect(
        svc.getUnreadCount(10)
      ).rejects.toThrow('DB query failed');
    });
  });

  describe('markNotificationAsSeen', () => {
    test('marks notification as seen and returns updated notification', async () => {
      const updatedNotification = {
        notification_id: 1,
        citizen_id: 10,
        report_id: 5,
        message: 'Your report has been accepted',
        sent_at: new Date('2026-01-07T10:00:00Z'),
        seen: true
      };
      mockQuery.mockResolvedValueOnce({ rows: [updatedNotification] });

      const result = await svc.markNotificationAsSeen(1, 10);

      expect(result).toEqual(updatedNotification);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [1, 10]
      );
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('SET seen = TRUE');
      expect(sql).toContain('WHERE notification_id = $1 AND citizen_id = $2');
    });

    test('returns undefined when notification not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await svc.markNotificationAsSeen(999, 10);

      expect(result).toBeUndefined();
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB update failed'));

      await expect(
        svc.markNotificationAsSeen(1, 10)
      ).rejects.toThrow('DB update failed');
    });
  });

  describe('markAllAsSeen', () => {
    test('marks all notifications as seen for citizen', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await svc.markAllAsSeen(10);

      expect(result).toEqual({ success: true });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [10]
      );
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('SET seen = TRUE');
      expect(sql).toContain('WHERE citizen_id = $1 AND seen = FALSE');
    });

    test('returns success even when no notifications to update', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await svc.markAllAsSeen(10);

      expect(result).toEqual({ success: true });
    });

    test('propagates database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB update failed'));

      await expect(
        svc.markAllAsSeen(10)
      ).rejects.toThrow('DB update failed');
    });
  });
});
