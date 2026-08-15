'use strict';

jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

const db = require('../../../src/common/config/database');
const mentionService = require('../../../src/features/push/services/mention.service');

describe('@ 目标解析 - 按条件筛选（filtered）', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    db.query.mockResolvedValue([]);
  });

  const people = [
    { userId: 11, name: '张三', phone: '13800000001', qywxUserid: 'zhangsan' },
    { userId: 12, name: '李四', phone: '13800000002', qywxUserid: '' },
    { userId: 13, name: '王五', phone: '', qywxUserid: 'wangwu' },
  ];
  const context = {
    daily_report: { missing_count: 3, missing_workers: people },
  };

  describe('filtered - 有人员名单', () => {
    test('text 消息：手机号 @（无手机号跳过并记录）', async () => {
      const r = await mentionService.resolve(
        { mention_type: 'filtered', mention_source: 'daily_report', msgtype: 'text' },
        context
      );
      expect(r.mobileList).toEqual(['13800000001', '13800000002']);
      expect(r.useridList).toEqual([]);
      expect(r.names).toEqual(['张三', '李四', '王五']);
      expect(r.detail.some((d) => d.reason && d.reason.includes('无手机号'))).toBe(true);
      // filtered 不查 DB
      expect(db.query).not.toHaveBeenCalled();
    });

    test('markdown 消息：企微 userid @（无 userid 跳过）', async () => {
      const r = await mentionService.resolve(
        { mention_type: 'filtered', mention_source: 'daily_report', msgtype: 'markdown' },
        context
      );
      expect(r.useridList).toEqual(['zhangsan', 'wangwu']);
      expect(r.mobileList).toEqual([]);
      expect(r.detail.some((d) => d.reason && d.reason.includes('未绑定企业微信'))).toBe(true);
    });

    test('mention_source 指定名单字段（source.peopleField）', async () => {
      const ctx2 = {
        daily_report: {
          missing_workers: [],
          today_missing_workers: [{ userId: 21, name: '出差甲', phone: '13700000001', qywxUserid: 'jia' }],
        },
      };
      const r = await mentionService.resolve(
        { mention_type: 'filtered', mention_source: 'daily_report.today_missing_workers', msgtype: 'text' },
        ctx2
      );
      expect(r.mobileList).toEqual(['13700000001']);
      expect(r.names).toEqual(['出差甲']);
    });
  });

  describe('filtered - 全员满足/无名单', () => {
    test('名单为空 → 不触发 @ 并记录原因', async () => {
      const r = await mentionService.resolve(
        { mention_type: 'filtered', mention_source: 'daily_report', msgtype: 'text' },
        { daily_report: { missing_workers: [] } }
      );
      expect(r.mobileList).toEqual([]);
      expect(r.names).toEqual([]);
      expect(r.detail[0].reason).toContain('全员满足');
    });

    test('数据源不可用/无人员字段 → 空目标', async () => {
      const r1 = await mentionService.resolve(
        { mention_type: 'filtered', mention_source: 'no_such_source', msgtype: 'text' },
        context
      );
      expect(r1.mobileList).toEqual([]);
      const r2 = await mentionService.resolve(
        { mention_type: 'filtered', mention_source: 'daily_report', msgtype: 'text' },
        {}
      );
      expect(r2.mobileList).toEqual([]);
    });
  });

  describe('其他方式（回归）', () => {
    test('none 不 @', async () => {
      const r = await mentionService.resolve({ mention_type: 'none', msgtype: 'text' }, context);
      expect(r.mobileList).toEqual([]);
    });

    test('all 查 DB（text 取手机号）', async () => {
      db.query.mockResolvedValue([
        { id: 1, user_name: '甲', nickname: '', phone: '13900000000', qywx_userid: '' },
        { id: 2, user_name: '乙', nickname: '', phone: '', qywx_userid: '' },
      ]);
      const r = await mentionService.resolve({ mention_type: 'all', msgtype: 'text' }, context);
      expect(r.mobileList).toEqual(['13900000000']);
      expect(r.names).toEqual(['甲', '乙']);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });
});
