'use strict';

const db = require('../../common/config/database');

/**
 * 格式化日期为 YYYY-MM-DD
 */
function fmt(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = new Date(d);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

/**
 * 获取审核通过的日报数据（平铺 JSON 数组）
 */
async function getReports() {
  const sql = `
    SELECT dr.*, u.user_name AS submitter_name
    FROM daily_reports dr
    LEFT JOIN users u ON dr.user_id = u.id
    WHERE dr.status = 'approved'
    ORDER BY dr.report_date DESC
    LIMIT 5000
  `;
  const rows = await db.query(sql);

  return rows.map(r => {
    const names = (r.workers || '').split(/[,，、\s]+/).filter(Boolean);
    return {
      日报时间: fmt(r.report_date),
      填写人: r.submitter_name || '',
      入场时间: fmt(r.entry_date),
      初始出差时间: fmt(r.initial_biz_trip_date),
      项目名称: r.project || '',
      项目所在区域: r.area || '',
      相关方单位: r.related_party || '',
      作业人员1: names[0] || '',
      作业人员2: names[1] || '',
      机型: r.machine_model || '',
      人数: parseInt(r.worker_count) || 0,
      从事工作内容: r.work_content || '',
      需要完成数量: parseInt(r.required_qty) || 0,
      累计完成数量: parseInt(r.completed_qty) || 0,
      当前进度: (() => { const v = r.progress_percent; if (!v || v === '#DIV/0!') return '0%'; const n = parseFloat(String(v)); return isNaN(n) ? '0%' : Math.round(n * 100) + '%'; })(),
      当日工作小结: r.today_work || '',
      明天工作内容: r.tomorrow_plan || '',
      今日工作类型: r.today_work_type || '',
      明日工作类型: r.tomorrow_work_type || '',
      备注: r.remark || '',
      项目出差天数: parseInt(r.biz_trip_days) || 0,
      个人累计出差: parseInt(r.personal_biz_trip_days) || 0,
    };
  });
}

/**
 * 导出 CSV（与 getReports 相同数据，CSV 格式）
 */
async function getReportsCSV() {
  const rows = await getReports();
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const vals = headers.map(h => {
      const v = row[h];
      if (v == null) return '';
      const s = String(v);
      // CSV 转义：含逗号、换行、引号时用双引号包裹
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    });
    csvRows.push(vals.join(','));
  }
  return csvRows.join('\n');
}

module.exports = { getReports, getReportsCSV };
