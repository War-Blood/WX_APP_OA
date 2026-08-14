'use strict';

jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

const db = require('../../../src/common/config/database');
const questionService = require('../../../src/features/exam/services/question.service');
const categoryService = require('../../../src/features/exam/services/category.service');

describe('题库管理服务 - 扁平化主分类 + 校验 + 批量导入', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // 默认: 无分类存在(query 返回空), 避免任何未显式 mock 的查询抛错
    db.query.mockResolvedValue([]);
    db.execute.mockResolvedValue([{ insertId: 1, affectedRows: 1 }]);
  });

  const base = {
    type: 'single',
    title: '测试题干',
    options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
    answer: 'A',
  };

  describe('create 分类解析', () => {
    test('显式指定有效主分类 → 使用该分类', async () => {
      db.query.mockResolvedValueOnce([{ id: 5 }]); // categoryId 校验通过
      db.execute.mockResolvedValue([{ insertId: 7 }]);
      const result = await questionService.create({ ...base, categoryId: 5 });
      expect(result.id).toBe(7);
      expect(db.execute.mock.calls[0][1][0]).toBe(5);
    });

    test('未指定分类且分类表仅1个主分类 → 回落该分类', async () => {
      db.query.mockResolvedValueOnce([{ id: 5 }]); // 查询唯一分类(LIMIT 2)
      db.execute.mockResolvedValue([{ insertId: 7 }]);
      const result = await questionService.create({ ...base });
      expect(result.id).toBe(7);
      expect(db.execute.mock.calls[0][1][0]).toBe(5);
    });

    test('未指定分类且存在多个主分类 → 抛错要求显式选择', async () => {
      db.query.mockResolvedValueOnce([]);
      db.query.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]); // 两个主分类
      await expect(questionService.create({ ...base })).rejects.toThrow('请选择分类');
      expect(db.execute).not.toHaveBeenCalled();
    });

    test('指定不存在的分类 → 抛错', async () => {
      db.query.mockResolvedValueOnce([]); // 分类校验无匹配
      await expect(questionService.create({ ...base, categoryId: 99 })).rejects.toThrow('分类不存在');
      expect(db.execute).not.toHaveBeenCalled();
    });
  });

  describe('create/update 答案与选项一致性校验', () => {
    test('单选答案不在选项内 → 抛错', async () => {
      await expect(questionService.create({ ...base, answer: 'C' })).rejects.toThrow('不在选项范围');
      expect(db.execute).not.toHaveBeenCalled();
    });

    test('多选答案少于2个 → 抛错', async () => {
      await expect(questionService.create({ ...base, type: 'multiple', answer: 'A' })).rejects.toThrow('至少2个选项');
    });

    test('分值为0 → 抛错', async () => {
      await expect(questionService.create({ ...base, score: 0 })).rejects.toThrow('分值必须为正数');
    });

    test('update 仅改题干时不触发合并校验', async () => {
      db.query.mockResolvedValueOnce([{ id: 1, type: 'single', title: '旧题干', options: JSON.stringify(base.options), answer: 'A', score: 2, score_mode: 'exact' }]);
      db.execute.mockResolvedValue([{ affectedRows: 1 }]);
      const result = await questionService.update(1, { title: '新题干' });
      expect(result.updated).toBe(true);
    });

    test('update 修改答案不在现有选项内 → 抛错', async () => {
      db.query.mockResolvedValueOnce([{ id: 1, type: 'single', title: '题干', options: JSON.stringify(base.options), answer: 'A', score: 2, score_mode: 'exact' }]);
      await expect(questionService.update(1, { answer: 'X' })).rejects.toThrow('不在选项范围');
      expect(db.execute).not.toHaveBeenCalled();
    });
  });

  describe('batchImport 批量导入', () => {
    test('分类一次校验: 合法分类ID全部成功(单条 chunk)', async () => {
      db.query.mockResolvedValueOnce([{ id: 11 }]); // IN 查询命中
      db.execute.mockResolvedValue([{ affectedRows: 2 }]);
      const result = await questionService.batchImport([{ ...base, categoryId: 11 }, { ...base, categoryId: 11 }], 1, 2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    test('未指定分类且仅1个主分类 → 全部回落成功', async () => {
      db.query.mockResolvedValueOnce([{ id: 11 }]); // 唯一主分类(LIMIT 2)
      db.execute.mockResolvedValue([{ affectedRows: 1 }]);
      const result = await questionService.batchImport([{ ...base }], 1);
      expect(result.success).toBe(1);
      expect(db.execute.mock.calls[0][1][0]).toBe(11);
    });

    test('非法题型行计入 failed, 行号按 baseRow 偏移', async () => {
      db.query.mockResolvedValueOnce([{ id: 11 }]);
      db.execute.mockResolvedValue([{ affectedRows: 0 }]);
      const bad = { ...base, type: 'unknown', categoryId: 11 };
      const result = await questionService.batchImport([bad], 1, 2);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].reason).toContain('题型字段无效');
    });

    test('答案不在选项内计入 failed', async () => {
      db.query.mockResolvedValueOnce([{ id: 11 }]);
      db.execute.mockResolvedValue([{ affectedRows: 0 }]);
      const bad = { ...base, answer: 'C', categoryId: 11 };
      const result = await questionService.batchImport([bad], 1, 5);
      expect(result.success).toBe(0);
      expect(result.errors[0].row).toBe(5);
      expect(result.errors[0].reason).toContain('不在选项范围');
    });
  });

  describe('分类服务 - 单层主分类', () => {
    test('create 忽略 parentId, 恒为主分类', async () => {
      db.execute.mockResolvedValue([{ insertId: 9 }]);
      const result = await categoryService.create({ name: '低压电工', parentId: 3 });
      expect(result.id).toBe(9);
      expect(db.execute.mock.calls[0][1][0]).toBe(0); // parent_id 恒为 0
    });

    test('create 缺省分类名 → 抛错', async () => {
      await expect(categoryService.create({})).rejects.toThrow('分类名称不能为空');
      expect(db.execute).not.toHaveBeenCalled();
    });

    test('list 返回扁平数组(无 children)', async () => {
      db.query.mockResolvedValueOnce([
        { id: 1, parent_id: 0, name: '低压电工', cover: null, question_num: 0, time: 10, path: '低压电工', sort_order: 0, created_at: null },
        { id: 2, parent_id: 0, name: '安全生产', cover: null, question_num: 0, time: 10, path: '安全生产', sort_order: 1, created_at: null },
      ]);
      db.query.mockResolvedValueOnce([{ category_id: 1, cnt: 3 }]); // 题量统计
      const list = await categoryService.list();
      expect(list.length).toBe(2);
      expect(list[0].questionNum).toBe(3);
      expect(list[0].children).toBeUndefined();
    });

    test('remove 有题目时拒绝, 无子分类检查', async () => {
      db.query.mockResolvedValueOnce([{ id: 1 }]); // 分类存在
      db.query.mockResolvedValueOnce([{ cnt: 2 }]); // 有题目
      await expect(categoryService.remove(1)).rejects.toThrow('该分类下存在题目');
      expect(db.execute).not.toHaveBeenCalled();
    });
  });
});
