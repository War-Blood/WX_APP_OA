-- ============================================================
-- 审批抄送表 (approval_cc)
-- 用于存储审批实例的抄送人关系
-- 适用于：创建审批时指定抄送人
-- ============================================================

CREATE TABLE IF NOT EXISTS `approval_cc` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `instance_id` int(11) NOT NULL COMMENT '审批实例ID',
  `user_id` int(11) NOT NULL COMMENT '抄送人ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_instance_id` (`instance_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批抄送表';
