"""从 DB 回填 Excel 中缺失的 level/detail 到评价规则 sheet"""
import sqlite3, openpyxl

DB_PATH   = r'K:\Code_folder\ohcard\backend\prisma\zhuojian.db'
XLSX_PATH = r'K:\Code_folder\ohcard\mdb_scalesfixed.xlsx'

db = sqlite3.connect(DB_PATH)
cur = db.cursor()

# 取所有 interpretation 数据，以 (code, dimension) 为键
cur.execute('''
    SELECT s.code, i.dimension, i.level, i.detail
    FROM AssessmentInterpretation i
    JOIN AssessmentScale s ON s.id = i.scaleId
''')
db_data = {(r[0], r[1]): {'level': r[2], 'detail': r[3]} for r in cur.fetchall()}
db.close()

wb = openpyxl.load_workbook(XLSX_PATH)
ws = wb['评价规则']

headers = [c.value for c in ws[1]]
# 找 level 和 detail 列索引（1-based）
# 如果列不存在则追加
def col_idx(name):
    for i, h in enumerate(headers, 1):
        if h == name:
            return i
    # 追加新列
    new_col = len(headers) + 1
    ws.cell(row=1, column=new_col, value=name)
    headers.append(name)
    return new_col

level_col  = col_idx('level')
detail_col = col_idx('detail')

updated = 0
for row in ws.iter_rows(min_row=2):
    code = row[0].value
    dim  = row[2].value
    if not code or not dim:
        continue
    key = (code, dim)
    if key not in db_data:
        continue
    data = db_data[key]
    target_level  = ws.cell(row=row[0].row, column=level_col)
    target_detail = ws.cell(row=row[0].row, column=detail_col)
    if target_level.value is None and data['level']:
        target_level.value = data['level']
        updated += 1
    if target_detail.value is None and data['detail']:
        target_detail.value = data['detail']

wb.save(XLSX_PATH)
print(f'回填完成，共更新 {updated} 行 level/detail')
