'use strict';

const db = require('../../../common/config/database');
const { BusinessError } = require('../../../common/utils/errors');
const { beijingDate } = require('../../../common/utils/date');

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const offset = dt.getTimezoneOffset() + 480;
  const bj = new Date(dt.getTime() + offset * 60000);
  return `${bj.getFullYear()}-${String(bj.getMonth() + 1).padStart(2, '0')}-${String(bj.getDate()).padStart(2, '0')}`;
}

/**
 * 考勤汇总服务
 */

/**
 * 浙江贝良部门树（根节点 departments.id=23）：返回含自身及全部子部门的 id 列表
 * 沿 parent_id 上溯，带 guard 防脏数据自引用死循环
 */
async function getBeiliangDeptIds() {
  const deptRows = await db.query('SELECT id, parent_id FROM departments WHERE deleted_at IS NULL');
  const parentMap = {};
  deptRows.forEach(d => { parentMap[d.id] = d.parent_id; });
  const BEILIANG_ROOT = 23;
  const ids = [];
  deptRows.forEach(d => {
    let cur = d.id;
    let guard = 0;
    while (cur != null && guard < 50) {
      if (cur === BEILIANG_ROOT) { ids.push(d.id); break; }
      cur = parentMap[cur];
      guard++;
    }
  });
  return ids;
}

async function list({ startDate, endDate, departmentId, userId, page = 1, pageSize = 50 }) {
  // 1. 查在职人员（范围限定：仅浙江贝良部门树下）
  const beiliangIds = await getBeiliangDeptIds();
  const userConditions = ["u.status = 'active'", 'u.deleted_at IS NULL', `u.department_id IN (${beiliangIds.length ? beiliangIds.join(',') : '0'})`];
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
    `SELECT schedule_date, status FROM company_schedules WHERE schedule_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  const schedMap = {};
  schedules.forEach(s => {
    const sd = new Date(s.schedule_date);
    const k = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
    schedMap[k] = s.status;
  });

  // 3. 查公出日志（只读引用）
  const userIds = users.map(u => u.id);
  const reports = userIds.length > 0 ? await db.query(
    `SELECT user_id, report_date, today_work_type FROM daily_reports
     WHERE user_id IN (${userIds.map(() => '?').join(',')}) AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type NOT IN ('office','leave')`,
    [...userIds, startDate, endDate]
  ) : [];
  const reportMap = {};
  reports.forEach(r => { const k = `${r.user_id}_${fmtDate(r.report_date)}`; reportMap[k] = r.today_work_type; });

  // 4. 查出差/请假
  const tripLeaves = userIds.length > 0 ? await db.query(
    `SELECT * FROM attendance_leave_requests WHERE applicant_id IN (${userIds.map(() => '?').join(',')})`,
    userIds
  ) : [];

  // 5. 逐人逐日汇总
  const result = users.map(u => {
    let workDays = 0, restDays = 0, bizTripDays = 0, leaveDays = 0, missingDays = 0;
    const cur = beijingDate(startDate);
    const end = beijingDate(endDate);

    while (cur <= end) {
      const ds = fmtDate(cur);
      const rKey = `${u.id}_${ds}`;
      const schedStatus = schedMap[ds];

      let displayStatus;
      const dayReport = reportMap[rKey];
      if (dayReport) {
        displayStatus = mapWorkType(dayReport);
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
      const inLeave = tripLeaves.some(t => t.request_type === 'leave' && t.status === 'active' && t.applicant_id === u.id && ds >= fmtDate(t.start_date) && ds <= fmtDate(t.end_date));
      if (inTrip && !reportMap[rKey] && !inLeave) missingDays++;

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
 * 补贴天数公式: 休息日 且 状态为 工作(陆/海)/在途（原"加班天数"口径）
 * 加班天数公式: 休息日 且 有公出日志且状态≠请假（含待工）
 * 人员范围: 仅浙江贝良部门树（departments.id=23）下人员
 */
async function exportExcel({ startDate, endDate, departmentId, userId }) {
  const ExcelJS = require('exceljs');

  // 1. 获取人员列表（范围限定：仅浙江贝良部门树下）
  const beiliangIds = await getBeiliangDeptIds();
  const userConditions = ["u.status = 'active'", 'u.deleted_at IS NULL', `u.department_id IN (${beiliangIds.length ? beiliangIds.join(',') : '0'})`];
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
  while (cur <= end) { days.push(fmtDate(cur)); cur.setDate(cur.getDate() + 1); }

  // 3. 查询排班（公司级）
  const schedules = await db.query(
    'SELECT schedule_date, status FROM company_schedules WHERE schedule_date BETWEEN ? AND ?',
    [startDate, endDate]
  );
  const schedMap = {};
  schedules.forEach(s => {
    const sd = new Date(s.schedule_date);
    const k = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
    schedMap[k] = s.status;
  });

  // 4. 查询公出日志（只读引用 daily_reports — PRD 1.2 约束）
  const personIds = persons.map(p => p.id);
  const reports = personIds.length > 0 ? await db.query(
    `SELECT user_id, report_date, today_work_type, area FROM daily_reports
     WHERE user_id IN (${personIds.map(() => '?').join(',')}) AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type NOT IN ('office','leave')`,
    [...personIds, startDate, endDate]
  ) : [];
  const reportMap = {};
  reports.forEach(r => {
    reportMap[`${r.user_id}_${fmtDate(r.report_date)}`] = {
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
  wb.creator = '浙江贝良';
  const ws1 = wb.addWorksheet('公出原始记录');
  const totalCols = persons.length * 4;
  [12, 25, 10, 1].forEach((w, i) => { for (let j = 0; j < persons.length; j++) ws1.getColumn(j * 4 + i + 1).width = w; });

  // R1: 标题行 — 白字深蓝底
  const titleRow = ws1.addRow(['浙江贝良公出加班统计表']);
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
  // 补贴天数（原"加班天数"口径）: 休息日 + 工作（陆/海）/在途（兼容旧短名 工作）
  // 加班天数（新口径）: 休息日 + 公出日志除请假外均计入（含待工）
  const overtime = {};
  const subsidy = {};
  persons.forEach(p => { overtime[p.userId] = 0; subsidy[p.userId] = 0; });

  // 休息日判定：排班 rest；无排班记录时按周末（与 /report/export-status-board 一致）
  function isRestDay(dateStr) {
    const s = schedMap[dateStr];
    if (s) return s === 'rest';
    return [0, 6].includes(new Date(dateStr).getDay());
  }

  days.forEach(date => {
    const rowData = [];
    const rest = isRestDay(date);
    persons.forEach(p => {
      const rKey = `${p.id}_${date}`;
      const report = reportMap[rKey];
      const schedStatus = schedMap[date];

      // 出差地：取自 daily_reports.area（PRD 4.5 字段映射）；空则填充"公司"
      const location = report && String(report.area || '').trim() ? report.area : (report ? '公司' : '');

      // 状态判定：公出日志 > 排班 > 默认休息（PRD 4.5 优先级）
      let status;
      if (report) {
        const areaEmpty = !String(report.area || '').trim();
        status = areaEmpty ? '公司' : mapExportWorkType(report.workType);
        // 空出差地日报视为"公司"：计入加班（≠请假），不计补贴（非现场）
        const wt = areaEmpty ? '公司' : String(report.workType || '').trim();
        // 仅休息日计入：加班=除请假外（含待工）；补贴=工作（陆/海）/在途
        if (rest && wt && wt !== '请假') {
          overtime[p.id] = (overtime[p.id] || 0) + 1;
          if (wt === '工作（陆）' || wt === '工作（海）' || wt === '在途' || wt === '工作') {
            subsidy[p.id] = (subsidy[p.id] || 0) + 1;
          }
        }
      } else if (schedStatus) {
        status = mapExportSchedule(schedStatus);
        // 休息日无公出日志：不计入加班/补贴
      } else {
        // 出差期间无公出日志：标记为"未提交"（PRD 4.3 出差未提交检测）
        const inTrip = tripLeaves.some(t =>
          t.request_type === 'biz_trip' && t.status === 'in_progress' &&
          t.applicant_id === p.id && new Date(t.trip_started_at) <= new Date(date)
        );
        const inLeave = tripLeaves.some(t =>
          t.request_type === 'leave' && t.status === 'active' &&
          t.applicant_id === p.id && date >= fmtDate(t.start_date) && date <= fmtDate(t.end_date)
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
  const ws2 = wb.addWorksheet('加班汇总');
  [6, 18, 16, 16].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  const sTitle = ws2.addRow(['浙江贝良公出加班统计表']);
  ws2.mergeCells(1, 1, 1, 4);
  sTitle.eachCell(c => {
    c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
    c.alignment = { horizontal: 'center' };
  });

  const sHdr = ws2.addRow(['序号', '姓名', '补贴天数', '加班天数']);
  sHdr.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    c.alignment = { horizontal: 'center' };
  });

  // 只列出有补贴或加班的人员，按加班天数降序（与 /report/export-status-board 一致）
  const statList = persons
    .map((p, i) => ({ idx: i + 1, name: p.userName, sub: subsidy[p.id] || 0, ot: overtime[p.id] || 0 }))
    .filter(x => x.sub > 0 || x.ot > 0)
    .sort((a, b) => (b.ot - a.ot) || (b.sub - a.sub));
  statList.forEach(x => {
    const r = ws2.addRow([x.idx, x.name, x.sub, x.ot]);
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
  return { buffer, filename: `${y}年${parseInt(m)}月浙江贝良公出加班统计表.xlsx` };
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

function mapWorkType(wt) { switch(wt) { case '工作（陆）': case '工作（海）': return 'biz_trip'; case '在途': return 'biz_trip'; case '待工': return 'rest'; case '请假': return 'leave'; default: return 'rest'; } }
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
  // 1. 查公司排班
  const schedules = await db.query(
    'SELECT schedule_date, status FROM company_schedules WHERE schedule_date BETWEEN ? AND ?',
    [startDate, endDate]
  );
  const schedMap = {};
  schedules.forEach(s => {
    const sd = new Date(s.schedule_date);
    const k = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
    schedMap[k] = { status: s.status, note: '' };
  });

  // 2. 查公出日志（只读引用 daily_reports，公出日志 > 排班优先级）
  const reports = await db.query(
    `SELECT report_date, today_work_type, area, work_content FROM daily_reports
     WHERE user_id = ? AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type NOT IN ('office','leave')`,
    [userId, startDate, endDate]
  );
  const reportMap = {};
  reports.forEach(r => {
    reportMap[fmtDate(r.report_date)] = { workType: r.today_work_type, area: r.area, note: r.work_content };
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
    const ds = fmtDate(cur);
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
    }

    // 出差未提交检测 + 请假覆盖
    const inTrip = tripLeaves.some(t =>
      t.request_type === 'biz_trip' &&
      t.applicant_id === userId &&
      new Date(t.trip_started_at) <= cur &&
      (!t.trip_ended_at || new Date(t.trip_ended_at) >= cur)
    );
    const inLeave = tripLeaves.some(t =>
      t.request_type === 'leave' && t.status === 'active' &&
      t.applicant_id === userId &&
      ds >= fmtDate(t.start_date) &&
      ds <= fmtDate(t.end_date)
    );
    if (inLeave) {
      // 请假优先：无论是否有报告/排班，当日显示为请假
      if (displayStatus !== 'leave') leaveDays++;
      displayStatus = 'leave';
    } else if (inTrip && !report) {
      missingDays++;
      displayStatus = 'missing';
    }

    // 如果报告明确为请假但不在 leave request 范围内（边界情况）
    if (report && !inLeave && displayStatus === 'leave') {
      leaveDays++;
      displayStatus = 'leave';
    }

    dailyList.push({ date: ds, status: displayStatus, note });

    cur.setDate(cur.getDate() + 1);
  }

  return { workDays, restDays, bizTripDays, leaveDays, missingDays, dailyList };
}

module.exports = { list, exportExcel, mySummary };
