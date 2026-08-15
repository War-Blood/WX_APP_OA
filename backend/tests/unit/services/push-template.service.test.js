'use strict';

const templateService = require('../../../src/features/push/services/template.service');

describe('推送模板渲染', () => {
  const context = {
    daily_report: { missing_count: 3, coverage: 0.8 },
    attendance: { is_workday: true },
  };
  const meta = {
    date: '2026-08-18',
    weekday: 2,
    time: '08:30:00',
    scriptName: '昨日日报缺失提醒',
    mentionNames: '张三、李四',
    datesAgo: { 1: '2026-08-17', 2: '2026-08-16' },
  };

  describe('render - 变量替换', () => {
    test('内置变量全部替换', () => {
      const r = templateService.render(
        '{{date}} {{date_1}} {{weekday}} {{time}} {{script_name}} {{mention_names}}',
        context,
        meta
      );
      expect(r.content).toBe('2026-08-18 2026-08-17 2 08:30:00 昨日日报缺失提醒 张三、李四');
      expect(r.unknownVars).toHaveLength(0);
    });

    test('数据源字段变量替换', () => {
      const r = templateService.render(
        '昨日缺失 {{daily_report.missing_count}} 人，提交率 {{daily_report.coverage}}',
        context,
        meta
      );
      expect(r.content).toBe('昨日缺失 3 人，提交率 0.8');
    });

    test('布尔值转字符串', () => {
      const r = templateService.render('今日工作日：{{attendance.is_workday}}', context, meta);
      expect(r.content).toBe('今日工作日：true');
    });

    test('未知变量保留原样并记录', () => {
      const r = templateService.render('{{unknown_var}} 与 {{daily_report.no_field}}', context, meta);
      expect(r.content).toBe('{{unknown_var}} 与 {{daily_report.no_field}}');
      expect(r.unknownVars).toEqual(['unknown_var', 'daily_report.no_field']);
    });

    test('空模板抛错', () => {
      expect(() => templateService.render('', context, meta)).toThrow('消息模板不能为空');
    });
  });

  describe('enforceLimit - 长度限制', () => {
    test('text 超 2048 字节截断', () => {
      const long = '字'.repeat(1100); // 3300 字节
      const r = templateService.enforceLimit('text', long);
      expect(r.truncated).toBe(true);
      expect(Buffer.byteLength(r.content, 'utf8')).toBeLessThanOrEqual(2048);
    });

    test('markdown 超 4096 字节截断', () => {
      const long = '字'.repeat(1500); // 4500 字节
      const r = templateService.enforceLimit('markdown', long);
      expect(r.truncated).toBe(true);
      expect(Buffer.byteLength(r.content, 'utf8')).toBeLessThanOrEqual(4096);
    });

    test('正常长度不截断', () => {
      const r = templateService.enforceLimit('text', '正常消息');
      expect(r.truncated).toBe(false);
      expect(r.content).toBe('正常消息');
    });
  });
});
