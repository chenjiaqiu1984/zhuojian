import sqlite3, json

db = sqlite3.connect(r'K:\Code_folder\ohcard\backend\prisma\zhuojian.db')
cur = db.cursor()

cur.execute("SELECT id FROM AssessmentScale WHERE code='MBTI_1'")
sid = cur.fetchone()[0]

cur.execute("SELECT dimension, level, detail FROM AssessmentInterpretation WHERE scaleId=? ORDER BY id", (sid,))
rows = cur.fetchall()
print(f'MBTI_1 评价规则共 {len(rows)} 条:')
for r in rows:
    print(f'  dimension={r[0]!r} level={r[1]!r} detail={str(r[2])[:40]!r}')

db.close()
