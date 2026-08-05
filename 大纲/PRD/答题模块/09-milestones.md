# 09 — 里程碑

## 实施阶段

| 阶段 | 内容 | 预估工时 | Agent |
|:--:|------|:--:|------|
| M0 | 数据库建表 + ErrorCode 扩展 + 路由注册 | 0.5d | common-agent |
| M1 | 题库管理（question CRUD + 批量导入 + 分类树） | 1d | core-agent |
| M2 | 试卷管理（paper CRUD + 发布 + 克隆 + 参加范围） | 1d | core-agent |
| M3 | 考试服务（开始/快照/判分/截屏/超时扫描） | 1.5d | core-agent |
| M4 | 记录服务（个人/全员/统计） | 0.5d | core-agent |
| M5 | 小程序端（首页/练习/考试/结果/记录 6页） | 2d | miniapp-core-agent |
| M6 | Web 端（题库/试卷/记录/统计 4页） | 1.5d | webapp-core-agent |
| M7 | API 封装层（小程序+Web） | 0.5d | miniapp-common + webapp-common |
| M8 | 集成测试 + 验收 | 1d | 全员 |

## 推进阶段（遗留修复，2026-08-05 调研后）

> 三端主体已实现并暂缓验收，推进阶段关闭 6 个 P0 遗留缺口后进入端到端联调验收。

| 阶段 | 内容 | Agent | 依赖 |
|:--:|------|------|:--:|
| R1 | 分类树管理（后端 CRUD + Web 分类 UI） | core-agent + webapp-core-agent | M1 |
| R2 | 超时扫描定时任务（scheduler cron） | core-agent | M3 |
| R3 | 试卷克隆 / 版本管理 | core-agent | M2 |
| R4 | 小程序结果页逐题详情 + 记录传分 | miniapp-core-agent | M3 |
| R5 | Web `any` 清理（TS 类型） | webapp-core-agent | M6 |
| R6 | 建表并入 init-db + 端到端联调验收 + 上线 | 全员 | R1-R5 |

> R1-R5 相互独立可并行；R6 依赖全部。验收标准见 08-acceptance「遗留缺口验收」。

## 依赖关系

```
M0 (基础设施)
  └→ M1 (题库) → M2 (试卷) → M3 (考试服务) → M4 (记录)
                                    ↓               ↓
                              M5 (小程序端)    M6 (Web端)
                                    ↑               ↑
                              M7 (API封装)    M7 (API封装)
```

## Agent 分工

| 序号 | Agent | 任务 | 依赖 |
|:--:|------|------|:--:|
| 1 | common-agent | ErrorCode + 路由注册 | 无 |
| 2 | core-agent | M1-M4 全部后端 | 1 |
| 3 | miniapp-common-agent | M7 小程序 API 封装 | 2 |
| 4 | webapp-common-agent | M7 Web API 封装 | 2 |
| 5 | miniapp-core-agent | M5 小程序页面 | 3 |
| 6 | webapp-core-agent | M6 Web 页面 | 4 |

## 风险项

| 风险 | 等级 | 缓解措施 |
|------|:--:|---------|
| 判分逻辑复杂（多选 partial） | 🟡 | 单元测试覆盖 exact/partial 两种模式 |
| 超时扫描定时任务可靠性 | 🟡 | PM2 守护 + 错峰 5 分钟间隔 |
| 快照 JSON 数据量大 | 🟢 | MySQL JSON 类型存储，100 题约 5KB |
| 并发考试压力 | 🟢 | 企业内网场景，< 500 并发 |
| 截屏检测兼容性 | 🟢 | 小程序 `onUserCaptureScreen` 有基础支持 |
