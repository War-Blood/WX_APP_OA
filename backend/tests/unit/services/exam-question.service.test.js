'use strict';

jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

const db = require('../../../src/common/config/database');
const questionService = require('../../../src/features/exam/services/question.service');
const categoryService = require('../../../src/features/exam/services/category.service');

describe('题库管理服务 - 低压电工扁平化/默认分类', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // 默认: 无分类存在(query 返回空), 避免任何未显式 mock 的查询抛错
    db.query.mockResolvedValue([]);
    db.execute.mockResolvedValue([{}]);
  });

  describe('create 默认分类回落', () => {
    const base = {
      type: 'single',
      title: '测试题干',
      options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
      answer: 'A',
    };

    test('分类不存在时, create 自动落到低压电工根分类', async () => {
      // resolveDefaultCategoryId: 传入 categoryId 但非根 → 返回低压电工; 低压电工不存在 → null
      db.query.mockResolvedValueOnce([]); // categoryId 校验: 无匹配
      db.query.mockResolvedValueOnce([]); // 低压电工: 不存在
      db.execute.mockResolvedValue([{ insertId: 100 }]);

      const result = await questionService.create({ ...base });
      expect(result.id).toBe(100);
      // category_id 参数为 null
      expect(db.execute).toHaveBeenCalledWith(expect.any(String), [null, 'single', '测试题干', JSON.stringify(base.options), 'A', null, 2, 'exact', 0, null]);
    });

    test('缺乏 categoryId 时, create 落到低压电工根分类 id', async () => {
      db.query.mockResolvedValue([{ id: 5 }]); // 低压电工存在
      db.execute.mockResolvedValue([{ insertId: 7 }]);

      await questionService.create({ ...base });
      const insertParams = db.execute.mock.calls[0][1];
      expect(insertParams[0]).toBe(5);
    });
  });

  describe('batchImport 默认分类回落', () => {
    const q = {
      type: 'single',
      title: '批量题干',
      options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
      answer: 'A',
    };

    test('批导入题目缺省分类时落到低压电工', async () => {
      db.query.mockResolvedValue([{ id: 11 }]); // 低压电工存在
      db.execute.mockResolvedValue([{ insertId: 1 }]);

      const result = await questionService.batchImport([q], 1);
      const insertParams = db.execute.mock.calls[0][1];
      expect(insertParams[0]).toBe(11);
      expect(result.success).toBe(1);
    });

    test('批导入非法题型行计入 failed 并给出行号原因', async () => {
      db.execute.mockResolvedValue([{ insertId: 1 }]);
      const bad = { ...q, type: 'unknown' };
      const result = await questionService.batchImport([bad], 1);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].reason).toContain('题型字段无效');
    });
  });

  describe('分类仅单层(禁止子分类)', () => {
    test('create 带 parentId 非 0 时抛校验错误', async () => {
      await expect(categoryService.create({ parentId: 3, name: '子分类' })).rejects.toThrow('仅支持单层');
      expect(db.execute).not.toHaveBeenCalled();
    });

    test('create 缺省 parentId 为单层分类', async () => {
      db.execute.mockResolvedValue([{ insertId: 9 }]);
      const result = await categoryService.create({ name: '低压电工' });
      expect(result.id).toBe(9);
      // parent_id 恒为 0
      expect(db.execute.mock.calls[0][1][0]).toBe(0);
    });
  });
});