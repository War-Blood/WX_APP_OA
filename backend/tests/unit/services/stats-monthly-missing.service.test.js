'use strict';

jest.mock('../../../src/common/config/env', () => ({
  nodeEnv: 'test',
  isDev: false,
  isProd: false,
  isTest: true,
  logLevel: 'silent',
  logDir: require('path').join(__dirname, '../../../logs'),
  wecomSmartSheet: {},
}));

jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

jest.mock('../../../src/core/services/message.service', () => ({
  unreadCount: jest.fn(),
}));

jest.mock('../../../src/core/services/stats.service', () => ({
  getDailyCounts: jest.fn(),
}));

jest.mock('../../../src/common/utils/date', () => ({
  beijingToday: () => '2026-10-31',
  beijingDate: (dateStr) => new Date(dateStr + 'T00:00:00+08:00'),
  beijingNow: () => new Date('2026-10-31T00:00:00+08:00'),
}));

const db = require('../../../src/common/config/database');
const coreStatsService = require('../../../src/core/services/stats.service');
const statsService = require('../../../src/features/services/stats.service');

/** 一次「未提交清单」聚合的 mock 数据准备 */
function mockAggregation(dayRows, userRows, projectRows) {
  coreStatsService.getDailyCounts.mockResolvedValueOnce({ month: '2026-10', data: dayRows });
  db.query.mockResolvedValueOnce(userRows); // 姓名/工号
  db.query.mockResolvedValueOnce(projectRows); // 最近项目/区域
}

describe('统计 — 月度未提交清单（提交日历下方）', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('月份格式非法时抛错', async () => {
    await expect(statsService.getMonthlyMissing('2026-1')).rejects.toThrow('month 必填');
    expect(coreStatsService.getDailyCounts).not.toHaveBeenCalled();
  });

  test('按人员聚合未提交日期，并按天数倒序排列', async () => {
    mockAggregation(
      [
        { date: '2026-10-01', submitted: 2, total: 3, missingUserIds: [1] },
        { date: '2026-10-02', submitted: 3, total: 3, missingUserIds: [] },
        { date: '2026-10-03', submitted: 1, total: 3, missingUserIds: [1, 2] }
      ],
      [
        { id: 1, nickname: '张三', user_name: 'zhangsan', worker_code: 'W001' },
        { id: 2, nickname: '李四', user_name: 'lisi', worker_code: 'W002' }
      ],
      [{ user_id: 1, project: 'P1', area: '华东-上海' }]
    );

    const result = await statsService.getMonthlyMissing('2026-10', { role: 'admin', userId: 9 });

    expect(coreStatsService.getDailyCounts).toHaveBeenCalledWith('2026-10', {
      role: 'admin',
      userId: 9,
    });
    expect(result.cutoff).toBe('2026-10-31');
    expect(result.summary).toEqual({ userCount: 2, dayCount: 2, personDays: 3 });
    expect(result.list).toEqual([
      {
        userId: 1,
        userName: '张三',
        workerCode: 'W001',
        project: 'P1',
        area: '华东',
        missingDates: ['2026-10-01', '2026-10-03'],
        missingCount: 2,
      },
      {
        userId: 2,
        userName: '李四',
        workerCode: 'W002',
        project: '',
        area: '',
        missingDates: ['2026-10-03'],
        missingCount: 1,
      },
    ]);
  });

  test('统计截止日之后的日期不计入（未来日期不算缺报）', async () => {
    mockAggregation(
      [
        { date: '2026-10-30', submitted: 0, total: 1, missingUserIds: [1] },
        { date: '2026-11-01', submitted: 0, total: 1, missingUserIds: [1] }
      ],
      [{ id: 1, nickname: '张三', user_name: 'zhangsan', worker_code: 'W001' }],
      []
    );

    const result = await statsService.getMonthlyMissing('2026-10');

    expect(result.summary).toEqual({ userCount: 1, dayCount: 1, personDays: 1 });
    expect(result.list[0].missingDates).toEqual(['2026-10-30']);
  });

  test('整月无未提交时不查询人员表', async () => {
    coreStatsService.getDailyCounts.mockResolvedValueOnce({
      month: '2026-10',
      data: [{ date: '2026-10-01', submitted: 3, total: 3, missingUserIds: [] }],
    });

    const result = await statsService.getMonthlyMissing('2026-10');

    expect(db.query).not.toHaveBeenCalled();
    expect(result.summary).toEqual({ userCount: 0, dayCount: 0, personDays: 0 });
    expect(result.list).toEqual([]);
  });
});
