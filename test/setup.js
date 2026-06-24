// tests/setup.js - Jest 测试设置文件

// 模拟微信小程序 API
const mockStorage = {};
const mockWx = {
  setStorageSync: jest.fn((key, value) => {
    mockStorage[key] = value;
  }),
  getStorageSync: jest.fn((key) => {
    return mockStorage[key] !== undefined ? mockStorage[key] : null;
  }),
  removeStorageSync: jest.fn((key) => {
    delete mockStorage[key];
  }),
  getStorageInfoSync: jest.fn(() => ({
    keys: Object.keys(mockStorage),
  })),
  redirectTo: jest.fn(),
  switchTab: jest.fn(),
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  request: jest.fn(),
};

// 设置全局 wx 对象
global.wx = mockWx;

// 导出 mock 对象供测试使用
global.mockWx = mockWx;
global.mockStorage = mockStorage;

// 每个测试前重置 mock
beforeEach(() => {
  jest.clearAllMocks();
  // 清空模拟存储
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
});

// 全局测试超时
jest.setTimeout(10000);

console.log('[Jest Setup] 微信小程序 API 模拟已加载');
