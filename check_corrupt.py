import sqlite3, openpyxl

db = sqlite3.connect(r'K:\Code_folder\ohcard\backend\prisma\zhuojian.db')
cur = db.cursor()

# 找 variance 不是数字的行
cur.execute('''
    SELECT i.id, s.code, i.dimension, i.variance, i.level
    FROM AssessmentInterpretation i
    JOIN AssessmentScale s ON s.id = i.scaleId
    WHERE i.variance IS NOT NULL
''')
for r in cur.fetchall():
    try:
        float(r[3])
    except (TypeError, ValueError):
        print(f'id={r[0]} code={r[1]} dim={r[2]} variance={str(r[3])[:40]} level={str(r[4])[:30]}')

db.close()

# Excel 评价规则列数和 MBTI 行的前几列
wb = openpyxl.load_workbook(r'K:\Code_folder\ohcard\mdb_scalesfixed.xlsx')
ws = wb['评价规则']
print('\nExcel 评价规则 headers:')
print([c.value for c in ws[1]])
print('\nMBTI_1 第一行 (全列):')
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] == 'MBTI_1':
        print(row)
        break
