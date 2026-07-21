import json

with open(r"K:\Code_folder\ohcard\content_map.json", encoding="utf-8") as f:
    content_map = json.load(f)

with open(r"K:\Code_folder\ohcard\backend\db\mdb_scales.json", encoding="utf-8") as f:
    scales = json.load(f)

for s in scales:
    if s["code"] in content_map:
        s["introduction"] = content_map[s["code"]]["introduction"]
        s["instruction"] = content_map[s["code"]]["instruction"]

with open(r"K:\Code_folder\ohcard\backend\db\mdb_scales.json", "w", encoding="utf-8") as f:
    json.dump(scales, f, ensure_ascii=False, indent=2)

print(f"已更新 {sum(1 for s in scales if 'introduction' in s)} 个量表")
