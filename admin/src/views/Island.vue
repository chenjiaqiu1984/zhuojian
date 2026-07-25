<template>
  <div class="island-admin" v-loading="loading">
    <div class="toolbar">
      <h2>心镜岛点位</h2>
      <div class="toolbar-actions">
        <el-tag v-if="dirty" type="warning">有未保存修改</el-tag>
        <el-button @click="resetDefaults">恢复默认</el-button>
        <el-button @click="reload">重新加载</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </div>

    <div class="workspace">
      <!-- 左侧：岛图拖拽 -->
      <div class="map-panel">
        <div
          ref="stageRef"
          class="map-stage"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
        >
          <img class="map-img" :src="mapSrc" alt="心镜岛" draggable="false" @load="onImgLoad" />
          <div
            v-for="spot in spots"
            :key="'hit-' + spot.id"
            class="hit-ring"
            :class="{
              'hit-ring--active': selectedId === spot.id,
              'hit-ring--off': spot.enabled === false,
            }"
            :style="hitRingStyle(spot)"
          />
          <div
            v-for="spot in spots"
            :key="spot.id"
            class="spot"
            :class="{
              'spot--active': selectedId === spot.id,
              'spot--off': spot.enabled === false,
            }"
            :style="spotStyle(spot)"
            @pointerdown.stop="onPointerDown($event, spot)"
            @click.stop="select(spot.id)"
          >
            <div class="spot-dot" />
            <div class="spot-label" :class="'spot-label--' + (spot.labelSide || 'bottom')">
              {{ spot.name }}
            </div>
          </div>
        </div>
        <p class="hint">拖拽圆点调整位置；半透明圈为热区范围（hit）</p>
      </div>

      <!-- 右侧：列表 + 表单 -->
      <div class="side-panel">
        <el-card shadow="never" class="list-card">
          <template #header>
            <span>点位列表（排序）</span>
          </template>
          <div
            v-for="(spot, idx) in spots"
            :key="spot.id"
            class="list-row"
            :class="{ 'list-row--active': selectedId === spot.id }"
            @click="select(spot.id)"
          >
            <el-switch v-model="spot.enabled" size="small" @click.stop @change="markDirty" />
            <span class="list-name">{{ spot.name }}</span>
            <span class="list-id">{{ spot.id }}</span>
            <el-button-group>
              <el-button size="small" :disabled="idx === 0" @click.stop="move(idx, -1)">上</el-button>
              <el-button size="small" :disabled="idx === spots.length - 1" @click.stop="move(idx, 1)">下</el-button>
            </el-button-group>
          </div>
        </el-card>

        <el-card v-if="selected" shadow="never" class="form-card">
          <template #header>
            <span>编辑：{{ selected.id }}</span>
          </template>
          <el-form label-width="72px" size="small">
            <el-form-item label="名称">
              <el-input v-model="selected.name" @input="markDirty" />
            </el-form-item>
            <el-form-item label="提示">
              <el-input v-model="selected.tip" @input="markDirty" />
            </el-form-item>
            <el-form-item label="地点">
              <el-input v-model="selected.place" @input="markDirty" />
            </el-form-item>
            <el-form-item label="介绍">
              <el-input v-model="selected.desc" type="textarea" :rows="3" @input="markDirty" />
            </el-form-item>
            <el-form-item label="按钮">
              <el-input v-model="selected.cta" @input="markDirty" />
            </el-form-item>
            <el-form-item label="跳转">
              <el-select
                v-model="selected.url"
                filterable
                allow-create
                default-first-option
                style="width:100%"
                @change="markDirty"
              >
                <el-option v-for="u in urlOptions" :key="u.value" :label="u.label" :value="u.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="标签侧">
              <el-radio-group v-model="selected.labelSide" @change="markDirty">
                <el-radio-button label="top">上</el-radio-button>
                <el-radio-button label="bottom">下</el-radio-button>
                <el-radio-button label="left">左</el-radio-button>
                <el-radio-button label="right">右</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="坐标">
              <div class="coord-row">
                <span>X</span>
                <el-input-number v-model="selected.cx" :min="0" :max="100" :step="0.5" @change="markDirty" />
                <span>Y</span>
                <el-input-number v-model="selected.cy" :min="0" :max="100" :step="0.5" @change="markDirty" />
              </div>
            </el-form-item>
            <el-form-item label="热区">
              <el-slider v-model="selected.hit" :min="3" :max="25" :step="0.5" show-input @change="markDirty" />
            </el-form-item>
            <el-form-item label="启用">
              <el-switch v-model="selected.enabled" @change="markDirty" />
            </el-form-item>
          </el-form>
        </el-card>
        <el-empty v-else description="点击左侧点位或列表进行编辑" :image-size="64" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const mapSrc = '/static/island/island-mist.jpg';

const urlOptions = [
  { label: '正念呼吸', value: '/pages/breathing/select' },
  { label: '预约咨询师', value: '/pages/consultants/index' },
  { label: '学习培训', value: '/pages/learning/index' },
  { label: '咨询工具', value: '/pages/homework/index' },
  { label: '心理测评', value: '/pages/assessment/index' },
  { label: '咨询活动', value: '/pages/activity/index' },
  { label: '心理图卡', value: '/pages/ohcard/index' },
  { label: '曼达拉', value: '/pages/mandala/index' },
  { label: '情绪怪兽', value: '/pages/monster/index' },
  { label: '个人中心', value: '/pages/profile/index' },
  { label: '解压捏捏乐', value: '/pages/squeeze/index' },
];

const loading = ref(false);
const saving = ref(false);
const dirty = ref(false);
const spots = ref([]);
const defaults = ref([]);
const selectedId = ref('');
const stageRef = ref(null);

const drag = ref({ active: false, id: '', startX: 0, startY: 0, cx: 0, cy: 0 });

const selected = computed(() => spots.value.find(s => s.id === selectedId.value) || null);

function markDirty() {
  dirty.value = true;
  reindexSort();
}

function reindexSort() {
  spots.value.forEach((s, i) => { s.sort = (i + 1) * 10; });
}

function select(id) {
  selectedId.value = id;
}

function spotStyle(spot) {
  return {
    left: `${spot.cx}%`,
    top: `${spot.cy}%`,
  };
}

function hitRingStyle(spot) {
  const d = (Number(spot.hit) || 10) * 2;
  return {
    left: `${spot.cx}%`,
    top: `${spot.cy}%`,
    width: `${d}%`,
  };
}

function onImgLoad() {
  // no-op; layout uses % of stage
}

function stageRect() {
  return stageRef.value?.getBoundingClientRect?.() || null;
}

function onPointerDown(e, spot) {
  select(spot.id);
  const rect = stageRect();
  if (!rect) return;
  drag.value = {
    active: true,
    id: spot.id,
    startX: e.clientX,
    startY: e.clientY,
    cx: spot.cx,
    cy: spot.cy,
  };
  e.currentTarget?.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!drag.value.active) return;
  const rect = stageRect();
  if (!rect || !rect.width || !rect.height) return;
  const dx = ((e.clientX - drag.value.startX) / rect.width) * 100;
  const dy = ((e.clientY - drag.value.startY) / rect.height) * 100;
  const spot = spots.value.find(s => s.id === drag.value.id);
  if (!spot) return;
  spot.cx = Math.min(100, Math.max(0, Math.round((drag.value.cx + dx) * 10) / 10));
  spot.cy = Math.min(100, Math.max(0, Math.round((drag.value.cy + dy) * 10) / 10));
  dirty.value = true;
}

function onPointerUp() {
  if (drag.value.active) dirty.value = true;
  drag.value.active = false;
}

function move(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= spots.value.length) return;
  const arr = spots.value.slice();
  const t = arr[idx];
  arr[idx] = arr[j];
  arr[j] = t;
  spots.value = arr;
  markDirty();
}

async function load() {
  loading.value = true;
  try {
    const data = await api.get('/island/admin');
    spots.value = (data.spots || []).map(s => ({ ...s }));
    defaults.value = data.defaults || [];
    dirty.value = false;
    if (!selectedId.value && spots.value[0]) selectedId.value = spots.value[0].id;
  } catch (e) {
    ElMessage.error(e?.error || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function reload() {
  if (dirty.value) {
    try {
      await ElMessageBox.confirm('有未保存修改，确定重新加载？', '提示');
    } catch {
      return;
    }
  }
  await load();
}

async function resetDefaults() {
  try {
    await ElMessageBox.confirm('将用默认点位覆盖当前编辑（需再点保存才会写入服务器）', '恢复默认');
  } catch {
    return;
  }
  const src = defaults.value.length ? defaults.value : [];
  if (!src.length) {
    ElMessage.warning('无默认数据');
    return;
  }
  spots.value = JSON.parse(JSON.stringify(src));
  reindexSort();
  dirty.value = true;
  selectedId.value = spots.value[0]?.id || '';
}

async function save() {
  saving.value = true;
  try {
    reindexSort();
    const data = await api.put('/island/admin', { spots: spots.value });
    spots.value = (data.spots || spots.value).map(s => ({ ...s }));
    dirty.value = false;
    ElMessage.success('已保存，前端刷新后生效');
  } catch (e) {
    ElMessage.error(e?.error || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await load();
  await nextTick();
});
</script>

<style scoped>
.island-admin { max-width: 1400px; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar h2 { margin: 0; font-size: 20px; }
.toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.workspace {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) 380px;
  gap: 16px;
  align-items: start;
}
@media (max-width: 1100px) {
  .workspace { grid-template-columns: 1fr; }
}

.map-panel {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #ebeef5;
}
.map-stage {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  aspect-ratio: 768 / 1376;
  background: #d7e8ef;
  overflow: hidden;
  border-radius: 8px;
  user-select: none;
  touch-action: none;
}
.map-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}
.hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.spot {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  z-index: 3;
  cursor: grab;
}
.spot:active { cursor: grabbing; }
.spot--active { z-index: 5; }
.spot--off { opacity: 0.45; }

.hit-ring {
  position: absolute;
  z-index: 1;
  transform: translate(-50%, -50%);
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(74, 138, 122, 0.16);
  border: 1px dashed rgba(74, 138, 122, 0.5);
  pointer-events: none;
}
.hit-ring--active {
  background: rgba(74, 138, 122, 0.28);
  border-color: #4a8a7a;
}
.hit-ring--off { opacity: 0.35; }

.spot-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #4a8a7a;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.spot--active .spot-dot {
  background: #4a8a7a;
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(74, 138, 122, 0.35);
}
.spot-label {
  position: absolute;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  color: #1c2a27;
  background: rgba(255,255,255,.75);
  border: 1px solid rgba(255,255,255,.6);
  border-radius: 999px;
  padding: 2px 8px;
  pointer-events: none;
}
.spot-label--bottom { top: 12px; left: 50%; transform: translateX(-50%); }
.spot-label--top { bottom: 12px; left: 50%; transform: translateX(-50%); }
.spot-label--left { right: 12px; top: 50%; transform: translateY(-50%); }
.spot-label--right { left: 12px; top: 50%; transform: translateY(-50%); }

.side-panel { display: flex; flex-direction: column; gap: 12px; }
.list-card :deep(.el-card__body) { padding: 8px; max-height: 280px; overflow: auto; }
.list-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
}
.list-row:hover { background: #f5f7fa; }
.list-row--active { background: #ecf5ff; }
.list-name { flex: 1; font-size: 13px; font-weight: 600; }
.list-id { font-size: 11px; color: #909399; margin-right: 4px; }
.coord-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
