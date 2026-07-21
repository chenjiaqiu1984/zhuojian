import openpyxl
wb = openpyxl.load_workbook(r"K:\Code_folder\ohcard\mdb_scalesfixed.xlsx")
ws = wb["量表信息"]
rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r[0]]
print("量表数:", len(rows))
for r in rows[:5]:
    print(r[0], r[1])
