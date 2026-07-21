import sqlite3, openpyxl, json

db = sqlite3.connect(r'K:\Code_folder\ohcard\backend\prisma\zhuojian.db')
cur = db.cursor()

wb = openpyxl.load_workbook(r'K:\Code_folder\ohcard\mdb_scalesfixed.xlsx')
ws3 = wb['评价规则']

# Excel中各量表的评价规则行数
xl_counts = {}
for row in ws3.iter_rows(min_row=2, values_only=True):
    if row[0]:
        xl_counts[row[0]] = xl_counts.get(row[0], 0) + 1

# DB中各量表的评价规则行数
cur.execute('''
    SELECT s.code, COUNT(i.id)
    FROM AssessmentScale s
    LEFT JOIN AssessmentInterpretation i ON s.id = i.scaleId
    GROUP BY s.code
''')
db_counts = dict(cur.fetchall())

print(f'{"量表编码":<20} {"Excel":<8} {"DB":<8} {"差异"}')
print('-' * 50)
all_codes = sorted(set(list(xl_counts.keys()) + list(db_counts.keys())))
for code in all_codes:
    xl = xl_counts.get(code, 0)
    db_n = db_counts.get(code, 0)
    flag = '<<<' if xl != db_n else ''
    print(f'{code:<20} {xl:<8} {db_n:<8} {flag}')

# 检查Excel中MBTI行的level列
print('\nExcel 评价规则中 MBTI_1 的行:')
for row in ws3.iter_rows(min_row=2, values_only=True):
    if row[0] == 'MBTI_1':
        print(f'  dim={row[2]} level={str(row[13])[:30] if len(row)>13 else "无列"}')

db.close()
