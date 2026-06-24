'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger 配置
 * OpenAPI 3.0 规范
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '智慧办公助手 API 文档',
      version: '1.0.0',
      description: '智慧办公助手 OA 后端 API 服务 — 为微信小程序与 Web 管理后台提供 RESTful API',
      contact: {
        name: '开发团队',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '请输入 JWT Token（不含 Bearer 前缀）',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', description: '业务状态码，0 表示成功' },
            message: { type: 'string', description: '响应消息' },
            data: { type: 'object', description: '响应数据', nullable: true },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 0 },
            message: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                list: { type: 'array', description: '数据列表' },
                total: { type: 'integer', description: '总记录数' },
                page: { type: 'integer', description: '当前页码' },
                pageSize: { type: 'integer', description: '每页条数' },
                totalPages: { type: 'integer', description: '总页数' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', description: '业务错误码' },
            message: { type: 'string', description: '错误描述' },
            data: { type: 'object', nullable: true },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 0 },
            message: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['ok', 'degraded'] },
                timestamp: { type: 'string', format: 'date-time' },
                uptime: { type: 'number', description: '服务运行秒数' },
                version: { type: 'string', example: '1.0.0' },
                checks: {
                  type: 'object',
                  properties: {
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['ok', 'error'] },
                        responseTime: { type: 'string' },
                      },
                    },
                    redis: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['ok', 'error'] },
                        responseTime: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    // 接口分组标签
    tags: [
      {
        name: '健康检查',
        description: '服务健康状态检查',
      },
      {
        name: '认证',
        description: '用户认证与授权（M3 实现）',
      },
      {
        name: '用户',
        description: '用户管理（M3 实现）',
      },
    ],
  },
  // 自动扫描路由文件和控制器文件中的 JSDoc 注释
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
