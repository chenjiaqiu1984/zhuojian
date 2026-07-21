import win32com.client
import sqlite3

SYSINFODB  = r'K:\Code_folder\ohcard\SYSINFODB.mdb'
GUESTINFODB = r'K:\Code_folder\ohcard\GUESTINFODB.mdb'
SQLITE_DB   = r'K:\Code_folder\ohcard\backend\prisma\zhuojian.db'
SYS_PWD    = 'empgao'

def open_mdb(path, password=None):
    conn = win32com.client.Dispatch("ADODB.Connection")
    cs = f'Provider=Microsoft.ACE.OLEDB.12.0;Data Source={path};Persist Security Info=False'
    if password:
        cs += f';Jet OLEDB:Database Password={password}'
    conn.Open(cs)
    return conn

def read_mdb_table(conn, table):
    rs, _ = conn.Execute(f'SELECT * FROM [{table}]')
    fields = [rs.Fields(i).Name for i in range(rs.Fields.Count)]
    rows = []
    while not rs.EOF:
        row = []
        for f in fields:
            v = rs.Fields(f).Value
            if isinstance(v, (bytes, bytearray)):
                v = v.decode('utf-8', errors='replace')
            elif hasattr(v, 'strftime'):  # datetime
                v = str(v)
            row.append(v)
        rows.append(row)
        rs.MoveNext()
    rs.Close()
    return fields, rows

def insert(cur, sqlite_table, mdb_fields, col_map, rows):
    cols = [col_map.get(f.lower(), f.lower()) for f in mdb_fields]
    sql = 'INSERT OR IGNORE INTO "{}" ({}) VALUES ({})'.format(
        sqlite_table,
        ', '.join(f'"{c}"' for c in cols),
        ', '.join(['?'] * len(cols))
    )
    n = 0
    for row in rows:
        try:
            cur.execute(sql, row)
            n += 1
        except Exception as e:
            print(f'  [warn] {sqlite_table}: {e}')
    return n

# field name mappings where MDB name differs from SQLite column name
MAPPINGS = {
    'mdb_convert_mmpi': {'user_sex': 'user_sex', 'lstyle': 'lstyle',
                          'factor_number': 'factor_number',
                          'original_score': 'original_score',
                          'converted_score': 'converted_score'},
    'mdb_username': {'testgrou': 'testgrou'},
}

def do_import(mdb_conn, mdb_table, sqlite_table, cur):
    fields, rows = read_mdb_table(mdb_conn, mdb_table)
    if not rows:
        print(f'  {mdb_table}: 0 rows')
        return
    col_map = MAPPINGS.get(sqlite_table, {})
    n = insert(cur, sqlite_table, fields, col_map, rows)
    print(f'  {mdb_table} -> {sqlite_table}: {n}/{len(rows)} rows inserted')

def main():
    print('Opening MDB connections...')
    sys_conn   = open_mdb(SYSINFODB, SYS_PWD)
    guest_conn = open_mdb(GUESTINFODB)

    db = sqlite3.connect(SQLITE_DB)
    cur = db.cursor()

    print('\n=== SYSINFODB ===')
    for mdb_t, sqlite_t in [
        ('account',      'mdb_account'),
        ('AverageSD',    'mdb_average_sd'),
        ('Convert_MMPI', 'mdb_convert_mmpi'),
        ('hmez',         'mdb_hmez'),
        ('toplr',        'mdb_toplr'),
        ('treename',     'mdb_treename'),
        ('TT',           'mdb_tt'),
    ]:
        do_import(sys_conn, mdb_t, sqlite_t, cur)

    print('\n=== GUESTINFODB ===')
    for mdb_t, sqlite_t in [
        ('username', 'mdb_username'),
        ('usebb',    'mdb_usebb'),
        ('usekb',    'mdb_usekb'),
        ('usexg',    'mdb_usexg'),
        ('usexx',    'mdb_usexx'),
        ('jg',       'mdb_jg'),
        ('jgmx',     'mdb_jgmx'),
        ('jgmxx',    'mdb_jgmxx'),
        ('testsave', 'mdb_testsave'),
    ]:
        do_import(guest_conn, mdb_t, sqlite_t, cur)

    db.commit()
    db.close()
    sys_conn.Close()
    guest_conn.Close()
    print('\nDone.')

if __name__ == '__main__':
    main()
