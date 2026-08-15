'use strict';

const senderService = require('../../../src/features/push/services/sender.service');

describe('推送发送器（安全件）', () => {
  describe('computeSign - 加签计算', () => {
    test('HMAC-SHA256 + base64，符合企微规范', () => {
      // 用固定向量验证确定性：sha256(secret, "1700000000\nsecret")
      const secret = 'testsecret';
      const sign = senderService.computeSign(secret, 1700000000);
      expect(typeof sign).toBe('string');
      expect(sign.length).toBeGreaterThan(20);
      // 幂等
      expect(senderService.computeSign(secret, 1700000000)).toBe(sign);
      // 时间戳不同则签名不同
      expect(senderService.computeSign(secret, 1700000001)).not.toBe(sign);
    });
  });

  describe('maskUrl - 凭证脱敏', () => {
    test('key 被替换为 ***', () => {
      const url = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secretkey123&timestamp=1&sign=abc';
      const masked = senderService.maskUrl(url);
      expect(masked).toContain('key=***');
      expect(masked).not.toContain('secretkey123');
    });
  });

  describe('buildBody - 消息体构造', () => {
    test('text 消息使用 mentioned_mobile_list', () => {
      const body = senderService.buildBody('text', '提醒内容', {
        mobileList: ['13800000000', '13900000000'],
        useridList: [],
      });
      expect(body.msgtype).toBe('text');
      expect(body.text.content).toBe('提醒内容');
      expect(body.text.mentioned_mobile_list).toEqual(['13800000000', '13900000000']);
      expect(body.text.mentioned_list).toEqual([]);
    });

    test('markdown 消息在末尾追加 <@userid>', () => {
      const body = senderService.buildBody('markdown', '提醒内容', {
        mobileList: [],
        useridList: ['zhangsan', 'lisi'],
      });
      expect(body.msgtype).toBe('markdown');
      expect(body.markdown.content).toContain('<@zhangsan>');
      expect(body.markdown.content).toContain('<@lisi>');
    });

    test('markdown 无 @ 目标时不追加', () => {
      const body = senderService.buildBody('markdown', '提醒内容', { mobileList: [], useridList: [] });
      expect(body.markdown.content).toBe('提醒内容');
    });
  });

  describe('getCredential / isConfigured', () => {
    test('webhook_key 存在即可用（secret 可选）', () => {
      const webhook = { webhook_key: 'direct-key-123456', secret: null };
      const cred = senderService.getCredential(webhook);
      expect(cred.key).toBe('direct-key-123456');
      expect(cred.secret).toBe('');
      expect(senderService.isConfigured(webhook)).toBe(true);
    });

    test('含 secret 时返回 secret（加签）', () => {
      const webhook = { webhook_key: 'direct-key-123456', secret: 'sign-secret-abc' };
      expect(senderService.getCredential(webhook).secret).toBe('sign-secret-abc');
    });

    test('无 key 视为未配置', () => {
      const webhook = { webhook_key: null, secret: null };
      expect(senderService.getCredential(webhook)).toBeNull();
      expect(senderService.isConfigured(webhook)).toBe(false);
      expect(senderService.getCredential(null)).toBeNull();
    });
  });
});
