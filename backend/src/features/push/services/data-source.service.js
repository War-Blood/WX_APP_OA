'use strict';

const db = require('../../../common/config/database');
const coreStatsService = require('../../../core/services/stats.service');

/**
 * 预定义数据源注册表（条件判定 + 模板变量上下文）
 * 安全约束：白名单制，不支持任意 SQL；新增数据源只需扩展本文件。
 */

/**
 * 获取指定时区的日期部件
 * @param {string} timezone - IANA 时区名，如 'Asia/Shanghai'
 * @returns {{date: string, weekday: number, dayOfMonth: number, month: number}}
 */
function getDateParts(timezone) {
  const tz = timezone || 'Asia/Shanghai';
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  // en-CA 输出形如 "2026-08-18" 或带 weekday；取数组逐项解析
  const parts = fmt.formatToParts(new Date());
  const map = {};
  parts.forEach((p) => { if (p.type !== 'literal') map[p.type] = p.value; });
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    date: dateStr,
    weekday: weekdayMap[map.weekday] || new Date(dateStr + 'T00:00:00Z').getUTCDay() + 1,
    day_of_month: parseInt(map.day, 10),
    month: parseInt(map.month, 10),
  };
}

/**
 * N 天前的日期字符串
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} days - 往前推的天数
 * @returns {string} YYYY-MM-DD
 */
function minusDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

/**
 * 数据源注册表：source id → 元信息 + 加载器
 */
const SOURCES = {
  daily_report: {
    id: 'daily_report',
    name: '公出日志（日报）',
    fields: [
      // 昨日口径
      { id: 'total_count', name: '昨日应填人数', type: 'number' },
      { id: 'submitted_count', name: '昨日已提交人数', type: 'number' },
      { id: 'missing_count', name: '昨日缺失人数', type: 'number' },
      { id: 'on_time_count', name: '昨日按时提交数', type: 'number' },
      { id: 'late_count', name: '昨日迟到提交数', type: 'number' },
      { id: 'coverage', name: '昨日提交率(0-1)', type: 'number' },
      // 今日口径（当天应填的出差/外场人员）
      { id: 'today_total_count', name: '今日应填人数', type: 'number' },
      { id: 'today_submitted_count', name: '今日已填写人数', type: 'number' },
      { id: 'today_missing_count', name: '今日未填写人数', type: 'number' },
      // 今日待工口径（昨日填写明日计划=待工的人员）
      { id: 'today_waiting_count', name: '今日待工人数', type: 'number' },
      { id: 'today_waiting_names', name: '今日待工人员姓名', type: 'string' },
    ],
    people: [
      { id: 'missing_workers', name: '昨日未提交人员' },
      { id: 'today_missing_workers', name: '今日未填写人员（出差人员提醒）' },
      { id: 'today_waiting_workers', name: '今日待工人员（昨日填报明日待工）' },
    ],
    /**
     * @param {{yesterday: string, today: string}} params - 日期参数
     * @returns {Promise<Object>}
     */
    async loader({ yesterday, today }) {
      // ===== 昨日口径 =====
      const rows = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN dr.id IS NOT NULL THEN 1 ELSE 0 END) AS submitted,
                SUM(CASE WHEN dr.timeliness = 'on_time' THEN 1 ELSE 0 END) AS on_time,
                SUM(CASE WHEN dr.timeliness = 'late' THEN 1 ELSE 0 END) AS late
         FROM users u
         LEFT JOIN daily_reports dr
           ON dr.user_id = u.id AND dr.report_date = ?
            AND dr.deleted_at IS NULL AND dr.status IN ('submitted','approved')
         WHERE u.deleted_at IS NULL AND u.status = 'active'
           AND u.role NOT IN ('admin','superadmin')`,
        [yesterday]
      );
      const r = rows[0] || {};
      const total = Number(r.total) || 0;
      const submitted = Number(r.submitted) || 0;

      // 昨日未提交人员名单
      const peopleRows = await db.query(
        `SELECT u.id AS userId, u.user_name AS name, u.nickname, u.qywx_mobile, u.phone, u.qywx_userid
         FROM users u
         LEFT JOIN daily_reports dr
           ON dr.user_id = u.id AND dr.report_date = ?
            AND dr.deleted_at IS NULL AND dr.status IN ('submitted','approved')
         WHERE u.deleted_at IS NULL AND u.status = 'active'
           AND u.role NOT IN ('admin','superadmin')
           AND dr.id IS NULL
         ORDER BY u.user_name`,
        [yesterday]
      );
      const missingWorkers = peopleRows.map((p) => ({
        userId: p.userId,
        name: p.name || p.nickname || '',
        qywxMobile: p.qywx_mobile || '',
        phone: p.phone || '',
        qywxUserid: p.qywx_userid || '',
      }));

      // ===== 今日口径：当天应填的出差/外场人员（与合规提醒同源 getDailyStatus）=====
      const todayStat = await loadTodayStatus(today);

      // ===== 今日待工：昨日填报"明日待工"的人员 =====
      const waitingRows = await db.query(
        `SELECT u.id AS userId, u.user_name AS name, u.nickname, u.qywx_mobile, u.phone, u.qywx_userid
         FROM daily_reports dr
         JOIN users u ON dr.user_id = u.id AND u.deleted_at IS NULL AND u.status = 'active'
         WHERE dr.report_date = ? AND dr.tomorrow_work_type = '待工'
           AND dr.deleted_at IS NULL AND dr.status IN ('submitted','approved')
         ORDER BY u.user_name`,
        [yesterday]
      );
      const waitingWorkers = waitingRows.map((p) => ({
        userId: p.userId,
        name: p.name || p.nickname || '',
        qywxMobile: p.qywx_mobile || '',
        phone: p.phone || '',
        qywxUserid: p.qywx_userid || '',
      }));
      const waitingNames = waitingWorkers.map((w) => w.name).filter(Boolean);

      return {
        total_count: total,
        submitted_count: submitted,
        missing_count: total - submitted,
        on_time_count: Number(r.on_time) || 0,
        late_count: Number(r.late) || 0,
        coverage: total > 0 ? Number((submitted / total).toFixed(4)) : 0,
        missing_workers: missingWorkers,
        today_total_count: todayStat.total,
        today_submitted_count: todayStat.submitted,
        today_missing_count: todayStat.missing,
        today_missing_workers: todayStat.missingWorkers,
        today_waiting_count: waitingNames.length,
        today_waiting_names: waitingNames.join('、'),
        today_waiting_workers: waitingWorkers,
      };
    },
  },

  compliance: {
    id: 'compliance',
    name: '昨日合规',
    fields: [
      { id: 'checked_projects', name: '检查项目数', type: 'number' },
      { id: 'missing_projects', name: '缺失项目数', type: 'number' },
      { id: 'missing_count', name: '缺失项目数(同义)', type: 'number' },
    ],
    /**
     * @param {string} yesterday - YYYY-MM-DD
     * @returns {Promise<Object>}
     */
    async loader(yesterday) {
      const rows = await db.query(
        `SELECT COUNT(*) AS checked,
                SUM(CASE WHEN timeliness = 'missing' THEN 1 ELSE 0 END) AS missing
         FROM report_compliance WHERE report_date = ?`,
        [yesterday]
      );
      const r = rows[0] || {};
      const missing = Number(r.missing) || 0;
      return {
        checked_projects: Number(r.checked) || 0,
        missing_projects: missing,
        missing_count: missing,
      };
    },
  },

  attendance: {
    id: 'attendance',
    name: '今日考勤',
    fields: [
      { id: 'is_workday', name: '是否工作日', type: 'boolean' },
      { id: 'leave_count', name: '请假进行中人数', type: 'number' },
      { id: 'biz_trip_count', name: '出差进行中人数', type: 'number' },
    ],
    /**
     * @param {string} today - YYYY-MM-DD
     * @returns {Promise<Object>}
     */
    async loader(today) {
      const scheduleRows = await db.query(
        'SELECT status FROM company_schedules WHERE schedule_date = ?',
        [today]
      );
      const isWorkday = scheduleRows.length === 0 || scheduleRows[0].status === 'work';
      const leaveRows = await db.query(
        `SELECT COUNT(*) AS cnt FROM attendance_leave_requests
         WHERE request_type = 'leave' AND status = 'in_progress'`
      );
      const tripRows = await db.query(
        `SELECT COUNT(*) AS cnt FROM attendance_leave_requests
         WHERE request_type = 'biz_trip' AND status = 'in_progress'`
      );
      return {
        is_workday: isWorkday,
        leave_count: Number(leaveRows[0]?.cnt) || 0,
        biz_trip_count: Number(tripRows[0]?.cnt) || 0,
      };
    },
  },

  users: {
    id: 'users',
    name: '用户统计',
    fields: [
      { id: 'active_count', name: '在职人数', type: 'number' },
      { id: 'pending_count', name: '待审核人数', type: 'number' },
    ],
    /**
     * @returns {Promise<Object>}
     */
    async loader() {
      const rows = await db.query(
        `SELECT SUM(status = 'active') AS active_cnt,
                SUM(status = 'pending') AS pending_cnt
         FROM users WHERE deleted_at IS NULL`
      );
      const r = rows[0] || {};
      return {
        active_count: Number(r.active_cnt) || 0,
        pending_count: Number(r.pending_cnt) || 0,
      };
    },
  },

  system: {
    id: 'system',
    name: '系统日期',
    fields: [
      { id: 'date', name: '当前日期', type: 'string' },
      { id: 'weekday', name: '星期(1-7,周一=1)', type: 'number' },
      { id: 'day_of_month', name: '日', type: 'number' },
      { id: 'month', name: '月', type: 'number' },
    ],
    /**
     * @param {Object} parts - getDateParts 返回值
     * @returns {Object}
     */
    loader(parts) {
      return { ...parts };
    },
  },
};

/**
 * 加载今日公出日志状态（与合规提醒同源：coreStatsService.getDailyStatus）
 * "当天还未填写的出差/外场人员" = getDailyStatus(workers) 中 status='missing'
 * @param {string} today - YYYY-MM-DD
 * @returns {Promise<{total: number, submitted: number, missing: number, missingWorkers: Array}>}
 */
async function loadTodayStatus(today) {
  try {
    const dailyStatus = await coreStatsService.getDailyStatus(today);
    const workers = (dailyStatus && dailyStatus.workers) || [];
    const missing = workers.filter((w) => w.status === 'missing');
    const ids = missing.map((w) => w.userId);

    // 补查 @ 所需标识（qywx_mobile / phone / qywx_userid）
    let userMap = {};
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await db.query(
        `SELECT id, user_name, nickname, qywx_mobile, phone, qywx_userid FROM users WHERE id IN (${placeholders})`,
        ids
      );
      rows.forEach((u) => { userMap[u.id] = u; });
    }
    const missingWorkers = missing.map((w) => ({
      userId: w.userId,
      name: w.userName || '',
      qywxMobile: (userMap[w.userId] && userMap[w.userId].qywx_mobile) || '',
      phone: (userMap[w.userId] && userMap[w.userId].phone) || '',
      qywxUserid: (userMap[w.userId] && userMap[w.userId].qywx_userid) || '',
    }));

    return {
      total: workers.length,
      submitted: workers.filter((w) => w.status !== 'missing' && w.status !== 'leave').length,
      missing: missing.length,
      missingWorkers,
    };
  } catch (err) {
    // 今日统计失败不影响昨日口径
    return { total: 0, submitted: 0, missing: 0, missingWorkers: [] };
  }
}

/**
 * 加载全部数据源上下文（失败的数据源以 null 记录，由条件引擎处理）
 * @param {string} timezone - IANA 时区名
 * @returns {Promise<{context: Object, errors: Object}>}
 */
async function loadContext(timezone) {
  const tz = timezone || 'Asia/Shanghai';
  const parts = getDateParts(tz);
  const today = parts.date;
  const yesterday = minusDays(today, 1);

  const context = { system: parts };
  const errors = {};

  // attendance 与 daily_report/compliance 需要日期参数，system 已加载
  const loaders = [
    ['daily_report', SOURCES.daily_report, { yesterday, today }],
    ['compliance', SOURCES.compliance, yesterday],
    ['attendance', SOURCES.attendance, today],
    ['users', SOURCES.users, null],
  ];

  for (const [id, src, param] of loaders) {
    try {
      context[id] = await src.loader(param);
    } catch (err) {
      errors[id] = err.message;
      context[id] = null;
    }
  }
  return { context, errors };
}

/**
 * 获取数据源元信息（条件编辑器渲染；含可选的 people 人员名单能力）
 * @returns {Array} 数据源与字段元信息
 */
function getSourceMeta() {
  return Object.values(SOURCES).map((s) => ({
    id: s.id,
    name: s.name,
    fields: s.fields,
    people: s.people || [],
  }));
}

module.exports = { loadContext, getSourceMeta, getDateParts, minusDays };
