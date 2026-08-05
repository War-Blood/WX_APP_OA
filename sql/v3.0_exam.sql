-- 考试模块 v3.0 — 建表 DDL
-- 执行: mysql -u root -p wx_app_oa < sql/v3.0_exam.sql

-- 题库分类表（树形结构）
CREATE TABLE IF NOT EXISTS exam_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED DEFAULT 0 COMMENT '父级ID, 0=顶级',
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  path VARCHAR(200) COMMENT '路径 如 安全/生产安全',
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题库分类';

-- 题库表
CREATE TABLE IF NOT EXISTS exam_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED COMMENT '分类ID',
  type ENUM('single','multiple','judge') NOT NULL DEFAULT 'single' COMMENT '题型',
  title TEXT NOT NULL COMMENT '题干',
  options JSON NOT NULL COMMENT '[{"key":"A","text":"..."}]',
  answer VARCHAR(20) NOT NULL COMMENT '多选逗号分隔如 A,B',
  analysis TEXT COMMENT '解析',
  score INT NOT NULL DEFAULT 2 COMMENT '分值',
  score_mode ENUM('exact','partial') DEFAULT 'exact' COMMENT '多选评分模式',
  status ENUM('active','disabled') DEFAULT 'active',
  created_by INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试题库';

-- 试卷表
CREATE TABLE IF NOT EXISTS exam_papers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '试卷名称',
  description TEXT COMMENT '试卷说明',
  duration INT NOT NULL DEFAULT 60 COMMENT '考试时长(分钟)',
  pass_score INT NOT NULL DEFAULT 60 COMMENT '合格分数',
  total_score INT NOT NULL DEFAULT 100 COMMENT '总分',
  max_attempts INT DEFAULT 1 COMMENT '0=无限',
  max_screenshot_warns INT DEFAULT 2 COMMENT '截屏警告上限',
  scope_type ENUM('all','department') DEFAULT 'all' COMMENT '参加范围',
  scope_departments JSON COMMENT '[1,2,3]',
  start_time DATETIME COMMENT '考试窗口开始时间(北京时间)',
  end_time DATETIME COMMENT '考试窗口结束时间(到点强制交卷)',
  question_ids JSON NOT NULL COMMENT '题目ID数组',
  status ENUM('draft','published','archived') DEFAULT 'draft',
  version INT DEFAULT 1,
  created_by INT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试试卷';

-- 考试记录表
CREATE TABLE IF NOT EXISTS exam_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL COMMENT '考生',
  paper_id INT UNSIGNED NOT NULL COMMENT '试卷',
  paper_version INT COMMENT '试卷版本',
  mode ENUM('practice','exam') NOT NULL DEFAULT 'practice' COMMENT '练习/考试',
  answers JSON COMMENT '{"1":"A"}',
  question_snapshot JSON NOT NULL COMMENT '考试开始时冻结的完整题目',
  score INT DEFAULT NULL COMMENT '得分',
  total_score INT NOT NULL COMMENT '总分',
  is_pass TINYINT(1) DEFAULT NULL COMMENT '是否合格',
  warn_count INT DEFAULT 0 COMMENT '截屏警告次数',
  server_time DATETIME COMMENT '服务器计时基准',
  start_time DATETIME NOT NULL COMMENT '开始时间',
  end_time DATETIME COMMENT '交卷时间',
  status ENUM('doing','submitted','timeout','cheated') DEFAULT 'doing',
  INDEX idx_user (user_id),
  INDEX idx_paper (paper_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考试记录';
