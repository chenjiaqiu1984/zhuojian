import sqlite3, openpyxl, json

db = sqlite3.connect(r'K:\Code_folder\ohcard\backend\prisma\zhuojian.db')
cur = db.cursor()

cur.execute('SELECT code, name, scoringRule FROM AssessmentScale ORDER BY id')
db_scales = {r[0]: {'name': r[1], 'method': json.loads(r[2]).get('method','?')} for r in cur.fetchall()}
print(f'DB 量表数: {len(db_scales)}')
for code, info in db_scales.items():
    print(f'  {code} [{info["method"]}] {info["name"][:30]}')

wb = openpyxl.load_workbook(r'K:\Code_folder\ohcard\mdb_scalesfixed.xlsx')
ws1 = wb['量表信息']
xl_codes = set()
for row in ws1.iter_rows(min_row=2, values_only=True):
    if row[0]: xl_codes.add(row[0])
print(f'\nExcel 量表数: {len(xl_codes)}')

in_db_not_xl = set(db_scales.keys()) - xl_codes
in_xl_not_db = xl_codes - set(db_scales.keys())
print(f'在DB但不在Excel: {in_db_not_xl or "无"}')
print(f'在Excel但不在DB: {in_xl_not_db or "无"}')

# 检查每个量表的评价规则数
cur.execute('SELECT scaleId, COUNT(*) FROM AssessmentInterpretation GROUP BY scaleId')
interp_counts = dict(cur.fetchall())
cur.execute('SELECT id, code FROM AssessmentScale')
id_to_code = {r[0]: r[1] for r in cur.fetchall()}
print('\n各量表评价规则数:')
for sid, cnt in interp_counts.items():
    code = id_to_code.get(sid, '?')
    print(f'  {code}: {cnt} 条')

ws3 = wb['评价规则']
level_vals = []
for row in ws3.iter_rows(min_row=2, values_only=True):
    if row[0] and len(row) > 13 and row[13]:
        level_vals.append((row[0], row[2], row[13]))
print(f'\n评价规则中有 level 值的行数: {len(level_vals)}')
for v in level_vals[:5]:
    print(f'  {v}')

db.close()
