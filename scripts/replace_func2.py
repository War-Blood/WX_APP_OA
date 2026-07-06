#!/usr/bin/env python3
"""Replace exportStatusBoardCSV with clean version: empty=blank, only rest days get gray+bold, fix overtime."""

NEW_FUNC = r'''async function exportStatusBoardCSV(month, restDaysInput) {
  const ExcelJS = require('exceljs');
  const [y, mStr] = month.split('-').map(Number);
  const daysInMonth = new Date(y, mStr, 0).getDate();
  const startDate = month + '-01';
  const endDate = month + '-' + String(daysInMonth).padStart(2, '0');

  // Parse rest days: user-adjusted set, fallback to schedule from DB
  const restDaySet = restDaysInput && restDaysInput.length > 0
    ? new Set(restDaysInput)
    : null;

  // 1. Get all active workers
  const workerList = await db.query(
    `SELECT id, user_name FROM users
     WHERE worker_status = 'active' AND deleted_at IS NULL AND status = 'active'
     ORDER BY id`
  );
  const nameToId = {};
  workerList.forEach(w => { nameToId[w.user_name] = w.id; });

  const workerMap = {};

  const setInfo = (uid, r) => {
    if (!uid || uid === 1) return;
    const day = r.report_date instanceof Date
      ? r.report_date.getDate()
      : new Date(r.report_date).getDate();
    if (!workerMap[uid]) workerMap[uid] = {};
    if (!workerMap[uid][day]) {
      workerMap[uid][day] = {
        date: r.report_date,
        project: r.project || r.area || '',
        status: r.today_work_type || '',
      };
    }
  };

  // 2. Three-path data matching
  const [rows1, rows2, rows3] = await Promise.all([
    db.query(`SELECT dr.report_date, dr.project, dr.area, dr.today_work_type, drw.worker_uid AS uid
     FROM daily_reports dr JOIN daily_report_workers drw ON drw.report_id = dr.id
     WHERE dr.status='approved' AND DATE_FORMAT(dr.report_date,'%Y-%m')=?`, [month]),
    db.query(`SELECT dr.report_date, dr.project, dr.area, dr.today_work_type, dr.user_id AS uid
     FROM daily_reports dr LEFT JOIN daily_report_workers drw ON drw.report_id = dr.id
     WHERE dr.status='approved' AND DATE_FORMAT(dr.report_date,'%Y-%m')=? AND drw.id IS NULL AND dr.user_id>0`, [month]),
    db.query(`SELECT dr.report_date, dr.project, dr.area, dr.today_work_type, dr.workers
     FROM daily_reports dr LEFT JOIN daily_report_workers drw ON drw.report_id = dr.id
     WHERE dr.status='approved' AND DATE_FORMAT(dr.report_date,'%Y-%m')=? AND drw.id IS NULL AND dr.workers IS NOT NULL AND dr.workers!=''`, [month]),
  ]);
  rows1.forEach(r => setInfo(r.uid, r));
  rows2.forEach(r => setInfo(r.uid, r));
  for (const r of rows3) {
    const names = r.workers.split(/[、,，\s]+/).filter(n => n);
    const matchedUid = names.length > 0 ? nameToId[names[0]] : undefined;
    if (matchedUid) setInfo(matchedUid, r);
  }

  // 3. Filter empty workers
  const activeWorkers = workerList.filter(w => workerMap[w.id] && Object.keys(workerMap[w.id]).length > 0);
  if (activeWorkers.length === 0) throw new BusinessError('No worker data for this month');

  // 4. Query attendance schedules (only needed if no user-adjusted restDays)
  const schedMap = {};
  if (!restDaySet) {
    const schedules = await db.query(
      `SELECT user_id, schedule_date, status FROM attendance_schedules
       WHERE schedule_date BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    schedules.forEach(s => {
      const d = s.schedule_date instanceof Date ? s.schedule_date.toISOString().slice(0, 10) : String(s.schedule_date).slice(0, 10);
      schedMap[s.user_id + '_' + d] = s.status;
    });
  }

  function isRestDay(uid, dateStr) {
    if (restDaySet) return restDaySet.has(dateStr); // user-adjusted
    const s = schedMap[uid + '_' + dateStr];
    if (s) return s === 'rest';
    // No schedule: Saturday/Sunday = rest
    return [0, 6].includes(new Date(dateStr).getDay());
  }

  // 5. Build Workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = '\u6280\u672f\u5de5\u7a0b\u4e2d\u5fc3';
  const pers = activeWorkers.length;
  const totalCols = pers * 3;
  const ws1 = wb.addWorksheet('\u516c\u51fa\u539f\u59cb\u8bb0\u5f55');
  [12, 25, 10].forEach((w, i) => { for (let j = 0; j < pers; j++) ws1.getColumn(j * 3 + i + 1).width = w; });

  // R1: Title
  const titleRow = ws1.addRow(['\u6280\u672f\u5de5\u7a0b\u4e2d\u5fc3\u516c\u51fa\u52a0\u73ed\u7edf\u8ba1\u8868']);
  ws1.mergeCells(1, 1, 1, totalCols);
  titleRow.eachCell(c => {
    c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
    c.alignment = { horizontal: 'center' };
  });

  // R2: Name row
  ws1.addRow([]);
  activeWorkers.forEach((w, i) => {
    ws1.mergeCells(2, i * 3 + 1, 2, i * 3 + 3);
    const cell = ws1.getCell(2, i * 3 + 1);
    cell.value = w.user_name;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
    cell.alignment = { horizontal: 'center' };
  });

  // R3: Header
  const hdrData = [];
  activeWorkers.forEach(() => hdrData.push('\u51fa\u5dee\u65f6\u95f4', '\u51fa\u5dee\u9879\u76ee', '\u72b6\u6001'));
  const hdrRow = ws1.addRow(hdrData);
  hdrRow.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    c.alignment = { horizontal: 'center' };
  });

  // 6. Fill daily data
  const overtime = {};
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) days.push(month + '-' + String(d).padStart(2, '0'));

  days.forEach(dateStr => {
    const rowData = [];
    activeWorkers.forEach(w => {
      const info = workerMap[w.id]?.[parseInt(dateStr.slice(-2))];
      const rest = isRestDay(w.id, dateStr);

      let displayDate = '', displayProject = '', displayStatus = '';

      if (info) {
        displayDate = info.date instanceof Date ? info.date.toISOString().slice(0, 10) : String(info.date).slice(0, 10);
        displayProject = info.project;
        displayStatus = info.status;
      }
      // Leave empty when no report (no auto-fill)
      rowData.push(displayDate, displayProject, displayStatus);

      // Overtime: rest day + has report = overtime
      if (rest && info) overtime[w.id] = (overtime[w.id] || 0) + 1;
    });

    const dataRow = ws1.addRow(rowData);
    activeWorkers.forEach((w, i) => {
      const rest = isRestDay(w.id, dateStr);
      // Only rest day cells get formatting
      if (rest) {
        const projectCell = dataRow.getCell(i * 3 + 2);
        projectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        projectCell.font = { bold: true };
        const statusCell = dataRow.getCell(i * 3 + 3);
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        statusCell.font = { bold: true };
      }
      for (let k = 1; k <= 3; k++) {
        const c = dataRow.getCell(i * 3 + k);
        c.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
        c.alignment = { horizontal: 'center' };
      }
    });
    ws1.getRow(ws1.rowCount).height = 20;
  });

  // 7. Sheet2 - Overtime summary
  const ws2 = wb.addWorksheet('\u52a0\u73ed\u6c47\u603b');
  [6, 18, 16].forEach((w, i) => ws2.getColumn(i + 1).width = w);
  const s2Title = ws2.addRow(['\u6280\u672f\u5de5\u7a0b\u4e2d\u5fc3\u516c\u51fa\u52a0\u73ed\u7edf\u8ba1\u8868']);
  ws2.mergeCells(1, 1, 1, 3);
  s2Title.eachCell(c => {
    c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
    c.alignment = { horizontal: 'center' };
  });
  const s2Hdr = ws2.addRow(['\u5e8f\u53f7', '\u59d3\u540d', '\u52a0\u73ed\u5929\u6570']);
  s2Hdr.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    c.alignment = { horizontal: 'center' };
  });
  const overtimeList = activeWorkers
    .map((w, i) => ({ idx: i + 1, name: w.user_name, days: overtime[w.id] || 0 }))
    .filter(x => x.days > 0)
    .sort((a, b) => b.days - a.days);
  overtimeList.forEach(x => {
    const r = ws2.addRow([x.idx, x.name, x.days]);
    r.eachCell(c => {
      c.border = { top: { style: 'thin', color: { argb: 'FFD0D0D0' } }, bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } } };
      c.alignment = { horizontal: 'center' };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, filename: y + '\u5e74' + mStr + '\u6708\u6280\u672f\u5de5\u7a0b\u4e2d\u5fc3\u516c\u51fa\u52a0\u73ed\u7edf\u8ba1\u8868.xlsx' };
}'''

with open(r'Y:\AI\WX-APP-OA\backend\src\core\services\report.service.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and replace function
start = None
end = None
depth = 0
started = False
for i, line in enumerate(lines):
    if 'async function exportStatusBoardCSV' in line:
        start = i
        started = True
        depth += line.count('{') - line.count('}')
        continue
    if started:
        depth += line.count('{') - line.count('}')
        if depth == 0:
            end = i + 1
            break

new_lines = lines[:start] + [NEW_FUNC + '\n'] + lines[end:]

with open(r'Y:\AI\WX-APP-OA\backend\src\core\services\report.service.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Replaced lines {start+1}-{end} ({end-start} lines)')
