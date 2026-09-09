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

const db = require('../../../src/common/config/database');
const reportService = require('../../../src/core/services/report.service');

/** 执行 list 并捕获生成的两条 SQL（count + data） */
async function runList(params) {
  db.query.mockResolvedValueOnce([{ total: 0 }]); // COUNT
  db.query.mockResolvedValueOnce([]); // 数据行
  const result = await reportService.list(0, { page: 1, pageSize: 20, ...params });
  const [countCall, dataCall] = db.query.mock.calls;
  return {
    result,
    countSql: countCall[0],
    countParams: countCall[1],
    dataSql: dataCall[0],
    dataParams: dataCall[1],
  };
}

describe('日报列表 — 筛选条件生成', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('无筛选条件：仅排除软删记录', async () => {
    const { countSql, countParams } = await runList({});
    expect(countSql).toContain('dr.deleted_at IS NULL');
    expect(countSql).not.toContain('today_work_type');
    expect(countSql).not.toContain('dr.status');
    expect(countParams).toEqual([]);
  });

  test('工作类型「工作（陆）」：兼容旧版 工作/作业', async () => {
    const { countSql, countParams } = await runList({ workType: '工作（陆）' });
    expect(countSql).toContain('dr.today_work_type IN (?, ?, ?)');
    expect(countParams).toEqual(['工作（陆）', '工作', '作业']);
  });

  test('工作类型「待工」：精确匹配', async () => {
    const { countSql, countParams } = await runList({ workType: '待工' });
    expect(countSql).toContain('dr.today_work_type = ?');
    expect(countParams).toEqual(['待工']);
  });

  test('状态「待审核」：同时匹配 pending_review 与旧版 pending', async () => {
    const { countSql, countParams } = await runList({ status: 'pending_review' });
    expect(countSql).toContain("dr.status IN ('pending', 'pending_review')");
    expect(countParams).toEqual([]);
  });

  test('状态「已通过」：精确匹配', async () => {
    const { countSql, countParams } = await runList({ status: 'approved' });
    expect(countSql).toContain('dr.status = ?');
    expect(countParams).toEqual(['approved']);
  });

  test('日志类型 + 日期区间 + 关键字：条件与参数顺序正确', async () => {
    const { countSql, countParams } = await runList({
      reportType: 'biz_trip',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      keyword: '张三',
    });
    expect(countSql).toContain('dr.report_type = ?');
    expect(countSql).toContain('dr.report_date >= ?');
    expect(countSql).toContain('dr.report_date <= ?');
    expect(countSql).toContain('dr.workers LIKE ?');
    expect(countParams).toEqual([
      'biz_trip',
      '2026-08-01',
      '2026-08-31',
      '%张三%',
      '%张三%',
      '%张三%',
      '%张三%',
    ]);
  });

  test('管理员 userId=0：不加用户条件；普通用户仅查自己', async () => {
    const admin = await runList({});
    expect(admin.countSql).not.toContain('dr.user_id = ?');

    jest.resetAllMocks();
    db.query.mockResolvedValueOnce([{ total: 0 }]);
    db.query.mockResolvedValueOnce([]);
    await reportService.list(7, { page: 1, pageSize: 20 });
    expect(db.query.mock.calls[0][0]).toContain('dr.user_id = ?');
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });
});

describe('日报导出 CSV — 筛选条件生成', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    db.query.mockResolvedValue([]);
  });

  test('导出遵循日志类型与工作类型筛选', async () => {
    await reportService.exportCSV({
      status: 'approved',
      reportType: 'biz_trip',
      workType: '工作（海）',
      startDate: '2026-08-01',
    });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('dr.status = ?');
    expect(sql).toContain('dr.report_type = ?');
    expect(sql).toContain('dr.today_work_type = ?');
    expect(sql).toContain('dr.report_date >= ?');
    expect(params).toEqual(['approved', 'biz_trip', '工作（海）', '2026-08-01']);
  });

  test('导出未传状态时默认已通过（保持旧行为）', async () => {
    await reportService.exportCSV({});
    const [, params] = db.query.mock.calls[0];
    expect(params).toEqual(['approved']);
  });
});
