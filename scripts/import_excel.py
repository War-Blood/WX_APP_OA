import openpyxl, os

EXCEL_PATH = r"C:/Users/WarBlood/Desktop/2026年6月2日公出日志.xlsx"
OUTPUT_SQL = r"Y:/AI/WX-APP-OA/sql/import_latest.sql"

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb.active

def esc(s):
    return str(s).replace("\\", "\\\\").replace("'", "\\'")

def d(v):
    """date string or NULL"""
    if v is None: return 'NULL'
    if hasattr(v, 'strftime'): return f"'{v.strftime('%Y-%m-%d')}'"
    s = str(v).strip()
    return f"'{esc(s)}'" if s else 'NULL'

def s(v, default=''):
    """string or default"""
    if v is None: return f"'{esc(default)}'"
    val = str(v).strip()
    return f"'{esc(val)}'" if val else f"'{esc(default)}'"

def n(v):
    """numeric or NULL"""
    if v is None: return 'NULL'
    try: return str(int(float(str(v))))
    except: return 'NULL'

def f(v):
    """float/decimal or NULL"""
    if v is None: return 'NULL'
    try: return str(float(str(v)))
    except: return 'NULL'

sql_lines = []

for row in ws.iter_rows(min_row=2, values_only=True):
    if not row[0]: continue

    report_date = d(row[0])
    entry_date  = d(row[2]) if len(row) > 2 else 'NULL'
    biz_start   = d(row[3]) if len(row) > 3 else 'NULL'
    project     = s(row[4]) if len(row) > 4 else "''"
    area        = s(row[5]) if len(row) > 5 else "''"
    party       = s(row[6]) if len(row) > 6 else "''"
    w1          = str(row[7]).strip() if len(row) > 7 and row[7] else ''
    w2          = str(row[8]).strip() if len(row) > 8 and row[8] else ''
    machine     = s(row[9]) if len(row) > 9 else "''"
    worker_count = n(row[10]) if len(row) > 10 else '0'
    work_content = s(row[11]) if len(row) > 11 else "''"
    required_qty = n(row[12]) if len(row) > 12 else '0'
    completed_qty = n(row[13]) if len(row) > 13 else '0'
    progress    = f(row[14]) if len(row) > 14 else 'NULL'
    today_work  = s(row[15]) if len(row) > 15 else "''"
    tomorrow    = s(row[16]) if len(row) > 16 else "''"
    today_type  = s(row[17]) if len(row) > 17 else "''"
    tomorrow_type = s(row[18]) if len(row) > 18 else "''"
    remark      = s(row[19]) if len(row) > 19 else "''"
    biz_days    = n(row[20]) if len(row) > 20 else '0'
    personal_days = n(row[21]) if len(row) > 21 else '0'

    workers_list = [n2 for n2 in [w1, w2] if n2]
    workers = "、".join(workers_list) if workers_list else ''

    workers_val = f"'{esc(workers)}'" if workers else "''"
    sql = (
        f"INSERT INTO daily_reports (report_date, project, area, related_party, workers, machine_model, worker_count, "
        f"work_content, today_work_type, today_work, tomorrow_work_type, tomorrow_plan, required_qty, completed_qty, "
        f"progress_percent, entry_date, initial_biz_trip_date, issues, remark, biz_trip_days, personal_biz_trip_days, "
        f"status, content, user_id) "
        f"VALUES ({report_date}, {project}, {area}, {party}, {workers_val}, "
        f"{machine}, {worker_count}, {work_content}, "
        f"{today_type}, {today_work}, {tomorrow_type}, {tomorrow}, "
        f"{required_qty}, {completed_qty}, {progress}, {entry_date}, {biz_start}, '', {remark}, "
        f"{biz_days}, {personal_days}, 'approved', '', 1)"
        f" ON DUPLICATE KEY UPDATE id=id;\n"
    )
    sql_lines.append(sql)

print(f"Total rows: {len(sql_lines)}")

os.makedirs(os.path.dirname(OUTPUT_SQL), exist_ok=True)
with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
    f.write("USE wx_app_oa;\nSET NAMES utf8mb4;\n")
    f.writelines(sql_lines)

print(f"SQL written: {OUTPUT_SQL}")
