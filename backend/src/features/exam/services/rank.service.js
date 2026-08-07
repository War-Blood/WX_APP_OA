'use strict';

const db = require('../../../common/config/database');

/**
 * 排行榜服务 — 按分类按人最高分 + 最优用时
 */

/**
 * 分类排行榜
 * @param {number} categoryId - 分类ID
 * @returns {Promise<Array>} 排行列表(前50)
 */
async function rank(categoryId) {
  const rows = await db.query(
    `SELECT r.user_id, MAX(r.score) AS bestScore, MIN(r.use_time) AS bestTime,
            u.nickname AS userName, d.name AS departmentName
     FROM exam_records r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     WHERE r.category_id = ? AND r.mode IN ('exam','mock')
       AND r.status = 'submitted' AND r.score IS NOT NULL
     GROUP BY r.user_id, u.nickname, d.name
     ORDER BY bestScore DESC, bestTime ASC
     LIMIT 50`,
    [categoryId]
  );
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    userName: r.userName || '',
    departmentName: r.departmentName || '',
    score: r.bestScore,
    useTime: r.bestTime || 0,
  }));
}

module.exports = { rank };
