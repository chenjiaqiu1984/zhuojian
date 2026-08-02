<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>解压游戏管理</h2>
    </div>

    <el-tabs v-model="tab" @tab-change="onTab">
      <!-- 曼达拉 -->
      <el-tab-pane label="曼达拉" name="mandala">
        <el-card style="margin-bottom:16px">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
            <el-input v-model="m.q" placeholder="用户名 / 手机" clearable style="width:200px" @keyup.enter="mSearch" @clear="mSearch" />
            <el-select v-model="m.mood" placeholder="情绪" clearable style="width:120px" @change="mSearch">
              <el-option label="快乐" value="happy" />
              <el-option label="平静" value="calm" />
              <el-option label="悲伤" value="sad" />
              <el-option label="愤怒" value="angry" />
              <el-option label="焦虑" value="anxious" />
            </el-select>
            <el-button type="primary" @click="mSearch">查询</el-button>
            <el-tag type="info">共 {{ m.total }} 幅作品</el-tag>
          </div>
        </el-card>
        <el-table :data="m.list" border v-loading="m.loading">
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="用户" width="180">
            <template #default="{ row }">{{ userLabel(row.user) }}</template>
          </el-table-column>
          <el-table-column label="情绪" width="90">
            <template #default="{ row }">{{ moodLabel(row.mood) }}</template>
          </el-table-column>
          <el-table-column label="对称" width="80" prop="symmetry" />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" @click="viewMandala(row)">查看</el-button>
              <el-popconfirm title="确认删除该作品？" @confirm="delMandala(row)">
                <template #reference>
                  <el-button text type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          style="margin-top:16px;justify-content:flex-end;display:flex"
          v-model:current-page="m.page"
          :page-size="m.pageSize"
          :total="m.total"
          layout="total, prev, pager, next"
          @current-change="loadMandalas"
        />

        <el-dialog
          v-model="preview.visible"
          :title="preview.title"
          width="560px"
          destroy-on-close
          @opened="paintPreview"
        >
          <div v-loading="preview.loading" style="display:flex;flex-direction:column;align-items:center;gap:12px;min-height:320px">
            <div v-if="preview.meta" style="width:100%;color:#666;font-size:13px;line-height:1.7">
              <div>用户：{{ preview.meta.user }}</div>
              <div>时间：{{ preview.meta.time }} · 情绪：{{ preview.meta.mood }} · 对称：{{ preview.meta.symmetry }}</div>
            </div>
            <canvas ref="previewCanvas" style="border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,.08);background:#FDF8F2" />
            <el-empty v-if="preview.error" :description="preview.error" :image-size="80" />
          </div>
        </el-dialog>
      </el-tab-pane>

      <!-- 呼吸 -->
      <el-tab-pane label="呼吸训练" name="breathing">
        <el-tabs v-model="breathSub" type="card">
          <el-tab-pane label="单一模式" name="modes">
            <div style="margin-bottom:12px">
              <el-button type="primary" size="small" @click="addMode">+ 新增模式</el-button>
              <el-button type="success" size="small" :loading="breathSaving" @click="saveModes">保存模式配置</el-button>
            </div>
            <el-table :data="modes" border v-loading="breathLoading">
              <el-table-column label="启用" width="70">
                <template #default="{ row }">
                  <el-switch v-model="row.enabled" />
                </template>
              </el-table-column>
              <el-table-column label="Key" width="100">
                <template #default="{ row }"><el-input v-model="row.key" size="small" /></template>
              </el-table-column>
              <el-table-column label="名称" width="140">
                <template #default="{ row }"><el-input v-model="row.name" size="small" /></template>
              </el-table-column>
              <el-table-column label="描述" min-width="180">
                <template #default="{ row }"><el-input v-model="row.desc" size="small" /></template>
              </el-table-column>
              <el-table-column label="颜色" width="120">
                <template #default="{ row }"><el-color-picker v-model="row.color" size="small" /></template>
              </el-table-column>
              <el-table-column label="步骤(秒)" min-width="220">
                <template #default="{ row }">
                  <div style="font-size:12px;color:#666">
                    <div v-for="(s, i) in (row.steps || [])" :key="i" style="display:flex;gap:4px;margin-bottom:4px;align-items:center">
                      <el-input v-model="s.label" size="small" style="width:60px" />
                      <el-input-number v-model="s.duration" :min="1" :max="60" size="small" controls-position="right" style="width:90px" />
                      <el-select v-model="s.phase" size="small" style="width:80px">
                        <el-option label="吸气" value="in" />
                        <el-option label="屏息" value="hold" />
                        <el-option label="呼气" value="out" />
                      </el-select>
                      <el-button text type="danger" size="small" @click="row.steps.splice(i,1)">×</el-button>
                    </div>
                    <el-button size="small" text @click="(row.steps ||= []).push({ label: '吸气', duration: 4, phase: 'in' })">+ 步骤</el-button>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button text type="danger" @click="modes.splice($index,1)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="场景课程" name="programs">
            <div style="margin-bottom:12px">
              <el-button type="primary" size="small" @click="addProgram">+ 新增课程</el-button>
              <el-button type="success" size="small" :loading="breathSaving" @click="savePrograms">保存课程配置</el-button>
            </div>
            <el-table :data="programs" border v-loading="breathLoading">
              <el-table-column label="启用" width="70">
                <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
              </el-table-column>
              <el-table-column label="Key" width="100">
                <template #default="{ row }"><el-input v-model="row.key" size="small" /></template>
              </el-table-column>
              <el-table-column label="名称" width="130">
                <template #default="{ row }"><el-input v-model="row.name" size="small" /></template>
              </el-table-column>
              <el-table-column label="描述" min-width="160">
                <template #default="{ row }"><el-input v-model="row.desc" size="small" /></template>
              </el-table-column>
              <el-table-column label="分钟" width="90">
                <template #default="{ row }"><el-input-number v-model="row.totalMin" :min="1" :max="60" size="small" controls-position="right" style="width:80px" /></template>
              </el-table-column>
              <el-table-column label="阶段" min-width="280">
                <template #default="{ row }">
                  <div v-for="(st, i) in (row.stages || [])" :key="i" style="display:flex;gap:4px;margin-bottom:4px;align-items:center;flex-wrap:wrap">
                    <el-input v-model="st.label" size="small" style="width:70px" placeholder="标签" />
                    <el-input-number v-model="st.rounds" :min="1" size="small" controls-position="right" style="width:80px" />
                    <el-select v-model="st.mode" size="small" style="width:100px" placeholder="模式">
                      <el-option v-for="md in modes" :key="md.key" :label="md.key" :value="md.key" />
                    </el-select>
                    <el-input v-model="st.hint" size="small" style="width:140px" placeholder="提示语" />
                    <el-button text type="danger" size="small" @click="row.stages.splice(i,1)">×</el-button>
                  </div>
                  <el-button size="small" text @click="(row.stages ||= []).push({ label: '阶段', rounds: 10, mode: modes[0]?.key || '4-4-4', hint: '' })">+ 阶段</el-button>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button text type="danger" @click="programs.splice($index,1)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>

      <!-- 怪兽 -->
      <el-tab-pane label="情绪怪兽" name="monster">
        <el-row :gutter="12" style="margin-bottom:16px">
          <el-col :span="6"><el-card><div style="text-align:center"><div style="font-size:28px;font-weight:bold">{{ z.summary.total }}</div><div style="color:#999">总数</div></div></el-card></el-col>
          <el-col :span="6"><el-card><div style="text-align:center"><div style="font-size:28px;font-weight:bold;color:#67C23A">{{ z.summary.active }}</div><div style="color:#999">活跃</div></div></el-card></el-col>
          <el-col :span="6"><el-card><div style="text-align:center"><div style="font-size:28px;font-weight:bold;color:#909399">{{ z.summary.archived }}</div><div style="color:#999">已归档</div></div></el-card></el-col>
          <el-col :span="6"><el-card><div style="text-align:center"><div style="font-size:28px;font-weight:bold;color:#E6A23C">{{ z.summary.fedToday }}</div><div style="color:#999">今日喂养</div></div></el-card></el-col>
        </el-row>

        <el-card style="margin-bottom:16px">
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <el-input v-model="z.q" placeholder="名称 / 用户" clearable style="width:180px" @keyup.enter="zSearch" />
            <el-select v-model="z.status" placeholder="状态" clearable style="width:120px" @change="zSearch">
              <el-option label="活跃" value="active" />
              <el-option label="已归档" value="archived" />
            </el-select>
            <el-select v-model="z.emotion" placeholder="情绪" clearable style="width:120px" @change="zSearch">
              <el-option v-for="e in ['焦虑','悲伤','愤怒','恐惧','孤独','其他']" :key="e" :label="e" :value="e" />
            </el-select>
            <el-button type="primary" @click="zSearch">查询</el-button>
          </div>
        </el-card>

        <el-table :data="z.list" border v-loading="z.loading">
          <el-table-column label="名称" width="120" prop="name" />
          <el-table-column label="用户" width="160">
            <template #default="{ row }">{{ userLabel(row.user) }}</template>
          </el-table-column>
          <el-table-column label="情绪" width="80" prop="emotion" />
          <el-table-column label="天数" width="70" prop="totalDays" />
          <el-table-column label="连胜" width="70" prop="streak" />
          <el-table-column label="阶段" width="100" prop="stageLabel" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'archived' ? 'info' : 'success'" size="small">
                {{ row.status === 'archived' ? '已归档' : '活跃' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button text type="warning" @click="toggleMonster(row)">
                {{ row.status === 'archived' ? '恢复' : '归档' }}
              </el-button>
              <el-popconfirm title="确认删除该怪兽？" @confirm="delMonster(row)">
                <template #reference>
                  <el-button text type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          style="margin-top:16px;justify-content:flex-end;display:flex"
          v-model:current-page="z.page"
          :page-size="z.pageSize"
          :total="z.total"
          layout="total, prev, pager, next"
          @current-change="loadMonsters"
        />

        <el-card header="成长阶段规则" style="margin-top:24px">
          <div style="margin-bottom:12px;display:flex;gap:12px;align-items:center">
            <span>目标天数</span>
            <el-input-number v-model="stages.targetDays" :min="1" :max="365" />
            <el-button type="primary" size="small" :loading="stageSaving" @click="saveStages">保存规则</el-button>
          </div>
          <div v-for="(s, i) in stages.stages" :key="i" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
            <el-input v-model="s.label" placeholder="阶段名" style="width:140px" />
            <el-input-number v-model="s.maxDays" :min="0" :controls="true" placeholder="上限天数" />
            <span style="color:#999;font-size:12px">null=最后阶段无上限</span>
            <el-button text type="danger" @click="stages.stages.splice(i,1)">删除</el-button>
          </div>
          <el-button size="small" @click="stages.stages.push({ label: '新阶段', maxDays: 0, key: 'stage_' + Date.now() })">+ 阶段</el-button>
          <div style="margin-top:8px;color:#999;font-size:12px">最后一阶段可将 maxDays 清空（保存时转为 null）表示无上限。</div>
        </el-card>
      </el-tab-pane>

      <!-- 捏捏乐 -->
      <el-tab-pane label="解压捏捏乐" name="squeeze">
        <div style="margin-bottom:12px">
          <el-button type="primary" size="small" @click="counts.push({ key: 50, label: '50 个', desc: '', enabled: true })">+ 档位</el-button>
          <el-button type="success" size="small" :loading="squeezeSaving" @click="saveCounts">保存球数配置</el-button>
        </div>
        <el-table :data="counts" border v-loading="squeezeLoading">
          <el-table-column label="启用" width="70">
            <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
          </el-table-column>
          <el-table-column label="数量" width="120">
            <template #default="{ row }"><el-input-number v-model="row.key" :min="10" :max="300" size="small" /></template>
          </el-table-column>
          <el-table-column label="显示名" width="160">
            <template #default="{ row }"><el-input v-model="row.label" size="small" /></template>
          </el-table-column>
          <el-table-column label="描述" min-width="200">
            <template #default="{ row }"><el-input v-model="row.desc" size="small" /></template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ $index }">
              <el-button text :disabled="$index===0" @click="moveCount($index,-1)">↑</el-button>
              <el-button text :disabled="$index===counts.length-1" @click="moveCount($index,1)">↓</el-button>
              <el-button text type="danger" @click="counts.splice($index,1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index.js';
import { renderMandala } from '../utils/mandalaRender.js';

const tab = ref('mandala');
const breathSub = ref('modes');

const MOOD_MAP = { happy: '快乐', calm: '平静', sad: '悲伤', angry: '愤怒', anxious: '焦虑' };
function moodLabel(m) { return MOOD_MAP[m] || m || '—'; }
function userLabel(u) {
  if (!u) return '—';
  const name = u.name || u.username || ('#' + u.id);
  return u.phone ? `${name}（${u.phone}）` : name;
}
function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  const p = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

// ── 曼达拉 ──
const m = reactive({ list: [], total: 0, page: 1, pageSize: 20, loading: false, q: '', mood: '' });
const previewCanvas = ref(null);
const preview = reactive({
  visible: false,
  loading: false,
  title: '查看曼达拉',
  meta: null,
  drawingData: null,
  error: '',
});
function mSearch() { m.page = 1; loadMandalas(); }
async function loadMandalas() {
  m.loading = true;
  try {
    const params = { page: m.page, limit: m.pageSize };
    if (m.q) params.q = m.q.trim();
    if (m.mood) params.mood = m.mood;
    const res = await api.get('/relax/admin/mandalas', { params });
    m.list = res.list || [];
    m.total = res.total || 0;
  } catch { ElMessage.error('加载曼达拉失败'); }
  finally { m.loading = false; }
}
async function viewMandala(row) {
  preview.visible = true;
  preview.loading = true;
  preview.error = '';
  preview.drawingData = null;
  preview.meta = {
    user: userLabel(row.user),
    time: fmt(row.createdAt),
    mood: moodLabel(row.mood),
    symmetry: row.symmetry ?? '—',
  };
  preview.title = `曼达拉 #${row.id}`;
  try {
    const work = await api.get(`/relax/admin/mandalas/${row.id}`);
    preview.drawingData = work.drawingData;
    preview.meta = {
      user: userLabel(work.user),
      time: fmt(work.createdAt),
      mood: moodLabel(work.mood),
      symmetry: work.symmetry ?? '—',
    };
    await nextTick();
    paintPreview();
  } catch (e) {
    preview.error = e?.error || '加载作品失败';
  } finally {
    preview.loading = false;
  }
}
function paintPreview() {
  if (!preview.drawingData || !previewCanvas.value) return;
  const ok = renderMandala(previewCanvas.value, preview.drawingData, 480);
  if (!ok) preview.error = '作品数据无法解析或为空';
}
async function delMandala(row) {
  try {
    await api.delete(`/relax/admin/mandalas/${row.id}`);
    ElMessage.success('已删除');
    loadMandalas();
  } catch (e) { ElMessage.error(e?.error || '删除失败'); }
}

// ── 呼吸 ──
const modes = ref([]);
const programs = ref([]);
const breathLoading = ref(false);
const breathSaving = ref(false);

async function loadBreathing() {
  breathLoading.value = true;
  try {
    const [mRes, pRes] = await Promise.all([
      api.get('/relax/admin/config/breathing_modes'),
      api.get('/relax/admin/config/breathing_programs'),
    ]);
    modes.value = (mRes.value || []).map(x => ({ enabled: true, steps: [], ...x }));
    programs.value = (pRes.value || []).map(x => ({ enabled: true, stages: [], ...x }));
  } catch { ElMessage.error('加载呼吸配置失败'); }
  finally { breathLoading.value = false; }
}
function addMode() {
  modes.value.push({
    key: 'new-mode', name: '新模式', desc: '', color: '#4A7A9E', enabled: true, icon: 'activity',
    steps: [{ label: '吸气', duration: 4, phase: 'in' }, { label: '呼气', duration: 4, phase: 'out' }],
  });
}
function addProgram() {
  programs.value.push({
    key: 'new_program', name: '新课程', desc: '', totalMin: 8, color: '#4A7A9E', enabled: true, icon: 'moon', emoji: '🌬️',
    stages: [{ label: '开始', rounds: 10, mode: modes.value[0]?.key || '4-4-4', hint: '' }],
  });
}
async function saveModes() {
  breathSaving.value = true;
  try {
    await api.put('/relax/admin/config/breathing_modes', { value: modes.value });
    ElMessage.success('模式已保存');
  } catch (e) { ElMessage.error(e?.error || '保存失败'); }
  finally { breathSaving.value = false; }
}
async function savePrograms() {
  breathSaving.value = true;
  try {
    await api.put('/relax/admin/config/breathing_programs', { value: programs.value });
    ElMessage.success('课程已保存');
  } catch (e) { ElMessage.error(e?.error || '保存失败'); }
  finally { breathSaving.value = false; }
}

// ── 怪兽 ──
const z = reactive({
  list: [], total: 0, page: 1, pageSize: 20, loading: false,
  q: '', status: '', emotion: '',
  summary: { total: 0, active: 0, archived: 0, fedToday: 0 },
});
const stages = reactive({ targetDays: 30, stages: [] });
const stageSaving = ref(false);

function zSearch() { z.page = 1; loadMonsters(); }
async function loadMonsters() {
  z.loading = true;
  try {
    const params = { page: z.page, limit: z.pageSize };
    if (z.q) params.q = z.q.trim();
    if (z.status) params.status = z.status;
    if (z.emotion) params.emotion = z.emotion;
    const res = await api.get('/relax/admin/monsters', { params });
    z.list = res.list || [];
    z.total = res.total || 0;
    z.summary = res.summary || z.summary;
  } catch { ElMessage.error('加载怪兽失败'); }
  finally { z.loading = false; }
}
async function loadStages() {
  try {
    const res = await api.get('/relax/admin/config/monster_stages');
    const v = res.value || { targetDays: 30, stages: [] };
    stages.targetDays = v.targetDays || 30;
    stages.stages = (v.stages || []).map(s => ({ ...s }));
  } catch { ElMessage.error('加载阶段规则失败'); }
}
async function toggleMonster(row) {
  const status = row.status === 'archived' ? 'active' : 'archived';
  try {
    await api.patch(`/relax/admin/monsters/${row.id}`, { status });
    ElMessage.success(status === 'archived' ? '已归档' : '已恢复');
    loadMonsters();
  } catch (e) { ElMessage.error(e?.error || '操作失败'); }
}
async function delMonster(row) {
  try {
    await api.delete(`/relax/admin/monsters/${row.id}`);
    ElMessage.success('已删除');
    loadMonsters();
  } catch (e) { ElMessage.error(e?.error || '删除失败'); }
}
async function saveStages() {
  stageSaving.value = true;
  try {
    const payload = {
      targetDays: stages.targetDays,
      stages: stages.stages.map(s => ({
        ...s,
        maxDays: (s.maxDays === '' || s.maxDays === undefined) ? null : s.maxDays,
      })),
    };
    await api.put('/relax/admin/config/monster_stages', { value: payload });
    ElMessage.success('阶段规则已保存');
  } catch (e) { ElMessage.error(e?.error || '保存失败'); }
  finally { stageSaving.value = false; }
}

// ── 捏捏乐 ──
const counts = ref([]);
const squeezeLoading = ref(false);
const squeezeSaving = ref(false);

async function loadSqueeze() {
  squeezeLoading.value = true;
  try {
    const res = await api.get('/relax/admin/config/squeeze_counts');
    counts.value = (res.value || []).map(c => ({ enabled: true, ...c, key: Number(c.key) }));
  } catch { ElMessage.error('加载球数配置失败'); }
  finally { squeezeLoading.value = false; }
}
function moveCount(i, dir) {
  const arr = counts.value;
  const j = i + dir;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
async function saveCounts() {
  squeezeSaving.value = true;
  try {
    await api.put('/relax/admin/config/squeeze_counts', {
      value: counts.value.map(c => ({
        key: Number(c.key),
        label: c.label || `${c.key} 个`,
        desc: c.desc || '',
        enabled: c.enabled !== false,
      })),
    });
    ElMessage.success('球数配置已保存');
  } catch (e) { ElMessage.error(e?.error || '保存失败'); }
  finally { squeezeSaving.value = false; }
}

function onTab(name) {
  if (name === 'mandala') loadMandalas();
  if (name === 'breathing') loadBreathing();
  if (name === 'monster') { loadMonsters(); loadStages(); }
  if (name === 'squeeze') loadSqueeze();
}

onMounted(() => loadMandalas());
</script>
