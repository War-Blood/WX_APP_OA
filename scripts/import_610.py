#!/usr/bin/env python3
"""
将 6-10数据.xlsx 导入 daily_reports 表
Excel 列映射（基于实际数据分析）:
  [0]  report_date          汇报日期
  [2]  initial_biz_trip_date 初次出差日期
  [3]  entry_date            入场日期
  [4]  project               项目名称
  [5]  area                  区域
  [6]  related_party         关联方
  [7]  workers               人员
  [9]  machine_model         机型
  [11] work_content          工作内容
  [12] required_qty          需求数量
  [13] completed_qty         完成数量
  [15] remark                备注
  [16] today_work            今日工作
  [17] today_work_type       今日状态
  [18] tomorrow_work_type    明日状态
"""
import openpyxl
from datetime import datetime, date

# 用户名 → ID 映射
USER_MAP = {
    'admin': 1, '杨帆': 3, '黄文才': 7, '冯双': 8,
    '高裕': 9, '曹国永': 11
}

def esc(v):
    if v is None: return 'NULL'
    s = str(v).replace('\\', '\\\\').replace("'", "\\'")
    return "'" + s + "'"

def date_val(v):
    if v is None: return 'NULL'
    if isinstance(v, (datetime, date)):
        return "'" + v.strftime('%Y-%m-%d') + "'"
    if isinstance(v, str):
        try:
            d = datetime.strptime(v.strip(), '%Y-%m-%d')
            return "'" + d.strftime('%Y-%m-%d') + "'"
        except:
            return 'NULL'
    return 'NULL'

def num(v, default='0'):
    if v is None: return default
    try: return str(int(float(str(v))))
    except: return default

def dec(v):
    if v is None: return 'NULL'
    try:
        val = float(str(v))
        return str(round(val, 4))
    except: return 'NULL'

def calc_days(d1, d2):
    """计算日期差（天）"""
    if d1 is None or d2 is None: return None
    if isinstance(d1, (datetime, date)):
        d1 = d1.date() if isinstance(d1, datetime) else d1
    else:
        try: d1 = datetime.strptime(str(d1).strip(), '%Y-%m-%d').date()
        except: return None
    if isinstance(d2, (datetime, date)):
        d2 = d2.date() if isinstance(d2, datetime) else d2
    else:
        try: d2 = datetime.strptime(str(d2).strip(), '%Y-%m-%d').date()
        except: return None
    return (d1 - d2).days

def match_user(workers_str):
    if workers_str is None: return None
    for name, uid in USER_MAP.items():
        if name in str(workers_str):
            return uid
    return None

# ── 加载 Excel ──────────────────────────
wb = openpyxl.load_workbook(r'y:\AI\WX-APP-OA\6-10数据.xlsx')
ws = wb.active

sql_lines = []
stats = {'total': 0, 'matched': 0, 'unmatched': 0, 'dup': 0}
seen = set()

for row in ws.iter_rows(min_row=1, values_only=True):
    if not row or row[0] is None:
        continue

    # ── 列映射 ───────────────────────
    report_date  = date_val(row[0])
    entry_date   = date_val(row[3])  # 入场日期
    init_trip    = date_val(row[2])  # 初次出差日期
    project      = esc(row[4]) if row[4] else "''"
    area         = esc(row[5]) if row[5] else "''"
    related      = esc(row[6]) if row[6] else "''"
    workers      = esc(row[7]) if row[7] else "''"
    machine      = esc(row[9]) if row[9] else "''"
    work_content = esc(row[11]) if row[11] else "''"
    required_qty = num(row[12])
    completed_qty= num(row[13])
    remark       = esc(row[15]) if row[15] else "''"
    today_work   = esc(row[16]) if row[16] else "''"
    today_type   = esc(row[17]) if row[17] else "''"
    tomorrow_type= esc(row[18]) if row[18] else "''"

    # 用户匹配
    w_str = str(row[7]) if row[7] else None
    uid = match_user(w_str)
    uid_str = str(uid) if uid else 'NULL'
    if uid:
        stats['matched'] += 1
    else:
        stats['unmatched'] += 1

    # 天数计算
    # 获取日期对象用于计算
    def get_date_obj(v):
        if isinstance(v, (datetime, date)):
            return v.date() if isinstance(v, datetime) else v
        if isinstance(v, str):
            try: return datetime.strptime(v.strip(), '%Y-%m-%d').date()
            except: return None
        return None

    rd = row[0]
    ed = row[3]
    ibd = row[2]

    personal_days = calc_days(rd, ed)
    biz_days = calc_days(rd, ibd)
    pd_str = str(personal_days) if personal_days is not None else '0'
    bd_str = str(biz_days) if biz_days is not None else '0'

    # 进度百分比
    progress = 'NULL'
    try:
        rq = float(required_qty)
        cq = float(completed_qty)
        if rq > 0:
            progress = str(round(cq / rq, 4))
    except:
        pass

    # 去重检查
    key = (report_date, project, init_trip)
    if key in seen:
        stats['dup'] += 1
        continue
    seen.add(key)

    sql = (
        "INSERT INTO daily_reports "
        "(report_date, initial_biz_trip_date, entry_date, "
        "project, area, related_party, workers, machine_model, "
        "work_content, required_qty, completed_qty, progress_percent, "
        "remark, today_work, today_work_type, tomorrow_work_type, "
        "biz_trip_days, personal_biz_trip_days, user_id, status, timeliness) "
        f"VALUES ({report_date}, {init_trip}, {entry_date}, "
        f"{project}, {area}, {related}, {workers}, {machine}, "
        f"{work_content}, {required_qty}, {completed_qty}, {progress}, "
        f"{remark}, {today_work}, {today_type}, {tomorrow_type}, "
        f"{bd_str}, {pd_str}, {uid_str}, 'approved', 'on_time')"
    )
    sql_lines.append(sql)
    stats['total'] += 1

# ── 输出 SQL ──────────────────────────
OUT = r'Y:/AI/WX-APP-OA/sql/import_610.sql'
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('-- 从 6-10数据.xlsx 导入公出日志\n')
    f.write(f'-- 生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n')
    f.write(f'-- 导入: {stats["total"]} 条, 匹配用户: {stats["matched"]}, 未匹配: {stats["unmatched"]}, 跳过重复: {stats["dup"]}\n')
    f.write('USE wx_app_oa;\n\n')
    for s in sql_lines:
        f.write(s + ';\n')

print(f'[OK] 生成 {stats["total"]} 条 INSERT 语句')
print(f'   匹配用户: {stats["matched"]} 条')
print(f'   未匹配用户: {stats["unmatched"]} 条 (user_id=NULL)')
print(f'   跳过重复: {stats["dup"]} 条')
print(f'   输出文件: {OUT}')
print()
print('=== 前 3 条 SQL 预览 ===')
for s in sql_lines[:3]:
    print(s)
    print()
