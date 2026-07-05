<template>
  <view class="page">
    <!-- 套餐列表 -->
    <view class="section-title">套餐列表</view>
    <view class="pkg-row" v-for="pkg in packages" :key="pkg.id">
      <view class="pkg-info">
        <text class="pkg-name">{{ pkg.name }}</text>
        <text class="pkg-sub">
          买{{ pkg.sessions }}次送{{ pkg.bonusSessions }}次 · 共{{ pkg.sessions + pkg.bonusSessions }}次
        </text>
        <text class="pkg-desc" v-if="pkg.description">{{ pkg.description }}</text>
      </view>
      <view class="pkg-actions">
        <u-switch :modelValue="pkg.isActive === 1" @change="toggleActive(pkg)" size="20" />
        <u-button size="mini" type="primary" plain @click="openEdit(pkg)">编辑</u-button>
        <u-button size="mini" type="error" plain @click="deletePkg(pkg)">删除</u-button>
      </view>
    </view>
    <u-button type="primary" block style="margin:24rpx 0" @click="openEdit(null)">
      ＋ 新增套餐
    </u-button>

    <!-- 分割线 -->
    <view class="section-divider" />

    <!-- 咨询师折扣率设置 -->
    <view class="section-title">咨询师折扣率</view>
    <view class="discount-row" v-for="c in consultants" :key="c.id">
      <view class="consultant-info">
        <text class="c-name">{{ c.name }}</text>
        <text class="c-price">¥{{ (c.price / 100).toFixed(2) }}/次</text>
      </view>
      <view class="discount-input-wrap">
        <input
          class="discount-input"
          type="digit"
          :value="discountInputs[c.id]"
          placeholder="1.0"
          @input="discountInputs[c.id] = $event.detail.value"
        />
        <text class="discount-hint">（0.1 ~ 1.0）</text>
        <u-button size="mini" type="primary" @click="saveDiscount(c)">保存</u-button>
      </view>
    </view>

    <!-- 编辑弹窗 -->
    <u-popup :show="showModal" round="12" @close="showModal = false">
      <view class="modal-body">
        <text class="modal-title">{{ form.id ? '编辑套餐' : '新增套餐' }}</text>
        <u-form :model="form" ref="formRef" label-width="160rpx">
          <u-form-item label="套餐名称" required>
            <u-input v-model="form.name" placeholder="如：十次套餐" />
          </u-form-item>
          <u-form-item label="购买次数" required>
            <u-input v-model="form.sessions" type="number" placeholder="如：10" />
          </u-form-item>
          <u-form-item label="赠送次数">
            <u-input v-model="form.bonusSessions" type="number" placeholder="如：1" />
          </u-form-item>
          <u-form-item label="套餐说明">
            <u-input v-model="form.description" placeholder="可选" />
          </u-form-item>
          <u-form-item label="排序权重">
            <u-input v-model="form.sortOrder" type="number" placeholder="数字越小越靠前" />
          </u-form-item>
        </u-form>
        <view class="modal-footer">
          <u-button @click="showModal = false">取消</u-button>
          <u-button type="primary" :loading="saving" @click="savePkg">保存</u-button>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { packageApi, consultantApi } from '../../api/index';

const packages      = ref([]);
const consultants   = ref([]);
const discountInputs = reactive({});  // { consultantId: '0.8' }
const showModal     = ref(false);
const saving        = ref(false);

const defaultForm = () => ({
  id: null, name: '', sessions: '', bonusSessions: '0',
  description: '', sortOrder: '0',
});
const form = reactive(defaultForm());

onMounted(async () => {
  await Promise.all([loadPackages(), loadConsultants()]);
});

async function loadPackages() {
  try { packages.value = await packageApi.list(); } catch {}
}

async function loadConsultants() {
  try {
    const list = await consultantApi.list();
    consultants.value = list;
    list.forEach(c => { discountInputs[c.id] = String(c.discountRate ?? 1.0); });
  } catch {}
}

function openEdit(pkg) {
  Object.assign(form, pkg
    ? { ...pkg, sessions: String(pkg.sessions), bonusSessions: String(pkg.bonusSessions), sortOrder: String(pkg.sortOrder) }
    : defaultForm()
  );
  showModal.value = true;
}

async function savePkg() {
  if (!form.name || !form.sessions) {
    return uni.showToast({ title: '请填写名称和次数', icon: 'none' });
  }
  saving.value = true;
  try {
    const data = {
      name: form.name, sessions: Number(form.sessions),
      bonusSessions: Number(form.bonusSessions || 0),
      description: form.description, sortOrder: Number(form.sortOrder || 0),
    };
    if (form.id) {
      await packageApi.update(form.id, data);
    } else {
      await packageApi.create(data);
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    showModal.value = false;
    await loadPackages();
  } catch (e) {
    uni.showToast({ title: e?.error || '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

async function toggleActive(pkg) {
  try {
    await packageApi.update(pkg.id, { isActive: pkg.isActive === 1 ? 0 : 1 });
    await loadPackages();
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }); }
}

async function deletePkg(pkg) {
  uni.showModal({
    title: '确认删除',
    content: `删除「${pkg.name}」？已持有的套餐不受影响。`,
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        await packageApi.remove(pkg.id);
        await loadPackages();
        uni.showToast({ title: '已删除', icon: 'success' });
      } catch { uni.showToast({ title: '操作失败', icon: 'none' }); }
    },
  });
}

async function saveDiscount(c) {
  const val = Number(discountInputs[c.id]);
  if (isNaN(val) || val < 0.1 || val > 1.0) {
    return uni.showToast({ title: '折扣率需在 0.1 ~ 1.0 之间', icon: 'none' });
  }
  try {
    await packageApi.setDiscount(c.id, val);
    uni.showToast({ title: '已更新', icon: 'success' });
    c.discountRate = val;
  } catch (e) {
    uni.showToast({ title: e?.error || '更新失败', icon: 'none' });
  }
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; padding: 24rpx; padding-bottom: 80rpx; }

.section-title {
  font-size: 28rpx; font-weight: 700; color: #4A5A55;
  padding: 16rpx 4rpx 12rpx;
}
.section-divider { height: 16rpx; }

.pkg-row {
  background: #fff; border-radius: 16rpx; padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 16rpx;
  .pkg-info { flex: 1; }
  .pkg-name { font-size: 28rpx; font-weight: 600; color: #1C2A27; display: block; }
  .pkg-sub  { font-size: 22rpx; color: #4A8A7A; display: block; margin-top: 6rpx; }
  .pkg-desc { font-size: 20rpx; color: #8A9E97; display: block; margin-top: 4rpx; }
  .pkg-actions { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
}

.discount-row {
  background: #fff; border-radius: 16rpx; padding: 20rpx 28rpx;
  margin-bottom: 12rpx;
  display: flex; justify-content: space-between; align-items: center;
  .consultant-info { flex: 1; }
  .c-name  { font-size: 28rpx; color: #1C2A27; display: block; }
  .c-price { font-size: 22rpx; color: #8A9E97; }
  .discount-input-wrap {
    display: flex; align-items: center; gap: 8rpx;
    .discount-input {
      width: 100rpx; border: 1rpx solid #EEF2F0; border-radius: 8rpx;
      padding: 8rpx 12rpx; font-size: 26rpx; text-align: center;
    }
    .discount-hint { font-size: 18rpx; color: #B0B8B5; }
  }
}

.modal-body {
  padding: 40rpx 32rpx 32rpx;
  .modal-title { font-size: 32rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 32rpx; }
  .modal-footer { display: flex; gap: 16rpx; margin-top: 32rpx; }
}
</style>
