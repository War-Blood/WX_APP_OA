'use strict';

const conditionService = require('../../../src/features/push/services/condition.service');

describe('推送条件判定引擎', () => {
  const context = {
    daily_report: { missing_count: 3, coverage: 0.8, total_count: 15 },
    attendance: { is_workday: true, leave_count: 0 },
    users: null, // 模拟数据源加载失败
  };

  describe('evaluate - 基础操作符', () => {
    test('> 数值比较通过', () => {
      const r = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'daily_report', field: 'missing_count', operator: '>', value: 0 }] },
        context
      );
      expect(r.passed).toBe(true);
      expect(r.details[0].actual).toBe(3);
    });

    test('<= 数值比较不通过', () => {
      const r = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'daily_report', field: 'missing_count', operator: '<=', value: 2 }] },
        context
      );
      expect(r.passed).toBe(false);
    });

    test('== 字符串比较', () => {
      const r = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'daily_report', field: 'coverage', operator: '==', value: 0.8 }] },
        context
      );
      expect(r.passed).toBe(true);
    });

    test('is_true / is_false 布尔', () => {
      const r1 = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'attendance', field: 'is_workday', operator: 'is_true', value: null }] },
        context
      );
      expect(r1.passed).toBe(true);
      const r2 = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'attendance', field: 'leave_count', operator: 'is_false', value: null }] },
        context
      );
      expect(r2.passed).toBe(true);
    });

    test('in / not_in 数组', () => {
      const r1 = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'daily_report', field: 'missing_count', operator: 'in', value: [1, 3, 5] }] },
        context
      );
      expect(r1.passed).toBe(true);
      const r2 = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'daily_report', field: 'missing_count', operator: 'not_in', value: [1, 5] }] },
        context
      );
      expect(r2.passed).toBe(true);
    });

    test('contains 字符串', () => {
      const r = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'system', field: 'date', operator: 'contains', value: '2026' }] },
        { system: { date: '2026-08-18' } }
      );
      expect(r.passed).toBe(true);
    });

    test('is_empty / not_empty', () => {
      const r1 = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'attendance', field: 'leave_count', operator: 'is_empty', value: null }] },
        { attendance: { leave_count: 0 } }
      );
      // 0 不为空
      expect(r1.passed).toBe(false);
      const r2 = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'attendance', field: 'leave_count', operator: 'not_empty', value: null }] },
        { attendance: { leave_count: 0 } }
      );
      expect(r2.passed).toBe(true);
    });
  });

  describe('evaluate - 组合与边界', () => {
    test('AND：任一不满足则失败', () => {
      const r = conditionService.evaluate(
        {
          logic: 'AND',
          rules: [
            { source: 'daily_report', field: 'missing_count', operator: '>', value: 0 },
            { source: 'daily_report', field: 'coverage', operator: '>', value: 0.9 }, // 不满足
          ],
        },
        context
      );
      expect(r.passed).toBe(false);
      expect(r.details).toHaveLength(2);
      expect(r.details[1].result).toBe(false);
    });

    test('OR：任一满足即通过', () => {
      const r = conditionService.evaluate(
        {
          logic: 'OR',
          rules: [
            { source: 'daily_report', field: 'missing_count', operator: '>', value: 10 },
            { source: 'daily_report', field: 'missing_count', operator: '>', value: 0 },
          ],
        },
        context
      );
      expect(r.passed).toBe(true);
    });

    test('空规则 → 恒不发送', () => {
      const r = conditionService.evaluate({ logic: 'AND', rules: [] }, context);
      expect(r.passed).toBe(false);
    });

    test('数据源加载失败(null) → 规则判定为不满足并给出原因', () => {
      const r = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'users', field: 'active_count', operator: '>', value: 0 }] },
        context
      );
      expect(r.passed).toBe(false);
      expect(r.details[0].reason).toContain('不可用');
    });

    test('未知字段 → 判定不满足并给出原因', () => {
      const r = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'daily_report', field: 'no_such_field', operator: '>', value: 0 }] },
        context
      );
      expect(r.passed).toBe(false);
      expect(r.details[0].reason).toContain('不存在');
    });

    test('不支持的操作符 → 判定不满足', () => {
      const r = conditionService.evaluate(
        { logic: 'AND', rules: [{ source: 'daily_report', field: 'missing_count', operator: '~=', value: 0 }] },
        context
      );
      expect(r.passed).toBe(false);
    });
  });

  describe('assertValid - 保存时校验', () => {
    test('空配置抛错', () => {
      expect(() => conditionService.assertValid(null)).toThrow('发送条件不能为空');
    });

    test('非法 logic 抛错', () => {
      expect(() => conditionService.assertValid({ logic: 'XOR', rules: [{ source: 'a', field: 'b', operator: '==', value: 1 }] }))
        .toThrow('必须为 AND 或 OR');
    });

    test('空规则抛错', () => {
      expect(() => conditionService.assertValid({ logic: 'AND', rules: [] })).toThrow('至少需要一条规则');
    });

    test('白名单外字段抛错', () => {
      expect(() => conditionService.assertValid({
        logic: 'AND',
        rules: [{ source: 'daily_report', field: 'hack_field', operator: '>', value: 1 }],
      })).toThrow('条件字段不存在');
    });

    test('合法配置通过', () => {
      expect(() => conditionService.assertValid({
        logic: 'AND',
        rules: [{ source: 'daily_report', field: 'missing_count', operator: '>', value: 0 }],
      })).not.toThrow();
    });
  });
});
