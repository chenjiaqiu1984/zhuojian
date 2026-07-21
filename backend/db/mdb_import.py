import win32com.client
import json

SYSINFODB = r'K:\Code_folder\ohcard\SYSINFODB.mdb'
PASSWORD = 'empgao'
OUTPUT = r'K:\Code_folder\ohcard\backend\db\mdb_scales.json'

CATEGORY_MAP = {201: 'children', 202: 'clinical', 203: 'psychiatric', 204: 'personality'}
OPT_KEYS = list('abcdefghij')
SCR_KEYS = ['ac','bc','cc','dc','ec','fc','gc','hc','ic','jc']

def open_conn():
    conn = win32com.client.Dispatch("ADODB.Connection")
    conn.Open(f'Provider=Microsoft.ACE.OLEDB.12.0;Data Source={SYSINFODB};Jet OLEDB:Database Password={PASSWORD}')
    return conn

def query(conn, sql):
    rs, _ = conn.Execute(sql)
    fields = [rs.Fields(i).Name for i in range(rs.Fields.Count)]
    rows = []
    while not rs.EOF:
        rows.append({f: rs.Fields(f).Value for f in fields})
        rs.MoveNext()
    return rows

conn = open_conn()

scales_with_q = {r['hmid'] for r in query(conn, 'SELECT DISTINCT hmid FROM toplr')}
all_scales = query(conn, 'SELECT id,name,parentid,hmjg,xb FROM treename WHERE parentid>0 ORDER BY id')

result = []
for sm in all_scales:
    hmid = sm['id']
    if hmid not in scales_with_q:
        continue

    qs_raw = query(conn, f'SELECT topid,toplr,chc,hmna,{",".join(OPT_KEYS)},{",".join(SCR_KEYS)} FROM toplr WHERE hmid={hmid} ORDER BY topid')
    dims_raw = query(conn, f'SELECT ez,topid,agemin,agemax,xb FROM hmez WHERE hmid={hmid} ORDER BY id')
    scale_name = str(sm['name'] or '').strip()
    interp_raw = query(conn, f'SELECT name,min,max,agemin,agemax,xb,explain FROM [account] WHERE hmid={hmid} ORDER BY name,[min]')

    questions = []
    for q in qs_raw:
        chc = int(q['chc'] or 0)
        opts = []
        for k in range(chc):
            label = str(q[OPT_KEYS[k]] or '').strip()
            try:
                val = float(q[SCR_KEYS[k]])
            except (TypeError, ValueError):
                val = k
            opts.append({'value': val, 'label': label})
        questions.append({
            'orderNum': int(q['topid']),
            'content': str(q['toplr'] or '').strip(),
            'options': opts,
            'dimension': str(q['hmna'] or '').strip() or None
        })

    dims = []
    for d in dims_raw:
        topids = [int(x) for x in str(d['topid'] or '').split(',') if x.strip().lstrip(',').isdigit()]
        dims.append({
            'code': str(d['ez']).strip(),
            'questions': topids
        })

    interps = []
    for i in interp_raw:
        dim_name = str(i['name'] or '').strip()
        interps.append({
            'dimension': None if dim_name == scale_name else dim_name,
            'minScore': float(i['min'] or 0),
            'maxScore': float(i['max'] or 0),
            'ageMin': int(i['agemin']) if i['agemin'] is not None and str(i['agemin']).strip() else None,
            'ageMax': int(i['agemax']) if i['agemax'] is not None and str(i['agemax']).strip() else None,
            'gender': str(i['xb'] or '').strip() or None,
            'detail': str(i['explain'] or '').strip()
        })

    scoring_rule = {'method': 'dimension_total' if dims else 'sum'}
    if dims:
        scoring_rule['dimensions'] = dims

    result.append({
        'code': f'MDB_{hmid}',
        'name': scale_name,
        'category': CATEGORY_MAP.get(sm['parentid'], 'other'),
        'description': str(sm['hmjg'] or '').strip() or scale_name,
        'totalQuestions': len(questions),
        'estimatedMinutes': max(3, len(questions) // 3),
        'isPaid': False,
        'isActive': True,
        'scoringRule': scoring_rule,
        'questions': questions,
        'interpretations': interps
    })

conn.Close()

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f'Exported {len(result)} scales -> {OUTPUT}')
