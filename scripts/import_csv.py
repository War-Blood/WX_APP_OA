import csv
from datetime import datetime

CSV_PATH = r'C:/Users/WarBlood/Desktop/出差日志.csv'
SQL_OUT  = r'Y:/AI/WX-APP-OA/sql/import_latest.sql'

def esc(v):
    """string escape"""
    if v is None or str(v).strip() == '':
        return "''"
    s = str(v).replace('\\', '\\\\').replace("'", "\\'")
    return "'" + s + "'"

def d(v):
    """date or NULL"""
    v = str(v).strip()
    if not v:
        return 'NULL'
    try:
        datetime.strptime(v, '%Y-%m-%d')
        return "'" + v + "'"
    except:
        return 'NULL'

def n(v):
    """int or 0"""
    v = str(v).strip()
    if not v:
        return '0'
    try:
        return str(int(float(v)))
    except:
        return '0'

def f(v):
    """float or 0"""
    v = str(v).strip()
    if not v:
        return '0'
    try:
        return str(float(v))
    except:
        return '0'

rows_imported = 0
min_date = None
max_date = None
sql_lines = []

with open(CSV_PATH, 'r', encoding='gbk') as csvfile:
    reader = csv.reader(csvfile)
    headers = next(reader)
    print(f'CSV headers ({len(headers)}): {headers}')
    
    for row in reader:
        if len(row) < 19:
            continue
            
        report_date = row[0].strip() if len(row) > 0 else ''
        if not report_date:
            continue
        
        # 只导入 2026-06-03 及以后的数据
        if report_date < '2026-06-03':
            continue
        
        if min_date is None or report_date < min_date:
            min_date = report_date
        if max_date is None or report_date > max_date:
            max_date = report_date
        
        rpt = d(report_date)
        entry = d(row[2].strip() if len(row) > 2 else '')
        init_trip = d(row[3].strip() if len(row) > 3 else '')
        project = esc(row[4] if len(row) > 4 else '')
        area = esc(row[5] if len(row) > 5 else '')
        related = esc(row[6] if len(row) > 6 else '')
        workers = esc(row[7] if len(row) > 7 else '')
        # col 8 = 作业人员2, ignore (already in workers from Excel)
        machine = esc(row[9] if len(row) > 9 else '')
        wc = n(row[10] if len(row) > 10 else '')
        w_content = esc(row[11] if len(row) > 11 else '')
        req_qty = n(row[12] if len(row) > 12 else '')
        comp_qty = n(row[13] if len(row) > 13 else '')
        progress = f(row[14] if len(row) > 14 else '')
        today = esc(row[15] if len(row) > 15 else '')
        tomorrow = esc(row[16] if len(row) > 16 else '')
        t_type = esc(row[17] if len(row) > 17 else '')
        tm_type = esc(row[18] if len(row) > 18 else '')
        remark = esc(row[19] if len(row) > 19 else '')
        biz_days = n(row[20] if len(row) > 20 else '')
        pers_days = n(row[21] if len(row) > 21 else '')

        sql = (
            "INSERT INTO daily_reports "
            "(report_date, entry_date, initial_biz_trip_date, project, area, "
            "related_party, workers, machine_model, worker_count, work_content, "
            "required_qty, completed_qty, progress_percent, today_work, tomorrow_plan, "
            "today_work_type, tomorrow_work_type, remark, biz_trip_days, "
            "personal_biz_trip_days, user_id, status) "
            f"VALUES ({rpt}, {entry}, {init_trip}, {project}, {area}, "
            f"{related}, {workers}, {machine}, {wc}, {w_content}, "
            f"{req_qty}, {comp_qty}, {progress}, {today}, {tomorrow}, "
            f"{t_type}, {tm_type}, {remark}, {biz_days}, {pers_days}, 1, 'approved')"
        )
        sql_lines.append(sql)
        rows_imported += 1

with open(SQL_OUT, 'w', encoding='utf-8') as f:
    f.write('USE wx_app_oa;\n')
    for s in sql_lines:
        f.write(s + ';\n')

print(f'Import range: {min_date} ~ {max_date}')
print(f'Rows to import: {rows_imported}')
print(f'SQL written to: {SQL_OUT}')
