from pathlib import Path

IP = 'http://42.192.107.26:3000'
LOCAL = 'http://localhost:3000'
FILES = ['frontend/src/config.js', 'admin/vite.config.js']

for f in FILES:
    p = Path(f)
    t = p.read_text(encoding='utf-8')
    if LOCAL in t:
        p.write_text(t.replace(LOCAL, IP), encoding='utf-8')
        print(f'  {f} 已切换')
print(f'已切换到 {IP}')
