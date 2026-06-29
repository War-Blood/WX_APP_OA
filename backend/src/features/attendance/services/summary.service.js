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
  const reports = await db.query(
    `SELECT user_id, report_date, today_work_type FROM daily_reports
     WHERE user_id IN (${users.map(() => '?').join(',')}) AND report_date BETWEEN ? AND ?
       AND status = 'approved' AND report_type != 'office'`,
    [...users.map(u => u.id), startDate, endDate]
  );
  const reportMap = {};
  reports.forEach(r => { const k = `${r.user_id}_${r.report_date.toISOString().slice(0,10)}`; reportMap[k] = r.today_work_type; });

  // 4. 查出差/请假
  const tripLeaves = await db.query(
    `SELECT * FROM attendance_leave_requests WHERE applicant_id IN (${users.map(() => '?').join(',')})`,
    users.map(u => u.id)
  );

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

async function exportExcel({ startDate, endDate, departmentId, userId }) {
  const ExcelJS = require('exceljs');
  const { list: persons } = await list({ startDate, endDate, departmentId, userId, page: 1, pageSize: 1000 });

  const wb = new ExcelJS.Workbook(); wb.creator = '技术工程中心';
  const ws1 = wb.addWorksheet('公出原始记录');
  const totalCols = persons.length * 4;
  [12, 25, 10, 1].forEach((w, i) => { for (let j = 0; j < persons.length; j++) ws1.getColumn(j * 4 + i + 1).width = w; });

  const titleRow = ws1.addRow(['技术工程中心公出加班统计表']);
  ws1.mergeCells(1, 1, 1, totalCols);
  titleRow.eachCell(c => { c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } }; c.alignment = { horizontal: 'center' }; });

  const nameData = []; const headerData = [];
  persons.forEach(() => { nameData.push('', '', '', ''); headerData.push('出差时间', '出差地', '状态', ''); });
  const nameRow = ws1.addRow(nameData);
  persons.forEach((p, i) => { ws1.mergeCells(2, i*4+1, 2, i*4+3); ws1.getCell(2, i*4+1).value = p.userName; ws1.getCell(2, i*4+1).font = { bold: true }; ws1.getCell(2, i*4+1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } }; ws1.getCell(2, i*4+1).alignment = { horizontal: 'center' }; });

  const hdrRow = ws1.addRow(headerData);
  hdrRow.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }; c.alignment = { horizontal: 'center' }; });

  const days = []; const cur = new Date(startDate); const end = new Date(endDate);
  while (cur <= end) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }

  const overtime = {};
  persons.forEach(p => overtime[p.userId] = 0);

  days.forEach(date => {
    const rowData = [];
    persons.forEach(p => { rowData.push(date, '', p.workDays > 0 ? '现场（陆）' : p.bizTripDays > 0 ? '在途' : '休息', ''); });
    ws1.addRow(rowData).eachCell(c => { c.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } } }; c.alignment = { horizontal: 'center' }; });
  });

  const ws2 = wb.addWorksheet('加班记录统计表');
  [6, 18, 16].forEach((w, i) => ws2.getColumn(i + 1).width = w);
  const sTitle = ws2.addRow(['技术工程中心公出加班统计表']); ws2.mergeCells(1, 1, 1, 3);
  sTitle.eachCell(c => { c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } }; c.alignment = { horizontal: 'center' }; });
  const sHdr = ws2.addRow(['序号', '姓名', '加班天数']);
  sHdr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }; c.alignment = { horizontal: 'center' }; });
  persons.forEach((p, i) => { const r = ws2.addRow([i + 1, p.userName, p.workDays + p.bizTripDays]); r.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } } }; c.alignment = { horizontal: 'center' }; }); });

  const buffer = await wb.xlsx.writeBuffer();
  const [y, m] = startDate.split('-');
  return { buffer, filename: `${y}年${parseInt(m)}月技术工程中心公出加班统计表.xlsx` };
}

function mapWorkType(wt) { switch(wt) { case '工作（陆）': case '工作（海）': return 'work'; case '在途': return 'biz_trip'; case '待工': return 'rest'; case '请假': return 'leave'; default: return 'rest'; } }
function mapSchedule(s) { switch(s) { case 'work': return 'work'; case 'rest': return 'rest'; case 'biz_trip': return 'biz_trip'; case 'leave': return 'leave'; default: return 'rest'; } }

module.exports = { list, exportExcel };
