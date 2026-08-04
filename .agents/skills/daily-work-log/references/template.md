# 工作日志模板

## 标准格式

```markdown
# 工作日志 — YYYY-MM-DD

---

## 完成事项

| # | 事项 | 涉及文件 | 提交 |
|:--:|------|------|------|
| 1 | 数据库 area 脏数据清洗（325→0 条） | clean_area_data_june2026.sql | `9dab2da` |
| 2 | 重写区域分布 getAreaDistribution + getProvinceWorkers | stats.service.js, stats.vue, report.js | `4f95dd3` |
| 3 | 删除日报模块(office)前后端全删 | 15 个文件 | `be4b230` |
| 4 | 账号审核隔离层（7 处查询加 status='active'） | worker.service.js 等 5 个文件 | `be4b230` |

## 部署状态

| 层 | 状态 | 备注 |
|------|:--:|------|
| 后端 | ✅ | PM2 重启 |
| 小程序 | ✅ | dist/build/mp-weixin/ |
| Webapp | ❌ | 未构建 |

## 验证结果

- office 提交 → `无效的日志类型: office` ✅
- 调休提交 → `无效的工作类型: 调休` ✅
- 面板 count = workers.length ✅

## 待处理

- [ ] Webapp npm run build 部署
- [ ] 微信开发者工具导入小程序验证

---

*自动生成*
```

## 追加格式（当日已有日志时）

在已有文件的「完成事项」表格末尾追加行，在「待处理」列表末尾追加行。
不要覆盖已有的表格标题和分隔行。
