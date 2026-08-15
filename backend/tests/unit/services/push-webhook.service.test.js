'use strict';

jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

jest.mock('../../../src/features/push/services/sender.service', () => ({
  isConfigured: jest.fn(() => true),
}));

const db = require('../../../src/common/config/database');
const webhookService = require('../../../src/features/push/services/webhook.service');

describe('群机器人配置（名称 + Webhook 直输）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 默认 query：count=0 + 插入后按 id 查到的行（create 的 assertEnabledAllowed 需要）
    db.query.mockResolvedValue([{ id: 1, credential_type: 'direct', webhook_key: 'abcdefgh-1234-5678', secret: null, env_name: null }]);
    db.execute.mockResolvedValue([{ insertId: 1, affectedRows: 1 }]);
  });

  describe('extractKey - webhook 输入解析', () => {
    test('完整 URL 提取 key', () => {
      expect(webhookService.extractKey('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=5a909428-284b-4ccf-ab23-c94899614213'))
        .toBe('5a909428-284b-4ccf-ab23-c94899614213');
    });

    test('纯 key 直接通过', () => {
      expect(webhookService.extractKey('5a909428-284b-4ccf-ab23-c94899614213'))
        .toBe('5a909428-284b-4ccf-ab23-c94899614213');
    });

    test('非法输入返回 null', () => {
      expect(webhookService.extractKey('')).toBeNull();
      expect(webhookService.extractKey('http://evil.com/hook')).toBeNull();
      expect(webhookService.extractKey('short')).toBeNull();
      expect(webhookService.extractKey('javascript:alert(1)')).toBeNull();
    });
  });

  describe('maskKey - 脱敏', () => {
    test('保留后 4 位', () => {
      const m = webhookService.maskKey('5a909428-284b-4ccf-ab23-c94899614213');
      expect(m.endsWith('4213')).toBe(true);
      expect(m).not.toContain('5a909428');
    });

    test('空值返回空串', () => {
      expect(webhookService.maskKey('')).toBe('');
    });
  });

  describe('create - 名称 + Webhook 直输', () => {
    test('URL 输入入库 key，不存 URL', async () => {
      await webhookService.create({
        name: '测试群',
        webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abcdefgh-1234-5678',
        secret: '',
        enabled: true,
        remark: '',
      }, 1);
      expect(db.execute).toHaveBeenCalledTimes(1);
      const params = db.execute.mock.calls[0][1];
      expect(params[1]).toBe('abcdefgh-1234-5678'); // 只存 key
      expect(params[2]).toBeNull(); // 无 secret
    });

    test('纯 key 输入可用', async () => {
      await webhookService.create({ name: '测试群', webhookKey: 'abcdefgh-1234-5678', enabled: true }, 1);
      const params = db.execute.mock.calls[0][1];
      expect(params[1]).toBe('abcdefgh-1234-5678');
    });

    test('非法 webhook 输入抛错', async () => {
      await expect(webhookService.create({
        name: '测试群',
        webhookUrl: 'not a webhook url !!!',
        enabled: true,
      }, 1)).rejects.toThrow('Webhook 地址或 Key');
      expect(db.execute).not.toHaveBeenCalled();
    });

    test('secret 格式非法抛错', async () => {
      await expect(webhookService.create({
        name: '测试群',
        webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abcdefgh-1234-5678',
        secret: 'abc',
        enabled: true,
      }, 1)).rejects.toThrow('加签密钥');
    });
  });

  describe('update - 编辑留空不覆盖', () => {
    test('key 留空保持原值', async () => {
      db.query.mockResolvedValue([{ id: 1, name: '旧名', webhook_key: 'old-key-123456', secret: null, enabled: 1, remark: '' }]);
      await webhookService.update(1, { name: '新名', webhookUrl: '', secret: '', enabled: true });
      expect(db.execute).toHaveBeenCalledTimes(1);
      const params = db.execute.mock.calls[0][1];
      expect(params[0]).toBe('新名');
      expect(params[1]).toBe('old-key-123456'); // key 未变
    });

    test('key 留空且原无 key 抛错', async () => {
      db.query.mockResolvedValue([{ id: 1, name: '旧名', webhook_key: null, secret: null, enabled: 1, remark: '' }]);
      await expect(webhookService.update(1, { name: '新名', webhookUrl: '', secret: '', enabled: true }))
        .rejects.toThrow('Webhook 地址或 Key');
    });
  });

  describe('list - 凭证零回显', () => {
    test('direct 行只返回脱敏 key', async () => {
      db.query
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{
          id: 1, name: '测试群', env_name: null, credential_type: 'direct',
          webhook_key: '5a909428-284b-4ccf-ab23-c94899614213', enabled: 1, remark: '', created_at: '2026-08-15',
        }]);
      const res = await webhookService.list({});
      expect(res.list[0].maskedKey.endsWith('4213')).toBe(true);
      expect(res.list[0].maskedKey).not.toContain('5a909428');
      expect(res.list[0]).not.toHaveProperty('webhook_key');
      expect(res.list[0]).not.toHaveProperty('secret');
    });
  });
});
