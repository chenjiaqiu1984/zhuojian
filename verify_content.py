import json
with open(r"K:\Code_folder\ohcard\backend\db\mdb_scales.json", encoding="utf-8") as f:
    scales = json.load(f)
s = scales[0]
print("量表:", s["name"])
print("简介:", s.get("introduction", ""))
print("引导词:", s.get("instruction", ""))
