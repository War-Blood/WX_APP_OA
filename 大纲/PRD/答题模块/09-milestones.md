# 09 — 里程碑

## 实施阶段（v2.0 合并重建）

| 阶段 | 内容 | 预估工时 | Agent |
|:--:|------|:--:|------|
| P0 | PRD 重写（v2.0 合并文档）+ 需求修改文档同步 | 0.5d | orchestrator |
| P1 | 删除旧答题模块（后端/表/小程序/Web 四端） | 0.5d | 全员协调 |
| P2 | 后端重建：init-db 迁移 + Answer 错误码 + services/controllers/routes + 定时任务 + seed/test | 2d | common + core |
| P3 | Web API 层（api/exam.ts + router + config/modules） | 0.5d | webapp-common |
| P4 | Web 答题管理页（分类/题库/记录/统计/设置 5 页） | 1.5d | webapp-core |
| P5 | 小程序 API 层 + 公共组件（exam.js + question-card + answer-card + pages.json） | 0.5d | miniapp-common |
| P6 | 小程序答题页（首页/分类/练习/考试/模拟/成绩/错题/收藏/排行/记录 10 页） | 2d | miniapp-core |
| P7 | 集成验收（后端测试 + Web 构建 + 小程序编译 + 端到端） | 1d | 全员 |

## 依赖关系

```
P0 (PRD 契约)
  └→ P1 (删除旧模块)
      └→ P2 (后端) ─→ P3 (Web API) ─→ P4 (Web 管理页)
                └→ P5 (小程序 API+组件) ─→ P6 (小程序页面)
                    └──→ P7 (集成验收)
```

## Agent 分工

| 序号 | Agent | 任务 | 依赖 |
|:--:|------|------|:--:|
| 1 | common-agent | init-db 迁移 + ErrorCode + 定时任务 + seed/test | P1 |
| 2 | core-agent | features/exam 全部后端 | 1 |
| 3 | webapp-common-agent | api/exam.ts + router + config | 2 |
| 4 | webapp-core-agent | views/exam 5 页 | 3 |
| 5 | miniapp-common-agent | services/exam.js + question-card/answer-card + pages.json | 2 |
| 6 | miniapp-core-agent | pages/exam 10 页 | 5 |

## 风险项

| 风险 | 等级 | 缓解措施 |
|------|:--:|---------|
| 判分逻辑复杂（多选 partial） | 🟡 | 单元测试覆盖 exact/partial 两种模式 |
| 超时扫描定时任务可靠性 | 🟡 | PM2 守护 + 错峰 5 分钟间隔 |
| 旧表迁移（DROP exam_papers） | 🟡 | init-db 幂等 + 迁移前备份；低压电工题库保留复用 |
| 快照 JSON 数据量大 | 🟢 | MySQL JSON 类型存储，100 题约 5KB |
| 并发答题压力 | 🟢 | 企业内网场景，< 500 并发 |
