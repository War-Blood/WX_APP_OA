'use strict';

/**
 * 数据库初始化脚本
 * 创建 M2 阶段所有基础表（CREATE TABLE IF NOT EXISTS）
 *
 * 使用方式：
 *   npm run init-db
 *   或
 *   node scripts/init-db.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('../src/common/config/env');

// 建表 SQL — wx_app_oa 数据库
const CREATE_TABLES_SQL = `

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`openid\` VARCHAR(64) NOT NULL COMMENT '微信 OpenID',
  \`unionid\` VARCHAR(64) DEFAULT NULL COMMENT '微信 UnionID',
  \`nickname\` VARCHAR(100) DEFAULT NULL COMMENT '微信昵称',
  \`avatar_url\` VARCHAR(500) DEFAULT NULL COMMENT '微信头像 URL',
  \`phone\` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  \`email\` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  \`user_name\` VARCHAR(50) NOT NULL COMMENT '真实姓名/用户名',
  \`department\` VARCHAR(100) DEFAULT NULL COMMENT '所属部门名称',
  \`department_id\` INT UNSIGNED DEFAULT NULL COMMENT '所属部门 ID',
  \`position\` VARCHAR(100) DEFAULT NULL COMMENT '职位',
  \`role\` VARCHAR(20) NOT NULL DEFAULT 'employee' COMMENT '角色: employee/admin/superadmin',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
  \`last_login_at\` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_openid\` (\`openid\`),
  KEY \`idx_department\` (\`department\`),
  KEY \`idx_role\` (\`role\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 2. 部门表
-- ============================================
CREATE TABLE IF NOT EXISTS \`departments\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`name\` VARCHAR(100) NOT NULL COMMENT '部门名称',
  \`parent_id\` INT UNSIGNED DEFAULT NULL COMMENT '上级部门 ID',
  \`manager_id\` INT UNSIGNED DEFAULT NULL COMMENT '部门负责人用户 ID',
  \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '排序序号',
  \`description\` VARCHAR(500) DEFAULT NULL COMMENT '部门描述',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_parent_id\` (\`parent_id\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- ============================================
-- 3. 审批类型表
-- ============================================
CREATE TABLE IF NOT EXISTS \`approval_types\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`type_key\` VARCHAR(50) NOT NULL COMMENT '类型标识: leave/expense/seal/travel/purchase/general',
  \`name\` VARCHAR(100) NOT NULL COMMENT '类型名称',
  \`icon\` VARCHAR(200) DEFAULT NULL COMMENT '图标 URL',
  \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '排序序号',
  \`need_attachment\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要附件',
  \`need_remark\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要备注',
  \`form_template\` JSON DEFAULT NULL COMMENT '表单模板（字段定义）',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_type_key\` (\`type_key\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批类型表';

-- ============================================
-- 4. 审批实例表
-- ============================================
CREATE TABLE IF NOT EXISTS \`approval_instances\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`applicant_id\` INT UNSIGNED NOT NULL COMMENT '申请人用户 ID',
  \`approval_type_id\` INT UNSIGNED NOT NULL COMMENT '审批类型 ID',
  \`title\` VARCHAR(200) NOT NULL COMMENT '审批标题',
  \`form_data\` JSON DEFAULT NULL COMMENT '表单数据',
  \`attachments\` JSON DEFAULT NULL COMMENT '附件列表',
  \`urgent\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否加急',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/approved/rejected/cancelled',
  \`current_node_id\` INT UNSIGNED DEFAULT NULL COMMENT '当前流程节点 ID',
  \`completed_at\` DATETIME DEFAULT NULL COMMENT '审批完成时间',
  \`remark\` VARCHAR(1000) DEFAULT NULL COMMENT '备注',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_applicant_id\` (\`applicant_id\`),
  KEY \`idx_approval_type\` (\`approval_type_id\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批实例表';

-- ============================================
-- 5. 审批流程节点表
-- ============================================
CREATE TABLE IF NOT EXISTS \`approval_flow_nodes\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`instance_id\` INT UNSIGNED NOT NULL COMMENT '审批实例 ID',
  \`node_order\` INT NOT NULL COMMENT '节点序号',
  \`approver_id\` INT UNSIGNED NOT NULL COMMENT '审批人用户 ID',
  \`action\` VARCHAR(20) DEFAULT NULL COMMENT '操作: approved/rejected/pending',
  \`comment\` VARCHAR(1000) DEFAULT NULL COMMENT '审批意见',
  \`acted_at\` DATETIME DEFAULT NULL COMMENT '操作时间',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_instance_id\` (\`instance_id\`),
  KEY \`idx_approver_id\` (\`approver_id\`),
  KEY \`idx_action\` (\`action\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流程节点表';

-- ============================================
-- 6. 日报表
-- ============================================
CREATE TABLE IF NOT EXISTS \`daily_reports\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`user_id\` INT UNSIGNED NOT NULL COMMENT '用户 ID',
  \`report_date\` DATE NOT NULL COMMENT '日报日期',
  \`content\` TEXT NOT NULL COMMENT '日报内容',
  \`today_work\` TEXT COMMENT '今日工作',
  \`tomorrow_plan\` TEXT COMMENT '明日计划',
  \`issues\` TEXT COMMENT '遇到的问题',
  \`mood\` VARCHAR(20) DEFAULT NULL COMMENT '工作心情',
  \`attachments\` JSON DEFAULT NULL COMMENT '附件列表',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/submitted',
  \`submitted_at\` DATETIME DEFAULT NULL COMMENT '提交时间',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_user_date\` (\`user_id\`, \`report_date\`),
  KEY \`idx_report_date\` (\`report_date\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日报表';

-- ============================================
-- 7. 消息表
-- ============================================
CREATE TABLE IF NOT EXISTS \`messages\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`sender_id\` INT UNSIGNED DEFAULT NULL COMMENT '发送者用户 ID（系统消息为 NULL）',
  \`receiver_id\` INT UNSIGNED NOT NULL COMMENT '接收者用户 ID',
  \`type\` VARCHAR(30) NOT NULL COMMENT '消息类型: approval/system/announcement',
  \`title\` VARCHAR(200) NOT NULL COMMENT '消息标题',
  \`content\` TEXT COMMENT '消息内容',
  \`ref_id\` INT UNSIGNED DEFAULT NULL COMMENT '关联业务 ID',
  \`ref_type\` VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型',
  \`is_read\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读',
  \`read_at\` DATETIME DEFAULT NULL COMMENT '阅读时间',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_receiver_id\` (\`receiver_id\`),
  KEY \`idx_type\` (\`type\`),
  KEY \`idx_is_read\` (\`is_read\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- ============================================
-- 8. 公告表
-- ============================================
CREATE TABLE IF NOT EXISTS \`announcements\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`title\` VARCHAR(200) NOT NULL COMMENT '公告标题',
  \`content\` TEXT NOT NULL COMMENT '公告内容',
  \`author_id\` INT UNSIGNED NOT NULL COMMENT '发布人用户 ID',
  \`priority\` VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  \`target_departments\` JSON DEFAULT NULL COMMENT '目标部门 ID 列表（NULL 表示全部）',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published/cancelled',
  \`published_at\` DATETIME DEFAULT NULL COMMENT '发布时间',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_priority\` (\`priority\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_published_at\` (\`published_at\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告表';

-- ============================================
-- 9. 项目表
-- ============================================
CREATE TABLE IF NOT EXISTS \`projects\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`name\` VARCHAR(200) NOT NULL COMMENT '项目名称',
  \`description\` TEXT COMMENT '项目描述',
  \`department_id\` INT UNSIGNED DEFAULT NULL COMMENT '所属部门 ID',
  \`manager_id\` INT UNSIGNED DEFAULT NULL COMMENT '项目经理用户 ID',
  \`members\` JSON DEFAULT NULL COMMENT '项目成员用户 ID 列表',
  \`start_date\` DATE DEFAULT NULL COMMENT '开始日期',
  \`end_date\` DATE DEFAULT NULL COMMENT '结束日期',
  \`priority\` VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'planning' COMMENT '状态: planning/in_progress/completed/on_hold/cancelled',
  \`progress\` INT NOT NULL DEFAULT 0 COMMENT '进度百分比 0-100',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_department\` (\`department_id\`),
  KEY \`idx_manager\` (\`manager_id\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目表';

-- ============================================
-- 10. 任务表
-- ============================================
CREATE TABLE IF NOT EXISTS \`tasks\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`project_id\` INT UNSIGNED DEFAULT NULL COMMENT '所属项目 ID',
  \`title\` VARCHAR(200) NOT NULL COMMENT '任务标题',
  \`description\` TEXT COMMENT '任务描述',
  \`assignee_id\` INT UNSIGNED DEFAULT NULL COMMENT '负责人用户 ID',
  \`creator_id\` INT UNSIGNED NOT NULL COMMENT '创建人用户 ID',
  \`priority\` VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'todo' COMMENT '状态: todo/in_progress/done/cancelled',
  \`due_date\` DATETIME DEFAULT NULL COMMENT '截止日期',
  \`completed_at\` DATETIME DEFAULT NULL COMMENT '完成时间',
  \`sort_order\` INT NOT NULL DEFAULT 0 COMMENT '排序序号',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_project_id\` (\`project_id\`),
  KEY \`idx_assignee\` (\`assignee_id\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_due_date\` (\`due_date\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表';

-- ============================================
-- 11. 资产表（办公用品/固定资产）
-- ============================================
CREATE TABLE IF NOT EXISTS \`assets\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`name\` VARCHAR(200) NOT NULL COMMENT '资产名称',
  \`category\` VARCHAR(50) NOT NULL COMMENT '资产分类: office_supply/fixed_asset/software/other',
  \`asset_no\` VARCHAR(100) DEFAULT NULL COMMENT '资产编号',
  \`specification\` VARCHAR(500) DEFAULT NULL COMMENT '规格型号',
  \`quantity\` INT NOT NULL DEFAULT 1 COMMENT '数量',
  \`unit\` VARCHAR(20) DEFAULT NULL COMMENT '单位',
  \`price\` DECIMAL(10, 2) DEFAULT NULL COMMENT '单价',
  \`total_price\` DECIMAL(10, 2) DEFAULT NULL COMMENT '总价',
  \`purchase_date\` DATE DEFAULT NULL COMMENT '采购日期',
  \`department_id\` INT UNSIGNED DEFAULT NULL COMMENT '使用部门 ID',
  \`keeper_id\` INT UNSIGNED DEFAULT NULL COMMENT '保管人用户 ID',
  \`location\` VARCHAR(200) DEFAULT NULL COMMENT '存放位置',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'in_use' COMMENT '状态: in_use/borrowed/maintenance/scrapped',
  \`remark\` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  \`deleted_at\` DATETIME DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_category\` (\`category\`),
  KEY \`idx_department\` (\`department_id\`),
  KEY \`idx_keeper\` (\`keeper_id\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产表';

-- ============================================
-- 12. 操作日志表
-- ============================================
CREATE TABLE IF NOT EXISTS \`operation_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键（使用 BIGINT 防溢出）',
  \`user_id\` INT UNSIGNED DEFAULT NULL COMMENT '操作用户 ID',
  \`action\` VARCHAR(50) NOT NULL COMMENT '操作类型: create/update/delete/approve/reject/export/login',
  \`module\` VARCHAR(50) NOT NULL COMMENT '操作模块: user/approval/report/asset/project',
  \`target_id\` INT UNSIGNED DEFAULT NULL COMMENT '操作对象 ID',
  \`target_type\` VARCHAR(50) DEFAULT NULL COMMENT '操作对象类型',
  \`detail\` JSON DEFAULT NULL COMMENT '操作详情',
  \`ip_address\` VARCHAR(45) DEFAULT NULL COMMENT '操作 IP 地址',
  \`user_agent\` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_user_id\` (\`user_id\`),
  KEY \`idx_action\` (\`action\`),
  KEY \`idx_module\` (\`module\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ============================================
-- 13. 系统配置表
-- ============================================
CREATE TABLE IF NOT EXISTS \`system_config\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`config_key\` VARCHAR(100) NOT NULL COMMENT '配置键',
  \`config_value\` TEXT NOT NULL COMMENT '配置值',
  \`config_group\` VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '配置分组',
  \`description\` VARCHAR(500) DEFAULT NULL COMMENT '配置说明',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_config_key\` (\`config_key\`),
  KEY \`idx_config_group\` (\`config_group\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================
-- 14. 答题模块分类表（v2.0: 合并 dati questionMenu 扩展字段）
-- ============================================
CREATE TABLE IF NOT EXISTS \`exam_categories\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`parent_id\` INT UNSIGNED DEFAULT 0 COMMENT '父级ID, 0=顶级, 支持二级',
  \`name\` VARCHAR(50) NOT NULL COMMENT '分类名称',
  \`cover\` VARCHAR(500) DEFAULT NULL COMMENT '封面图URL (dati questionMenu.cover)',
  \`question_num\` INT DEFAULT 0 COMMENT '显示题量, 实际按题库统计',
  \`time\` INT DEFAULT 10 COMMENT '建议答题时长(分钟) (dati questionMenu.time)',
  \`path\` VARCHAR(200) DEFAULT NULL COMMENT '路径 如 安全/生产安全',
  \`sort_order\` INT DEFAULT 0 COMMENT '排序序号',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_parent\` (\`parent_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块分类表';

-- ============================================
-- 15. 答题模块题库表
-- ============================================
CREATE TABLE IF NOT EXISTS \`exam_questions\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`category_id\` INT UNSIGNED DEFAULT NULL COMMENT '分类ID',
  \`type\` ENUM('single','multiple','judge') NOT NULL DEFAULT 'single' COMMENT '题型',
  \`title\` TEXT NOT NULL COMMENT '题干',
  \`options\` JSON NOT NULL COMMENT '选项 [{"key":"A","text":"..."}]',
  \`answer\` VARCHAR(20) NOT NULL COMMENT '正确答案(多选逗号分隔)',
  \`analysis\` TEXT DEFAULT NULL COMMENT '解析',
  \`score\` INT NOT NULL DEFAULT 2 COMMENT '分值',
  \`score_mode\` ENUM('exact','partial') DEFAULT 'exact' COMMENT '判分模式',
  \`status\` ENUM('active','disabled') DEFAULT 'active' COMMENT '状态',
  \`created_by\` INT UNSIGNED DEFAULT NULL COMMENT '创建人',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_category\` (\`category_id\`),
  KEY \`idx_type\` (\`type\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块题库表';

-- ============================================
-- 16. 答题模块答题记录表（v2.0 重建: category_id + mode 三值, 去防作弊字段）
-- ============================================
CREATE TABLE IF NOT EXISTS \`exam_records\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`user_id\` INT UNSIGNED NOT NULL COMMENT '用户ID (OA users.id)',
  \`category_id\` INT UNSIGNED NOT NULL COMMENT '分类ID (dati history.menuId)',
  \`mode\` ENUM('practice','exam','mock') NOT NULL DEFAULT 'practice' COMMENT '模式: 练习/正式考试/模拟考试',
  \`answers\` JSON DEFAULT NULL COMMENT '答题结果 {"1":"A","2":"B,C"}',
  \`question_snapshot\` JSON NOT NULL COMMENT '题目快照冻结',
  \`score\` INT DEFAULT NULL COMMENT '得分',
  \`total_score\` INT NOT NULL COMMENT '总分',
  \`use_time\` INT DEFAULT 0 COMMENT '用时(秒) (dati history.useTime)',
  \`status\` ENUM('doing','submitted','timeout') DEFAULT 'doing' COMMENT '状态',
  \`server_time\` DATETIME DEFAULT NULL COMMENT '服务器计时基准',
  \`start_time\` DATETIME NOT NULL COMMENT '开始时间',
  \`end_time\` DATETIME DEFAULT NULL COMMENT '结束时间',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_user\` (\`user_id\`),
  KEY \`idx_category\` (\`category_id\`),
  KEY \`idx_status\` (\`status\`),
  KEY \`idx_start_time\` (\`start_time\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块答题记录表';

-- ============================================
-- 17. 答题模块答题设置表（v2.0 新增, dati setting）
-- ============================================
CREATE TABLE IF NOT EXISTS \`exam_settings\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`setting_key\` VARCHAR(50) NOT NULL COMMENT '配置键 (use_learn / check_user)',
  \`setting_value\` VARCHAR(255) NOT NULL COMMENT '配置值',
  \`description\` VARCHAR(500) DEFAULT NULL COMMENT '配置说明',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_setting_key\` (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块答题设置表';

-- ============================================
-- 18. 答题模块错题本表（v2.0 新增, 服务端持久化）
-- ============================================
CREATE TABLE IF NOT EXISTS \`exam_wrong_questions\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`user_id\` INT UNSIGNED NOT NULL COMMENT '用户ID',
  \`question_id\` INT UNSIGNED NOT NULL COMMENT '题目ID',
  \`wrong_count\` INT DEFAULT 1 COMMENT '答错次数',
  \`last_wrong_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最近答错时间',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_user_question\` (\`user_id\`,\`question_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块错题本表';

-- ============================================
-- 19. 答题模块收藏表（v2.0 新增, 服务端持久化）
-- ============================================
CREATE TABLE IF NOT EXISTS \`exam_favorites\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`user_id\` INT UNSIGNED NOT NULL COMMENT '用户ID',
  \`question_id\` INT UNSIGNED NOT NULL COMMENT '题目ID',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_user_question\` (\`user_id\`,\`question_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块收藏表';

-- ============================================
-- 20. 答题模块试卷表（v2.1 新增: 企业内部考核组卷/发放）
-- ============================================
CREATE TABLE IF NOT EXISTS \`exam_papers\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  \`title\` VARCHAR(200) NOT NULL COMMENT '试卷名称',
  \`description\` TEXT DEFAULT NULL COMMENT '试卷说明',
  \`duration\` INT NOT NULL DEFAULT 60 COMMENT '考试时长(分钟)',
  \`pass_score\` INT NOT NULL DEFAULT 60 COMMENT '合格分',
  \`total_score\` INT NOT NULL DEFAULT 100 COMMENT '总分',
  \`max_attempts\` INT DEFAULT 1 COMMENT '每人可考次数, 0=不限',
  \`scope_type\` ENUM('all','department','user','role') DEFAULT 'all' COMMENT '发放范围',
  \`scope_departments\` JSON DEFAULT NULL COMMENT '指定部门 [deptId...]',
  \`scope_users\` JSON DEFAULT NULL COMMENT '指定人员 [userId...]',
  \`scope_roles\` JSON DEFAULT NULL COMMENT '指定角色 [role...]',
  \`draw_rules\` JSON DEFAULT NULL COMMENT '随机抽题规则 [{"type":"single","categoryId":0,"count":10,"score":2}]',
  \`shuffle_questions\` TINYINT(1) DEFAULT 0 COMMENT '题目顺序随机',
  \`shuffle_options\` TINYINT(1) DEFAULT 0 COMMENT '选项顺序随机',
  \`question_ids\` JSON DEFAULT NULL COMMENT '手动选题ID数组 [id...]',
  \`start_time\` DATETIME DEFAULT NULL COMMENT '考试窗口开始(北京时间)',
  \`end_time\` DATETIME DEFAULT NULL COMMENT '考试窗口结束(到点强制交卷)',
  \`status\` ENUM('draft','published','archived') DEFAULT 'draft' COMMENT '状态',
  \`version\` INT DEFAULT 1 COMMENT '版本号',
  \`created_by\` INT UNSIGNED DEFAULT NULL COMMENT '创建人',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块试卷表';

`;

/**
 * 执行数据库初始化
 */
async function initDatabase() {
  const connectionConfig = {
    host: config.oaDb.host,
    port: config.oaDb.port,
    user: config.oaDb.user,
    password: config.oaDb.password,
    database: config.oaDb.name,
    charset: 'utf8mb4',
    multipleStatements: true,
  };

  console.log(`🔌 连接到数据库: ${config.oaDb.host}:${config.oaDb.port}/${config.oaDb.name}`);

  const connection = await mysql.createConnection(connectionConfig);

  try {
    console.log('📦 开始创建数据表...');

    // 逐条执行 SQL（multipleStatements 模式下同时执行多条）
    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.toUpperCase().includes('CREATE TABLE'));

    for (const stmt of statements) {
      const tableNameMatch = stmt.match(/CREATE TABLE IF NOT EXISTS\s+`(\w+)`/i);
      const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';
      try {
        await connection.execute(stmt + ';');
        console.log(`  ✅ 表 ${tableName} 就绪`);
      } catch (err) {
        console.error(`  ❌ 表 ${tableName} 创建失败: ${err.message}`);
      }
    }

    // ──── v2.0 答题模块迁移（合并 kesixin/dati 重建,幂等） ────
    async function columnExists(conn, table, column) {
      const [rows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
      );
      return rows[0].cnt > 0;
    }

    // 1) exam_categories 增加 dati 字段（缺列则 ALTER,保留既有分类/题库数据）
    const categoryV2Columns = [
      ['cover', "`cover` VARCHAR(500) DEFAULT NULL COMMENT '封面图URL'"],
      ['question_num', "`question_num` INT DEFAULT 0 COMMENT '显示题量'"],
      ['time', "`time` INT DEFAULT 10 COMMENT '建议答题时长(分钟)'"],
      ['updated_at', "`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'"],
    ];
    for (const [column, ddl] of categoryV2Columns) {
      try {
        if (!(await columnExists(connection, 'exam_categories', column))) {
          await connection.execute(`ALTER TABLE \`exam_categories\` ADD COLUMN ${ddl}`);
          console.log(`  ✅ 迁移 exam_categories.${column}`);
        }
      } catch (err) {
        console.error(`  ❌ 迁移 exam_categories.${column} 失败: ${err.message}`);
      }
    }

    // 1.5) exam_records 增加 paper_id（试卷制考试, 幂等）
    try {
      if (!(await columnExists(connection, 'exam_records', 'paper_id'))) {
        await connection.execute(
          "ALTER TABLE `exam_records` ADD COLUMN `paper_id` INT UNSIGNED DEFAULT NULL COMMENT '试卷ID (练习/背题为空)' AFTER `category_id`, ADD KEY `idx_paper` (`paper_id`)"
        );
        console.log('  ✅ 迁移 exam_records.paper_id');
      }
    } catch (err) {
      console.error(`  ❌ 迁移 exam_records.paper_id 失败: ${err.message}`);
    }

    // 2) 旧版 exam_papers（v1.x 考卷, 含 max_screenshot_warns/result_visibility）→ 删除; v2.1 新建表保留
    try {
      const [oldPaper] = await connection.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'exam_papers' AND column_name = 'max_screenshot_warns'`
      );
      if (oldPaper[0].cnt > 0) {
        await connection.execute('DROP TABLE IF EXISTS `exam_papers`');
        console.log('  ✅ 删除旧版 exam_papers（v1.x 考卷, v2.1 重建）');
      }
    } catch (err) {
      console.error(`  ❌ 检查/删除旧 exam_papers 失败: ${err.message}`);
    }

    // 3) 旧版 exam_records（v1.x, 含 is_pass/paper_version）→ DROP 后重建 v2.0 schema; v2.1 paper_id 不触发
    try {
      const [oldRecord] = await connection.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'exam_records' AND column_name = 'is_pass'`
      );
      if (oldRecord[0].cnt > 0) {
        await connection.execute('DROP TABLE IF EXISTS `exam_records`');
        console.log('  ✅ 删除旧版 exam_records（is_pass schema）');
      }
      await connection.execute(
        `CREATE TABLE IF NOT EXISTS \`exam_records\` (
          \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
          \`user_id\` INT UNSIGNED NOT NULL COMMENT '用户ID (OA users.id)',
          \`category_id\` INT UNSIGNED NOT NULL COMMENT '分类ID',
          \`mode\` ENUM('practice','exam','mock') NOT NULL DEFAULT 'practice' COMMENT '模式: 练习/正式考试/模拟考试',
          \`answers\` JSON DEFAULT NULL COMMENT '答题结果 {"1":"A"}',
          \`question_snapshot\` JSON NOT NULL COMMENT '题目快照冻结',
          \`score\` INT DEFAULT NULL COMMENT '得分',
          \`total_score\` INT NOT NULL COMMENT '总分',
          \`use_time\` INT DEFAULT 0 COMMENT '用时(秒)',
          \`status\` ENUM('doing','submitted','timeout') DEFAULT 'doing' COMMENT '状态',
          \`server_time\` DATETIME DEFAULT NULL COMMENT '服务器计时基准',
          \`start_time\` DATETIME NOT NULL COMMENT '开始时间',
          \`end_time\` DATETIME DEFAULT NULL COMMENT '结束时间',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          PRIMARY KEY (\`id\`),
          KEY \`idx_user\` (\`user_id\`),
          KEY \`idx_category\` (\`category_id\`),
          KEY \`idx_status\` (\`status\`),
          KEY \`idx_start_time\` (\`start_time\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答题模块答题记录表'`
      );
      console.log('  ✅ 重建 exam_records（category_id + mode 三值 schema）');
    } catch (err) {
      console.error(`  ❌ 重建 exam_records 失败: ${err.message}`);
    }

    // 4) 答题设置种子数据（幂等）
    try {
      await connection.execute(
        `INSERT IGNORE INTO exam_settings (setting_key, setting_value, description) VALUES
         ('use_learn', '1', '是否开放练习/背题模式 (1=开 0=关)'),
         ('check_user', '1', '是否仅登录用户可答题 (OA 恒有用户, 默认开)')`
      );
      console.log('  ✅ 答题设置种子数据就绪');
    } catch (err) {
      console.error(`  ❌ 答题设置种子失败: ${err.message}`);
    }

    console.log('✅ 数据库初始化完成！');
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行
initDatabase();
