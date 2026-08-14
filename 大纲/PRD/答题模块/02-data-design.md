# 02 — 数据设计

## ER 图

```
exam_categories (分类, 支持二级)     exam_questions (题库)
┌──────────────────┐               ┌──────────────────┐
│ id (PK)          │◄──┐           │ id (PK)          │
│ parent_id        │   │ 1:N       │ category_id (FK) │──► exam_categories.id
│ name             │   └───────────│ type (单选/多选/判断)│
│ cover            │               │ title            │
│ question_num     │               │ options (JSON)   │
│ time             │               │ answer           │
│ path / sort_order│               │ analysis         │
└──────────────────┘               │ score / score_mode│
                                   │ status           │
                                   │ created_by ──► users.id
                                   └──────────────────┘

exam_records (答题记录, 复用)         exam_settings (答题设置)
┌──────────────────────┐           ┌──────────────────┐
│ id (PK)              │           │ id (PK)          │
│ user_id (FK)──►users │           │ setting_key (UNIQUE)│
│ category_id (FK)     │           │ setting_value    │
│ mode(练习/模拟/考试)  │           │ description      │
│ answers (JSON)       │           └──────────────────┘
│ question_snapshot    │
│ score / total_score  │           exam_wrong_questions (错题)
│ use_time             │           ┌──────────────────┐
│ status(doing/提交/超时)│           │ id, user_id      │
│ server_time/start/end│           │ question_id      │
└──────────────────────┘           │ wrong_count      │
                                   └──────────────────┘
                                   exam_favorites (收藏)
                                   ┌──────────────────┐
                                   │ id, user_id      │
                                   │ question_id      │
                                   └──────────────────┘
```

## 完整建表 DDL

```sql
-- 1. 分类表（dati questionMenu；v2.0 扩展字段）
CREATE TABLE IF NOT EXISTS exam_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED DEFAULT 0 COMMENT '父级ID, 0=顶级, 支持二级',
  name VARCHAR(50) NOT NULL,
  cover VARCHAR(500) DEFAULT NULL COMMENT '封面图URL (dati questionMenu.cover)',
  question_num INT DEFAULT 0 COMMENT '显示题量, 实际按题库统计',
  time INT DEFAULT 10 COMMENT '建议答题时长(分钟) (dati questionMenu.time)',
  path VARCHAR(200) COMMENT '路径 如 安全/生产安全',
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题库分类';

-- 2. 题库表（dati questions；v1.0 结构已满足，v2.0 保留）
CREATE TABLE IF NOT EXISTS exam_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED COMMENT '分类ID',
  type ENUM('single','multiple','judge') NOT NULL DEFAULT 'single',
  title TEXT NOT NULL COMMENT '题干',
  options JSON NOT NULL COMMENT '[{"key":"A","text":"..."}]',
  answer VARCHAR(20) NOT NULL COMMENT '多选逗号分隔, 如 B,C',
  analysis TEXT COMMENT '解析',
  title_image VARCHAR(500) DEFAULT NULL COMMENT '题干图片URL (可选)',
  analysis_image VARCHAR(500) DEFAULT NULL COMMENT '解析图片URL (可选)',
  score INT NOT NULL DEFAULT 2 COMMENT '分值',
  score_mode ENUM('exact','partial') DEFAULT 'exact' COMMENT '多选判分: 全对/漏选部分分',
  shuffle_options TINYINT(1) DEFAULT 0 COMMENT '本题目选项是否随机排列',
  status ENUM('active','disabled') DEFAULT 'active',
  created_by INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试题库';

-- 3. 答题记录表（dati history；v2.0 重建: 去 paper_id/防作弊字段）
CREATE TABLE IF NOT EXISTS exam_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL COMMENT 'OA 用户',
  category_id INT UNSIGNED NOT NULL COMMENT '分类ID (dati history.menuId)',
  mode ENUM('practice','exam','mock') NOT NULL DEFAULT 'practice',
  answers JSON COMMENT '{"1":"A","2":"B,C"}',
  question_snapshot JSON NOT NULL COMMENT '题目快照冻结',
  score INT DEFAULT NULL,
  total_score INT NOT NULL,
  use_time INT DEFAULT 0 COMMENT '用时(秒) (dati history.useTime)',
  status ENUM('doing','submitted','timeout') DEFAULT 'doing',
  server_time DATETIME COMMENT '服务器计时基准',
  start_time DATETIME NOT NULL,
  end_time DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  KEY idx_user_category_mode (user_id, category_id, mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='答题记录';

-- 4. 答题设置表（dati setting）
CREATE TABLE IF NOT EXISTS exam_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(50) NOT NULL UNIQUE COMMENT 'use_learn',
  setting_value VARCHAR(255) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='答题设置';

-- 5. 错题本（dati 本地 storage 改服务端持久化）
CREATE TABLE IF NOT EXISTS exam_wrong_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  wrong_count INT DEFAULT 1,
  last_wrong_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_question (user_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='错题本';

-- 6. 收藏（dati 本地 storage 改服务端持久化）
CREATE TABLE IF NOT EXISTS exam_favorites (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_question (user_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目收藏';

-- 设置表种子数据（check_user 已废弃移除，v2.2）
INSERT IGNORE INTO exam_settings (setting_key, setting_value, description) VALUES
  ('use_learn', '1', '是否开放练习/背题模式 (1=开 0=关)');
```

## 索引策略

| 表 | 索引 | 用途 |
|----|------|------|
| exam_categories | `idx_parent` | 分类树查询 |
| exam_questions | `idx_category` / `idx_status` | 按分类/启用状态筛选 |
| exam_records | `idx_user` / `idx_category` / `idx_status` | 我的记录 / 按分类统计 / 超时扫描 |
| exam_records | `idx_user_category_mode` | 我的记录/断线恢复查询；防并发开始由应用层"先查 doing 再插"保证 |
| exam_settings | `setting_key` (UNIQUE) | 键值读取 |
| exam_wrong_questions / exam_favorites | `uk_user_question` | 去重 upsert |

## 迁移说明（v2.0）

| 旧表 | 处置 |
|------|------|
| exam_categories | **保留数据**，`ALTER` 增加 `cover / question_num / time` 三列 |
| exam_questions | **保留数据**（低压电工题库种子复用），列结构不变 |
| exam_papers | **DROP**（试卷模型整体删除） |
| exam_records | **DROP 重建**（schema 从 paper_id 改为 category_id + mode，去掉防作弊字段） |
| — | 新增 `exam_settings / exam_wrong_questions / exam_favorites` |

> 执行路径：并入 `backend/scripts/init-db.js`（建表 + 幂等列迁移），生产部署 `npm run migrate` 或重启时 init-db 幂等执行。

## 设计决策

1. **快照冻结**：开始考试/模拟/练习时，把抽到的题目（不含 answer）冻结进 `question_snapshot`，判分基于快照内 answer，改题库不影响进行中的答卷。
2. **练习记录不持久化**：练习提交后**删除**对应 record（沿用 `需求修改/1.md` 第 1 条决策，避免数据库膨胀）；考试/模拟记录保留。
3. **错题/收藏走服务端**：答错题在 submit 时 upsert 进 `exam_wrong_questions`，练习（不落记录）也能归集错题。
4. **二级分类抽题**：按父分类抽题时聚合该分类子树下全部题目（`category_id IN (self + children)`）。