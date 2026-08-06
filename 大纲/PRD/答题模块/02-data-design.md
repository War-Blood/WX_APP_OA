# 02 — 数据设计

## ER 图

```
exam_categories (分类树)        exam_questions (题库)
┌──────────────┐               ┌──────────────────┐
│ id (PK)      │◄──┐           │ id (PK)          │
│ parent_id    │   │ 1:N       │ category_id (FK) │──► exam_categories.id
│ name         │   └───────────│ type (单选/多选/判断)│
│ path         │               │ title            │
│ sort_order   │               │ options (JSON)   │
└──────────────┘               │ answer           │
                               │ analysis         │
                               │ score            │
                               │ score_mode       │
                               │ shuffle_options  │
                               │ status           │
                               │ created_by       │──► users.id
                               └──────────────────┘

exam_papers (试卷)              exam_records (考试记录)
┌──────────────────┐           ┌──────────────────────┐
│ id (PK)          │           │ id (PK)              │
│ title            │◄──┐       │ user_id (FK)         │──► users.id
│ description      │   │ 1:N   │ paper_id (FK)        │──► exam_papers.id
│ duration         │   └───────│ paper_version        │
│ pass_score       │           │ mode (练习/考试)      │
│ total_score      │           │ answers (JSON)       │
│ max_attempts     │           │ question_snapshot(JSON)│
│ max_screenshot_warns│        │ score                │
│ scope_type(all/dept/user/  │ │ total_score          │
│   role)                    │ │ is_pass              │
│ scope_departments(JSON)    │ │ warn_count           │
│ scope_users (JSON)         │ │ server_time          │
│ scope_roles (JSON)         │ │ start_time           │
│ draw_rules(JSON) 抽题规则   │ │ end_time             │
│ shuffle_questions/options  │ │ status(doing/提交/超时/作弊)│
│ sections(JSON) 分组        │ │ created_at           │
│ result_visibility/released │ │                      │
│ question_ids (JSON)        │ │                      │
│ status (草稿/发布/归档)    │ │                      │
│ version                    │ │                      │
│ created_by       │──► users.id│                      │
└──────────────────┘           └──────────────────────┘
```

## 完整建表 DDL

```sql
-- 题库分类表
CREATE TABLE exam_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED DEFAULT 0 COMMENT '父级ID, 0=顶级',
  name VARCHAR(50) NOT NULL,
  path VARCHAR(200) COMMENT '路径 如 安全/生产安全',
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题库分类';

-- 题库表
CREATE TABLE exam_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED COMMENT '分类ID',
  type ENUM('single','multiple','judge') NOT NULL DEFAULT 'single',
  title TEXT NOT NULL COMMENT '题干',
  options JSON NOT NULL COMMENT '[{"key":"A","text":"..."}]',
  answer VARCHAR(20) NOT NULL COMMENT '多选逗号分隔',
  analysis TEXT COMMENT '解析',
  score INT NOT NULL DEFAULT 2 COMMENT '分值',
  score_mode ENUM('exact','partial') DEFAULT 'exact',
  shuffle_options TINYINT(1) DEFAULT 0 COMMENT '本题目选项是否随机排列',
  status ENUM('active','disabled') DEFAULT 'active',
  created_by INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试题库';

-- 试卷表
CREATE TABLE exam_papers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration INT NOT NULL DEFAULT 60 COMMENT '考试时长(分钟)',
  pass_score INT NOT NULL DEFAULT 60,
  total_score INT NOT NULL DEFAULT 100,
  max_attempts INT DEFAULT 1 COMMENT '0=无限',
  max_screenshot_warns INT DEFAULT 2,
  scope_type ENUM('all','department','user','role') DEFAULT 'all',
  scope_departments JSON COMMENT '[1,2,3]',
  scope_users JSON COMMENT '[userId...] 指定用户范围',
  scope_roles JSON COMMENT '[role...] 指定角色范围',
  draw_rules JSON COMMENT '随机抽题规则 [{"type":"single","categoryId":0,"count":10,"score":2}] 空=手动选题',
  shuffle_questions TINYINT(1) DEFAULT 0 COMMENT '题目顺序随机',
  shuffle_options TINYINT(1) DEFAULT 0 COMMENT '选项顺序随机(与单题开关取或)',
  sections JSON COMMENT '[{"name":"单选部分","questionIds":[1,2,3]}] 试卷内分组,可选',
  result_visibility ENUM('immediate','manual') DEFAULT 'immediate' COMMENT '成绩展示:交卷立即/公布后',
  result_released TINYINT(1) DEFAULT 0 COMMENT 'manual模式下管理员已公布成绩',
  start_time DATETIME COMMENT '考试窗口开始时间(北京时间)',
  end_time DATETIME COMMENT '考试窗口结束时间(到点强制交卷)',
  question_ids JSON NOT NULL,
  status ENUM('draft','published','archived') DEFAULT 'draft',
  version INT DEFAULT 1,
  created_by INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试试卷';

-- 考试记录表
CREATE TABLE exam_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  paper_id INT UNSIGNED NOT NULL,
  paper_version INT,
  mode ENUM('practice','exam') NOT NULL DEFAULT 'practice',
  answers JSON COMMENT '{"1":"A"}',
  question_snapshot JSON NOT NULL,
  score INT DEFAULT NULL,
  total_score INT NOT NULL,
  is_pass TINYINT(1) DEFAULT NULL,
  warn_count INT DEFAULT 0,
  server_time DATETIME COMMENT '服务器计时基准',
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  status ENUM('doing','submitted','timeout','cheated') DEFAULT 'doing',
  UNIQUE KEY uk_user_paper_doing (user_id, paper_id),
  INDEX idx_user (user_id),
  INDEX idx_paper (paper_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试记录';
```

## 索引策略

| 表 | 索引 | 用途 |
|----|------|------|
| exam_categories | `idx_parent` | 分类树查询（推进阶段补） |
| exam_questions | `idx_category` | 按分类筛选 |
| exam_questions | `idx_status` | 只查 active 题目 |
| exam_papers | `idx_status` | 考试列表只查 published |
| exam_records | `idx_user` | 查我的考试记录 |
| exam_records | `idx_paper` | 按试卷统计 |
| exam_records | `uk_user_paper_doing` | 防并发重复、恢复考试 |
| exam_records | `idx_start_time` | 定时扫 doing 僵尸记录 |

## 迁移脚本

```sql
-- 执行路径: mysql -u root -p wx_app_oa < sql/v3.0_exam.sql
-- 或通过 PM2: npm run migrate
-- 待办: 并入 backend/scripts/init-db.js(推进阶段 G 项)
```

## 设计确认与错题本（2026-08-05 调研后）

- **表结构确认**:4 张表与 GitHub 参考项目(学之思等)同构,且 `question_snapshot` 快照 / `version` 版本字段更优,**无需为对齐参考而改表**。
- **错题本(P1)**:不新增表,从 `exam_records.answers` + `question_snapshot` 推导 `correct=false` 的题目,关联题库解析展示。
- **exam_categories**:表已建但无 CRUD,**分类树管理为 P0 遗留缺口**(推进阶段补 API/UI)。
- **建表待办**:`sql/v3.0_exam.sql` 尚未并入 `init-db.js`,推进阶段需合入标准初始化流程。

## 考卷/题目/发放字段扩展（2026-08-06 问卷星借鉴）

> 全部为新增字段,`question_ids` 保留全量 id 作兼容;现有数据不受影响。推进阶段由 `sql/v3.0_exam.sql` + `init-db.js` 一并迁移。

| 表 | 新增字段 | 说明 |
|----|---------|------|
| exam_questions | `shuffle_options` | 每题选项随机开关 |
| exam_papers | `draw_rules` | 随机抽题规则,非空时忽略手动选题 |
| exam_papers | `shuffle_questions` / `shuffle_options` | 试卷级乱序开关 |
| exam_papers | `sections` | 试卷内分组,可选;答题端按分组渲染 |
| exam_papers | `result_visibility` / `result_released` | 成绩展示控制(立即/公布后) |
| exam_papers | `scope_users` / `scope_roles` | 发放范围扩展;`scope_type` 扩为四枚举 |

> **设计决策**:①`draw_rules` 非空时开始考试按规则随机抽题并冻结进 `question_snapshot`(同一考生重进复用,不同考生不同卷);②乱序在**组装快照时**执行,判分基于快照内 answer,不受乱序影响;③`manual` 成绩展示仅掩码返回(库内照常判分),`result_released=1` 后对员工可见。
