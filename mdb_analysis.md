# MentalStateTest.exe 数据库分析

## EXE 如何调用两个 MDB

### 连接方式

程序用 **ADO (ADODB)** + **Microsoft Jet 4.0 OLE DB** 驱动打开数据库：

| 数据库 | 连接字符串 | 密码 |
|--------|-----------|------|
| `SYSINFODB.mdb` | `Provider=Microsoft.Jet.OLEDB.4.0;Jet OLEDB:Database Password=empgao` | `empgao` |
| `GUESTINFODB.mdb` | `Provider=Microsoft.Jet.OLEDB.4.0;...;Persist Security Info=False` | 无 |

连接字符串在 EXE 中的位置：
- `0x002c65a8`：SYSINFODB 连接前缀
- `0x002c65ec`：`\sysinfodb.mdb;Persist Security Info=True;Jet OLEDB:Database Password=empgao`
- `0x002837f4`：GUESTINFODB 连接前缀（无密码）

---

## SYSINFODB.mdb —— 系统/量表数据库（只读参考数据）

### 表结构

| 表名 | 行数 | 字段 | 用途 |
|------|------|------|------|
| `account` | 1542 | no, agemin, agemax, xb, hmid, name, min, max, explain | 量表评分区间及解释文字（如 SCL-90） |
| `AverageSD` | 24 | Age, Gender, Average, SD | 按年龄/性别的常模均值和标准差 |
| `Convert_MMPI` | 2308 | ID, User_Sex, LStyle, Factor_Number, Original_Score, Converted_Score | MMPI 原始分→T分转换表 |
| `hmez` | 709 | id, agemin, agemax, xb, hmid, ez, topid | 量表各分量表的题目分组 |
| `toplr` | 7673 | no, hmid, topid, hmna, toplr, chc, a~j, ac~jc, picture | 题目选项及各选项分值 |
| `treename` | 163 | id, name, parentid, chc, maxavg, hmjg, max, min, csr, xb | 量表名称树形结构（父子分类） |
| `TT` | 36 | no, hmid, topid, hmna, toplr, chc, a~j, ac~jc, picture | 另一套量表题目数据 |

### 典型 SQL 查询

```sql
-- 读取量表题目及选项
select * from toplr where hmid=:p order by topid
select * from hmez where hmid=:o and agemin<=:l and agemax>=:k and xb like :o order by id

-- MMPI 分数转换
select * from Convert_MMPI where User_Sex=:H and Factor_Number=:K and Original_Score=:S

-- 读取常模
select average,sd from AverageSD where age=:age and gender=:sex

-- 评分区间及解释
select * from [account] where name=:i and min<=:o and max>:p and hmid=:j and agemin<=:s and agemax>=:d and xb like :w

-- 汇总统计（用于报告）
select jgmx_hmna, max(sumcount) as x, round(avg(sumcount),1) as v, min(sumcount) as i
  from (SELECT jg.id, jg.hmna AS jg_hmna, jgmx.hmna AS jgmx_hmna, jgmx.sumcount as sumcount
        FROM jg INNER JOIN jgmx ON jg.id = jgmx.jgid) as d
  where jg_hmna=:p group by jgmx_hmna
```

---

## GUESTINFODB.mdb —— 受测者/结果数据库（读写）

### 表结构

| 表名 | 行数 | 字段 | 用途 |
|------|------|------|------|
| `username` | 1 | id, name, xb, csdate, tel, address, TESTGROU | 当前登录操作员账号 |
| `usebb` | 3 | id, mzh, name, xb, csdate, hwno | 受测者基本信息（档案号/姓名/性别/生日/病历号） |
| `usekb` | 4 | id, mzh, hwno, hwdate, hcm, wkg, tel, addr, cx | 受测者就诊卡（就诊日期、科室等） |
| `usexg` | 8 | id, mzh, hwno, name, ral, tel | 受测者关系人（家属联系人） |
| `usexx` | 153 | id, mzh, hwno, hmlr, hmjg | 测试记录（量表录入/结果） |
| `jg` | 5 | id, userid, username, timeing, hmna, tmc, sumcount, avgcount, maxavgcount, exc, type, exlev, exavg, bgr | 测试总结果（得分汇总） |
| `jgmx` | 43 | id, jgid, hmna, sumcount, avgcount, type, explain | 结果分量表明细 |
| `jgmxx` | 1314 | id, jgid, topid, sorc | 每道题答题记录 |
| `testsave` | 0 | id, hmid, userid, topid, ch | 中断保存的测试进度（当前为空） |

### 典型 SQL 查询

```sql
-- 查询/新建受测者
select * from [usebb] where mzh=:d
insert into [usebb] (mzh,name,xb,csdate,hwno) values (:q,:w,:e,:r,:t)

-- 就诊记录
insert into [usekb] (mzh,hwno,hwdate,hcm,wkg,cx,addr,tel) values (:q,:w,:o,:k,:s,:m,:n,:b)
insert into [usexg] (mzh,hwno,name,ral,tel) values (:q,:w,:e,:r,:t)
insert into [usexx] (mzh,hwno,hmlr,hmjg) values (:q,:w,:e,:r)

-- 保存答题进度
insert into testsave (hmid,userid,topid,ch) values (:o,:p,:l,:j)
delete from testsave where hmid=:p and userid=:k

-- 保存测试结果
insert into [jg] (id,userid,username,hmna,timeing,sumcount,type,avgcount,maxavgcount,tmc) values (...)
insert into jgmx (jgid,hmna,sumcount,avgcount,type) values (:l,:j,:h,:g,:p)
insert into jgmxx (jgid,topid,sorc) values (:l,:k,:j)

-- 删除用户及其全部结果
delete from jgmx where jgid=:i
delete from jgmxx where jgid=:i
delete from jg where userid=:i
delete from testsave where userid=:k

-- 结果查询（报告用）
select jg.id,jg.userid,jg.username,jg.timeing,jg.hmna,jg.tmc,jg.sumcount,
       jg.avgcount,jg.type,jgmx.hmna,jgmx.sumcount,jgmx.avgcount,jgmx.type
  from jg inner join jgmx on jg.id=jgmx.jgid
  where jg.userid=:p and jg.hmna=:k order by jg.hmna

-- 跨库汇总（GUESTINFODB 中的 jg/jgmx + SYSINFODB 中的 username）
select jg.hmna AS hmna, jg.sumcount AS hmsum, jgmx.hmna AS ezna,
       jgmx.sumcount AS ezsum, username.csdate AS csdate, username.xb AS xb,
       username.testgrou AS testgroup
  FROM (jg INNER JOIN username ON jg.username=username.name)
       INNER JOIN jgmx ON jg.id=jgmx.jgid
```

---

## 两库关系图

```
SYSINFODB.mdb（只读，系统参数）      GUESTINFODB.mdb（读写，业务数据）
┌─────────────┐                      ┌──────────────┐
│ treename    │ 量表目录树            │ username     │ 操作员
│ toplr       │ 题目+选项分值         │ usebb        │ 受测者档案
│ hmez        │ 分量表题目分组        │ usekb/xg/xx  │ 就诊信息
│ account     │ 评分区间+解释         │ testsave     │ 答题进度
│ AverageSD   │ 常模                  │ jg           │ 测试总分
│ Convert_MMPI│ MMPI T分转换          │ jgmx         │ 分量表分
└─────────────┘                      │ jgmxx        │ 每题答案
                                     └──────────────┘
```

**数据流：** 从 SYSINFODB 读题目 → 存答案到 GUESTINFODB.jgmxx → 计算得分写入 jg/jgmx → 查 SYSINFODB.account 获取解释文字 → 生成报告。
