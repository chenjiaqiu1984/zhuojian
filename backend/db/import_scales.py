import json
import sqlite3

import os
_DIR = os.path.dirname(__file__)
JSON_PATH = os.path.join(_DIR, 'mdb_scales.json')
DB_PATH   = os.path.join(_DIR, '..', 'prisma', 'zhuojian.db')

with open(JSON_PATH, encoding='utf-8') as f:
    scales = json.load(f)

db = sqlite3.connect(DB_PATH)
cur = db.cursor()

inserted = skipped = 0
for s in scales:
    cur.execute('SELECT id FROM AssessmentScale WHERE code=?', (s['code'],))
    row = cur.fetchone()
    if row:
        skipped += 1
        continue

    cur.execute('''
        INSERT INTO AssessmentScale
          (code, name, category, description, isPaid, isActive,
           totalQuestions, estimatedMinutes, scoringRule, scenarios)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    ''', (
        s['code'], s['name'], s['category'], s['description'],
        1 if s.get('isPaid') else 0,
        1 if s.get('isActive', True) else 0,
        s['totalQuestions'], s['estimatedMinutes'],
        json.dumps(s['scoringRule'], ensure_ascii=False),
        '[]'
    ))
    scale_id = cur.lastrowid

    for q in s.get('questions', []):
        cur.execute('''
            INSERT INTO AssessmentQuestion
              (scaleId, orderNum, content, options, dimension)
            VALUES (?,?,?,?,?)
        ''', (
            scale_id, q['orderNum'], q['content'],
            json.dumps(q['options'], ensure_ascii=False),
            q.get('dimension')
        ))

    for i in s.get('interpretations', []):
        cur.execute('''
            INSERT INTO AssessmentInterpretation
              (scaleId, dimension, calculationMethod, standardScore, variance,
               minScore, maxScore, ageMin, ageMax, gender, isNormal, level, detail)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ''', (
            scale_id,
            i.get('dimension'), i.get('calculationMethod'),
            i.get('standardScore'), i.get('variance'),
            i['minScore'], i['maxScore'],
            i.get('ageMin'), i.get('ageMax'),
            i.get('gender'), i.get('isNormal'),
            i.get('level'), i['detail']
        ))

    inserted += 1

db.commit()
db.close()
print(f'导入完成：{inserted} 条插入，{skipped} 条跳过（code 已存在）')
