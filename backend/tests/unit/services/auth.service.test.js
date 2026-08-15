'use strict';

jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

const db = require('../../../src/common/config/database');
const authService = require('../../../src/auth/services/auth.service');

const PROFILE_ROW = {
  id: 1,
  openid: 'o_test_openid',
  nickname: '张三',
  user_name: '张三',
  phone: null,
  qywx_mobile: null,
  email: null,
  department: '技术部',
  position: '工程师',
  role: 'employee',
  status: 'active',
};

describe('auth.service.updateProfile - 企业微信手机号(qywx_mobile)', () => {
  let profileRow;

  beforeEach(() => {
    jest.resetAllMocks();
    profileRow = { ...PROFILE_ROW };
    // 默认：唯一性查询无冲突；execute 成功；getProfile 返回用户行（可随用例修改）
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM users')) return Promise.resolve([profileRow]);
      return Promise.resolve([]);
    });
    db.execute.mockResolvedValue([{ affectedRows: 1 }]);
  });

  test('保存合法的 qywx_mobile：先查唯一性，再执行 UPDATE 并返回新资料', async () => {
    profileRow = { ...PROFILE_ROW, qywx_mobile: '13800000001' };
    const result = await authService.updateProfile(1, { qywx_mobile: '13800000001' });

    // 唯一性查询
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id FROM users WHERE qywx_mobile = ?'),
      ['13800000001', 1]
    );
    // UPDATE 包含 qywx_mobile
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('qywx_mobile = ?'),
      ['13800000001', 1]
    );
    // 返回新资料
    expect(result).toHaveProperty('qywx_mobile', '13800000001');
  });

  test('非法格式被拒绝（长度不足 / 含字母）', async () => {
    await expect(authService.updateProfile(1, { qywx_mobile: '12345' }))
      .rejects.toThrow('企业微信手机号格式不正确');
    await expect(authService.updateProfile(1, { qywx_mobile: 'abc12345678' }))
      .rejects.toThrow('企业微信手机号格式不正确');
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('重复绑定被拒绝，且不执行 UPDATE', async () => {
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id FROM users WHERE qywx_mobile')) return Promise.resolve([{ id: 99 }]);
      return Promise.resolve([{ ...PROFILE_ROW }]);
    });

    await expect(authService.updateProfile(1, { qywx_mobile: '13800000002' }))
      .rejects.toThrow('该企业微信手机号已被其他用户绑定');
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('空串清空为 NULL：不查唯一性，UPDATE 写入 null', async () => {
    await authService.updateProfile(1, { qywx_mobile: '' });

    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('SELECT id FROM users WHERE qywx_mobile = ?'),
      expect.anything()
    );
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('qywx_mobile = ?'),
      [null, 1]
    );
  });

  test('undefined 视为不更新该字段', async () => {
    await authService.updateProfile(1, { nickname: '李四' });

    expect(db.execute).toHaveBeenCalledWith(
      expect.not.stringContaining('qywx_mobile'),
      ['李四', '李四', 1]
    );
  });

  test('非白名单字段被忽略（仅传 role 时报无字段）', async () => {
    await expect(authService.updateProfile(1, { role: 'admin' }))
      .rejects.toThrow('没有提供要更新的字段');
    expect(db.execute).not.toHaveBeenCalled();
  });
});
