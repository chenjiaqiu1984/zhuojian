import sys, re
from pathlib import Path

IP = 'http://42.192.107.26:3000'
LOCAL = 'http://localhost:3000'

FILES = [
    'frontend/src/config.js',
    'admin/vite.config.js',
]

def switch(to_local: bool):
    src, dst = (IP, LOCAL) if to_local else (LOCAL, IP)
    for f in FILES:
        p = Path(f)
        text = p.read_text(encoding='utf-8')
        if src in text:
            p.write_text(text.replace(src, dst), encoding='utf-8')
            print(f'  {f} -> {dst}')
        else:
            print(f'  {f} 无需修改')
    print(f'已切换到 {"localhost" if to_local else IP}')

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else None
    if mode == 'local':
        switch(True)
    elif mode == 'ip':
        switch(False)
    else:
        print('用法: python switch_env.py local | ip')
