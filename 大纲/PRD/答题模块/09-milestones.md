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

## v1.2 阶段（问卷星 + kesixin/dati 借鉴，2026-08-06 设计）

> PRD v1.2 新增考卷设置/题目设置/考卷发放三块,待用户确认基调后推进。

| 阶段 | 内容 | Agent | 依赖 |
|:--:|------|------|:--:|
| S1 | 数据模型 + 后端：exam_papers/questions 新字段 DDL；随机抽题/乱序/成绩掩码/范围扩展(user/role)/发布通知/一键催考/导出 API | common-agent(DDL) + core-agent | R6 已上线基线 |
| S2 | Web 端：考卷设置弹窗(组卷方式/乱序/成绩展示/范围四选)、选题区分组、记录页导出+催考、试卷页公布成绩 | webapp-core-agent | S1 |
| S3 | 小程序端：按分组分区渲染、等待公布态、消息中心跳转考试列表 | miniapp-core-agent | S1 |
| S4 | 集成验收 + 上线（08-acceptance v1.2 清单） | 全员 | S1-S3 |

> S1-S3 顺序推进;S4 依赖全部。kesixin/dati 的答题卡跳转/背题模式/错题本/排行已分别在既有 P0 答题卡、P1 错题本、P2 背题/排行体现,本期不新增页面。

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
