'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');

/**
 * 考勤汇总服务
 */

async function list({ startDate, endDate, departmentId, userId, page = 1, pageSize = 50 }) {
  // 1. 查在职人员
  const userConditions = ["u.status = 'active'", 'u.deleted_at IS NULL'];
  const userParams = [];
  if (departmentId) { userConditions.push('u.department_id = ?'); userParams.push(departmentId); }
  if (userId) { userConditions.push('u.id = ?'); userParams.push(userId); }

  const offset = (page - 1) * pageSize;
  const countRows = await db.query(`SELECT COUNT(*) AS total FROM users u WHERE ${userConditions.join(' AND ')}`, userParams);
  const users = await db.query(
    `SELECT u.id, u.nickname AS userName, u.worker_code AS workerCode, d.name AS departmentName
     FROM users u LEFT JOIN departments d ON u.department_id = d.id
     WHERE ${userConditions.join(' AND ')} ORDER BY u.worker_code LIMIT ? OFFSET ?`,
    [...userParams, pageSize, offset]
  );

  // 2. 查排班
  const schedules = await db.query(
    `SELECT user_id, schedule_date, status FROM attendance_schedules WHERE schedule_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  const schedMap = {};
  schedules.forEach(s => { const k = `${s.user_id}_${s.schedule_date.toISOString().slice(0,10)}`; schedMap[k] = s.status; });

  // 3. 查公出日志（只读引用）
  const userIds = users.map(u => u.id);
  const reports = userIds.length > 0 ? await db.query(
    `SELECT user_id, report_date, today_work_type FROM daily_reports
     WHERE user_id IN (${userIds.map(() => '?').join(',')}) AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type != 'office'`,
    [...userIds, startDate, endDate]
  ) : [];
  const reportMap = {};
  reports.forEach(r => { const k = `${r.user_id}_${r.report_date.toISOString().slice(0,10)}`; reportMap[k] = r.today_work_type; });

  // 4. 查出差/请假
  const tripLeaves = userIds.length > 0 ? await db.query(
    `SELECT * FROM attendance_leave_requests WHERE applicant_id IN (${userIds.map(() => '?').join(',')})`,
    userIds
  ) : [];

  // 5. 逐人逐日汇总
  const result = users.map(u => {
    let workDays = 0, restDays = 0, bizTripDays = 0, leaveDays = 0, missingDays = 0;
    const cur = new Date(startDate);
    const end = new Date(endDate);

    while (cur <= end) {
      const ds = cur.toISOString().slice(0, 10);
      const rKey = `${u.id}_${ds}`;
      const sKey = `${u.id}_${ds}`;

      const reportType = reportMap[rKey];
      const schedStatus = schedMap[sKey];

      let displayStatus;
      if (reportType) {
        displayStatus = mapWorkType(reportType);
      } else if (schedStatus) {
        displayStatus = mapSchedule(schedStatus);
      } else {
        cur.setDate(cur.getDate() + 1); continue;
      }

      switch (displayStatus) {
        case 'work': workDays++; break;
        case 'rest': restDays++; break;
        case 'biz_trip': bizTripDays++; break;
        case 'leave': leaveDays++; break;
      }

      // 未提交检测：处于出差中 + 无公出日志 + 无请假
      const inTrip = tripLeaves.some(t => t.request_type === 'biz_trip' && t.status === 'in_progress' && t.applicant_id === u.id && new Date(t.trip_started_at) <= cur);
      const inLeave = tripLeaves.some(t => t.request_type === 'leave' && t.status === 'active' && t.applicant_id === u.id && ds >= t.start_date.toISOString().slice(0,10) && ds <= t.end_date.toISOString().slice(0,10));
      if (inTrip && !reportType && !inLeave) missingDays++;

      cur.setDate(cur.getDate() + 1);
    }
    return { userId: u.id, userName: u.userName, workerCode: u.workerCode, departmentName: u.departmentName, workDays, restDays, bizTripDays, leaveDays, missingDays };
  });

  return { list: result, total: countRows[0].total, page, pageSize, totalPages: Math.ceil(countRows[0].total / pageSize) };
}

/**
 * 导出考勤汇总 Excel（双 Sheet）
 * Sheet1: 公出原始记录 — 逐人逐日填充（出差地、状态）
 * Sheet2: 加班记录统计表 — 每人汇总加班天数
 *
 * 数据优先级: 公出日志(daily_reports) > 排班(attendance_schedules)
 * 公出日志 today_work_type 映射: 工作(陆)→现场(陆) / 工作(海)→现场(海) / 在途→在途 / 待工→待工 / 请假→请假
 * 排班 status 映射: work→现场(陆) / rest→休息 / biz_trip→在途 / leave→请假
 * 加班天数公式: 工作日(现场+在途) + 休息日(现场+在途) ≥ 当月工作日 → 超出部分为加班
 */
async function exportExcel({ startDate, endDate, departmentId, userId }) {
  const ExcelJS = require('exceljs');

  // 1. 获取人员列表
  const userConditions = ["u.status = 'active'", 'u.deleted_at IS NULL'];
  const userParams = [];
  if (departmentId) { userConditions.push('u.department_id = ?'); userParams.push(departmentId); }
  if (userId) { userConditions.push('u.id = ?'); userParams.push(userId); }

  const persons = await db.query(
    `SELECT u.id, u.nickname AS userName, u.worker_code AS workerCode, d.name AS departmentName
     FROM users u LEFT JOIN departments d ON u.department_id = d.id
     WHERE ${userConditions.join(' AND ')} ORDER BY u.worker_code`,
    userParams
  );

  // 2. 生成日期列表
  const days = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }

  // 3. 查询排班（全量）
  const schedules = await db.query(
    'SELECT user_id, schedule_date, status FROM attendance_schedules WHERE schedule_date BETWEEN ? AND ?',
    [startDate, endDate]
  );
  const schedMap = {};
  schedules.forEach(s => { schedMap[`${s.user_id}_${s.schedule_date.toISOString().slice(0, 10)}`] = s.status; });

  // 4. 查询公出日志（只读引用 daily_reports — PRD 1.2 约束）
  const personIds = persons.map(p => p.id);
  const reports = personIds.length > 0 ? await db.query(
    `SELECT user_id, report_date, today_work_type, area FROM daily_reports
     WHERE user_id IN (${personIds.map(() => '?').join(',')}) AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type != 'office'`,
    [...personIds, startDate, endDate]
  ) : [];
  const reportMap = {};
  reports.forEach(r => {
    reportMap[`${r.user_id}_${r.report_date.toISOString().slice(0, 10)}`] = {
      workType: r.today_work_type,
      area: r.area || ''
    };
  });

  // 5. 查询请假/出差记录（用于判定未提交日期）
  const tripLeaves = personIds.length > 0 ? await db.query(
    `SELECT * FROM attendance_leave_requests WHERE applicant_id IN (${personIds.map(() => '?').join(',')})`,
    personIds
  ) : [];

  // 6. 构建 Workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = '技术工程中心';
  const ws1 = wb.addWorksheet('公出原始记录');
  const totalCols = persons.length * 4;
  [12, 25, 10, 1].forEach((w, i) => { for (let j = 0; j < persons.length; j++) ws1.getColumn(j * 4 + i + 1).width = w; });

  // R1: 标题行 — 白字深蓝底
  const titleRow = ws1.addRow(['技术工程中心公出加班统计表']);
  ws1.mergeCells(1, 1, 1, totalCols);
  titleRow.eachCell(c => {
    c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
    c.alignment = { horizontal: 'center' };
  });

  // R2: 姓名行 — 淡蓝底合并单元格
  const nameData = [];
  const headerData = [];
  persons.forEach(() => { nameData.push('', '', '', ''); headerData.push('出差时间', '出差地', '状态', ''); });
  const nameRow = ws1.addRow(nameData);
  persons.forEach((p, i) => {
    ws1.mergeCells(2, i * 4 + 1, 2, i * 4 + 3);
    ws1.getCell(2, i * 4 + 1).value = p.userName;
    ws1.getCell(2, i * 4 + 1).font = { bold: true };
    ws1.getCell(2, i * 4 + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
    ws1.getCell(2, i * 4 + 1).alignment = { horizontal: 'center' };
  });

  // R3: 表头行 — 白字蓝底
  const hdrRow = ws1.addRow(headerData);
  hdrRow.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    c.alignment = { horizontal: 'center' };
  });

  // 7. 逐日逐人填充数据（核心逻辑 — PRD 4.5/8 公出日志>排班优先级）
  const overtime = {};
  persons.forEach(p => { overtime[p.userId] = 0; });

  days.forEach(date => {
    const rowData = [];
    persons.forEach(p => {
      const rKey = `${p.id}_${date}`;
      const report = reportMap[rKey];
      const schedStatus = schedMap[`${p.id}_${date}`];

      // 出差地：取自 daily_reports.area（PRD 4.5 字段映射）
      const location = report ? report.area : '';

      // 状态判定：公出日志 > 排班 > 默认休息（PRD 4.5 优先级）
      let status;
      if (report) {
        status = mapExportWorkType(report.workType);
        // 统计加班：工作或出差状态计入"现场/在途"
        if (status === '现场（陆）' || status === '现场（海）' || status === '在途') {
          overtime[p.id] = (overtime[p.id] || 0) + 1;
        }
      } else if (schedStatus) {
        status = mapExportSchedule(schedStatus);
        // 排班的工作日出差计入加班统计
        if (schedStatus === 'work' || schedStatus === 'biz_trip') {
          overtime[p.id] = (overtime[p.id] || 0) + 1;
        }
      } else {
        // 出差期间无公出日志：标记为"未提交"（PRD 4.3 出差未提交检测）
        const inTrip = tripLeaves.some(t =>
          t.request_type === 'biz_trip' && t.status === 'in_progress' &&
          t.applicant_id === p.id && new Date(t.trip_started_at) <= new Date(date)
        );
        const inLeave = tripLeaves.some(t =>
          t.request_type === 'leave' && t.status === 'active' &&
          t.applicant_id === p.id && date >= t.start_date.toISOString().slice(0, 10) && date <= t.end_date.toISOString().slice(0, 10)
        );
        status = inTrip && !inLeave ? '未提交' : '休息';
      }

      rowData.push(date, location, status, '');
    });

    // R4+: 数据行 — 细灰边框居中
    ws1.addRow(rowData).eachCell(c => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };
      c.alignment = { horizontal: 'center' };
    });
  });

  // 8. Sheet2 — 加班记录统计表
  const ws2 = wb.addWorksheet('加班记录统计表');
  [6, 18, 16].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  const sTitle = ws2.addRow(['技术工程中心公出加班统计表']);
  ws2.mergeCells(1, 1, 1, 3);
  sTitle.eachCell(c => {
    c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
    c.alignment = { horizontal: 'center' };
  });

  const sHdr = ws2.addRow(['序号', '姓名', '加班天数']);
  sHdr.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    c.alignment = { horizontal: 'center' };
  });

  // 加班天数 = total overtime days（PRD 4.5 公式：工作日天数合计）
  persons.forEach((p, i) => {
    const r = ws2.addRow([i + 1, p.userName, overtime[p.id] || 0]);
    r.eachCell(c => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };
      c.alignment = { horizontal: 'center' };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const [y, m] = startDate.split('-');
  return { buffer, filename: `${y}年${parseInt(m)}月技术工程中心公出加班统计表.xlsx` };
}

function mapExportWorkType(wt) {
  switch (wt) {
    case '工作（陆）': return '现场（陆）';
    case '工作（海）': return '现场（海）';
    case '在途': return '在途';
    case '待工': return '待工';
    case '请假': return '请假';
    default: return '休息';
  }
}
function mapExportSchedule(s) {
  switch (s) {
    case 'work': return '现场（陆）';
    case 'rest': return '休息';
    case 'biz_trip': return '在途';
    case 'leave': return '请假';
    default: return '休息';
  }
}

function mapWorkType(wt) { switch(wt) { case '工作（陆）': case '工作（海）': return 'work'; case '在途': return 'biz_trip'; case '待工': return 'rest'; case '请假': return 'leave'; default: return 'rest'; } }
function mapSchedule(s) { switch(s) { case 'work': return 'work'; case 'rest': return 'rest'; case 'biz_trip': return 'biz_trip'; case 'leave': return 'leave'; default: return 'rest'; } }

/**
 * 个人考勤汇总 — 登录用户查自己的月度考勤（逐日综合 daily_reports + schedules）
 * @param {object} param0
 * @param {number} param0.userId - 用户 ID
 * @param {string} param0.startDate - 起始日期 YYYY-MM-DD
 * @param {string} param0.endDate - 结束日期 YYYY-MM-DD
 * @returns {{ workDays:number, restDays:number, bizTripDays:number, leaveDays:number, missingDays:number, dailyList:Array }}
 */
async function mySummary({ userId, startDate, endDate }) {
  // 1. 查该用户的排班
  const schedules = await db.query(
    'SELECT schedule_date, status, note FROM attendance_schedules WHERE user_id = ? AND schedule_date BETWEEN ? AND ?',
    [userId, startDate, endDate]
  );
  const schedMap = {};
  schedules.forEach(s => { schedMap[s.schedule_date.toISOString().slice(0, 10)] = s; });

  // 2. 查公出日志（只读引用 daily_reports，公出日志 > 排班优先级）
  const reports = await db.query(
    `SELECT report_date, today_work_type, area, work_content FROM daily_reports
     WHERE user_id = ? AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type != 'office'`,
    [userId, startDate, endDate]
  );
  const reportMap = {};
  reports.forEach(r => {
    reportMap[r.report_date.toISOString().slice(0, 10)] = { workType: r.today_work_type, area: r.area, note: r.work_content };
  });

  // 3. 查出差/请假记录
  const tripLeaves = await db.query(
    'SELECT * FROM attendance_leave_requests WHERE applicant_id = ?',
    [userId]
  );

  // 4. 逐日汇总
  let workDays = 0, restDays = 0, bizTripDays = 0, leaveDays = 0, missingDays = 0;
  const dailyList = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);

  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const report = reportMap[ds];
    const sched = schedMap[ds];

    let displayStatus, note = '';

    if (report) {
      displayStatus = mapWorkType(report.workType);
      note = report.note || '';
    } else if (sched) {
      displayStatus = mapSchedule(sched.status);
      note = sched.note || '';
    } else {
      // 无排班也无公出日志
      displayStatus = 'none';
    }

    switch (displayStatus) {
      case 'work': workDays++; break;
      case 'rest': restDays++; break;
      case 'biz_trip': bizTripDays++; break;
      case 'leave': leaveDays++; break;
    }

    // 出差未提交检测
    const inTrip = tripLeaves.some(t =>
      t.request_type === 'biz_trip' && t.status === 'in_progress' &&
      t.applicant_id === userId &&
      new Date(t.trip_started_at) <= cur
    );
    const inLeave = tripLeaves.some(t =>
      t.request_type === 'leave' && t.status === 'active' &&
      t.applicant_id === userId &&
      ds >= t.start_date.toISOString().slice(0, 10) &&
      ds <= t.end_date.toISOString().slice(0, 10)
    );
    if (inTrip && !report && !inLeave) {
      missingDays++;
      displayStatus = 'missing';
    }

    dailyList.push({ date: ds, status: displayStatus, note });

    cur.setDate(cur.getDate() + 1);
  }

  return { workDays, restDays, bizTripDays, leaveDays, missingDays, dailyList };
}

module.exports = { list, exportExcel, mySummary };
