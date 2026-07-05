<template>
  <view class="page">
    <!-- 顶部操作栏 -->
    <view class="toolbar">
      <u-button type="primary" size="small" @click="openEdit(null)">＋ 新建优惠券</u-button>
    </view>

    <!-- 优惠券列表 -->
    <view class="coupon-row" v-for="c in coupons" :key="c.id">
      <view class="coupon-meta">
        <text class="coupon-name">{{ c.name }}</text>
        <text class="coupon-type-tag" :class="c.type">{{ typeLabel[c.type] }}</text>
      </view>
      <text class="coupon-value-text">{{ valueText(c) }}</text>
      <text class="coupon-sub">
        已发 {{ c.usedCount }} 张
        <template v-if="c.totalLimit">/ 共 {{ c.totalLimit }} 张</template>
        <template v-if="c.expireAt"> · 截止 {{ fmtDate(c.expireAt) }}</template>
        <template v-else> · 长期有效</template>
      </text>
      <view class="coupon-actions">
        <u-switch :modelValue="c.isActive === 1" @change="toggleActive(c)" size="18" />
        <u-button size="mini" type="primary" plain @click="openSend(c)">发送</u-button>
        <u-button size="mini" plain @click="openUsers(c)">持券人</u-button>
        <u-button size="mini" plain @click="openEdit(c)">编辑</u-button>
      </view>
    </view>

    <!-- 编辑/新建弹窗 -->
    <u-popup :show="editModal" round="12" @close="editModal = false">
      <view class="modal-body">
        <text class="modal-title">{{ form.id ? '编辑优惠券' : '新建优惠券' }}</text>

        <u-form :model="form" label-width="160rpx">
          <u-form-item label="券码" required>
            <u-input v-model="form.code" placeholder="唯一标识，如 WELCOME_DISCOUNT" :disabled="!!form.id" />
          </u-form-item>
          <u-form-item label="名称" required>
            <u-input v-model="form.name" placeholder="展示给用户的名称" />
          </u-form-item>
          <u-form-item label="类型" required>
            <u-radio-group v-model="form.type">
              <u-radio label="打折券" name="discount" />
              <u-radio label="直减券" name="direct" />
              <u-radio label="满减券" name="threshold" />
              <u-radio label="活动券" name="activity" />
            </u-radio-group>
          </u-form-item>
          <u-form-item label="折扣率/金额">
            <u-input v-model="form.value" type="digit"
              :placeholder="form.type === 'discount' ? '0.8 = 八折' : '减免金额（分）'" />
          </u-form-item>
          <u-form-item label="满减门槛" v-if="form.type === 'threshold'">
            <u-input v-model="form.threshold" type="number" placeholder="门槛（分），如 5000" />
          </u-form-item>
          <u-form-item label="适用范围">
            <u-radio-group v-model="form.scope">
              <u-radio label="咨询" name="consultation" />
              <u-radio label="沙龙" name="salon" />
              <u-radio label="通用" name="all" />
            </u-radio-group>
          </u-form-item>
          <u-form-item label="每人限领">
            <u-input v-model="form.perUserLimit" type="number" placeholder="1" />
          </u-form-item>
          <u-form-item label="发行总量">
            <u-input v-model="form.totalLimit" type="number" placeholder="不填=不限量" />
          </u-form-item>
          <u-form-item label="截止日期">
            <u-input v-model="form.expireAt" placeholder="YYYY-MM-DD，不填=永久" />
          </u-form-item>
          <u-form-item label="说明">
            <u-input v-model="form.description" placeholder="可选" />
          </u-form-item>
          <u-form-item label="用户可自领">
            <u-switch v-model="form.isPublicBool" />
          </u-form-item>
        </u-form>

        <view class="modal-footer">
          <u-button @click="editModal = false">取消</u-button>
          <u-button type="primary" :loading="saving" @click="saveCoupon">保存</u-button>
        </view>
      </view>
    </u-popup>

    <!-- 发送弹窗 -->
    <u-popup :show="sendModal" round="12" @close="sendModal = false">
      <view class="modal-body">
        <text class="modal-title">发送「{{ sendTarget?.name }}」</text>
        <u-radio-group v-model="sendMode" style="margin-bottom:24rpx">
          <u-radio label="发给全体用户" name="all" />
          <u-radio label="指定用户" name="specific" />
        </u-radio-group>
        <view v-if="sendMode === 'specific'">
          <u-input v-model="sendUserIds" placeholder="用户ID，多个用逗号分隔，如 1,2,3" />
        </view>
        <view class="modal-footer">
          <u-button @click="sendModal = false">取消</u-button>
          <u-button type="primary" :loading="sending" @click="doSend">发送</u-button>
        </view>
      </view>
    </u-popup>

    <!-- 持券人列表弹窗 -->
    <u-popup :show="usersModal" round="12" @close="usersModal = false">
      <view class="modal-body">
        <text class="modal-title">持券人：{{ usersTarget?.name }}</text>
        <view class="user-row" v-for="uc in couponUsers" :key="uc.id">
          <text class="user-name">{{ uc.user.name || uc.user.phone || uc.user.email || `ID:${uc.user.id}` }}</text>
          <text :class="['user-status', uc.status]">{{ statusLabel[uc.status] }}</text>
          <text class="user-date" v-if="uc.usedAt">{{ fmtDate(uc.usedAt) }}</text>
        </view>
        <u-empty v-if="!couponUsers.length" text="暂无持券人" mode="data" />
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { couponApi } from '../../api/index';

const coupons     = ref([]);
const couponUsers = ref([]);
const editModal   = ref(false);
const sendModal   = ref(false);
const usersModal  = ref(false);
const saving      = ref(false);
const sending     = ref(false);
const sendTarget  = ref(null);
const usersTarget = ref(null);
const sendMode    = ref('all');
const sendUserIds = ref('');

const typeLabel  = { discount: '打折', direct: '直减', threshold: '满减', activity: '活动' };
const statusLabel = { available: '可用', used: '已用', expired: '已过期' };

const defaultForm = () => ({
  id: null, code: '', name: '', description: '',
  type: 'discount', value: '', threshold: '0',
  scope: 'consultation', isPublicBool: false,
  perUserLimit: '1', totalLimit: '', expireAt: '',
});
const form = reactive(defaultForm());

function valueText(c) {
  if (c.type === 'discount')   return `${Math.round(c.value * 10)}折`;
  if (c.type === 'direct')     return `-¥${(c.value / 100).toFixed(0)}`;
  if (c.type === 'threshold')  return `满¥${(c.threshold / 100).toFixed(0)}减¥${(c.value / 100).toFixed(0)}`;
  return '活动参与';
}

function fmtDate(str) {
  const d = new Date(str);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

onMounted(async () => {
  try { coupons.value = await couponApi.list(); } catch {}
});

function openEdit(c) {
  Object.assign(form, c ? {
    id: c.id, code: c.code, name: c.name, description: c.description || '',
    type: c.type, value: String(c.value), threshold: String(c.threshold),
    scope: c.scope, isPublicBool: c.isPublic === 1,
    perUserLimit: String(c.perUserLimit),
    totalLimit: c.totalLimit ? String(c.totalLimit) : '',
    expireAt: c.expireAt ? fmtDate(c.expireAt) : '',
  } : defaultForm());
  editModal.value = true;
}

async function saveCoupon() {
  if (!form.code || !form.name || !form.type)
    return uni.showToast({ title: '请填写必填项', icon: 'none' });
  saving.value = true;
  try {
    const data = {
      code: form.code, name: form.name, description: form.description,
      type: form.type, value: Number(form.value || 0),
      threshold: Number(form.threshold || 0),
      scope: form.scope, isPublic: form.isPublicBool ? 1 : 0,
      perUserLimit: Number(form.perUserLimit || 1),
      totalLimit: form.totalLimit ? Number(form.totalLimit) : null,
      expireAt: form.expireAt || null,
    };
    if (form.id) await couponApi.update(form.id, data);
    else         await couponApi.create(data);
    uni.showToast({ title: '保存成功', icon: 'success' });
    editModal.value = false;
    coupons.value = await couponApi.list();
  } catch (e) {
    uni.showToast({ title: e?.error || '保存失败', icon: 'none' });
  } finally { saving.value = false; }
}

async function toggleActive(c) {
  try {
    await couponApi.update(c.id, { isActive: c.isActive === 1 ? 0 : 1 });
    coupons.value = await couponApi.list();
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }); }
}

function openSend(c) {
  sendTarget.value = c;
  sendMode.value   = 'all';
  sendUserIds.value = '';
  sendModal.value  = true;
}

async function doSend() {
  sending.value = true;
  try {
    const targets = sendMode.value === 'all'
      ? 'all'
      : sendUserIds.value.split(',').map(s => Number(s.trim())).filter(Boolean);
    const res = await couponApi.send(sendTarget.value.id, { targets });
    uni.showToast({ title: `已发送 ${res.granted} 人`, icon: 'success' });
    sendModal.value = false;
  } catch (e) {
    uni.showToast({ title: e?.error || '发送失败', icon: 'none' });
  } finally { sending.value = false; }
}

async function openUsers(c) {
  usersTarget.value = c;
  usersModal.value  = true;
  try { couponUsers.value = await couponApi.users(c.id); } catch {}
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; padding: 16rpx 24rpx 80rpx; }

.toolbar { display: flex; justify-content: flex-end; margin-bottom: 20rpx; }

.coupon-row {
  background: #fff; border-radius: 16rpx; padding: 24rpx 28rpx;
  margin-bottom: 16rpx;

  .coupon-meta { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
  .coupon-name { font-size: 28rpx; font-weight: 600; color: #1C2A27; }
  .coupon-type-tag {
    font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx;
    &.discount  { background: #E8F5F1; color: #4A8A7A; }
    &.direct    { background: #FFF3E0; color: #C8821A; }
    &.threshold { background: #FFF0F0; color: #E07050; }
    &.activity  { background: #F0F0FF; color: #6A7ABA; }
  }
  .coupon-value-text { font-size: 36rpx; font-weight: 700; color: #E05A4A; display: block; }
  .coupon-sub { font-size: 20rpx; color: #8A9E97; display: block; margin-top: 6rpx; }
  .coupon-actions {
    display: flex; align-items: center; gap: 12rpx; margin-top: 16rpx; flex-wrap: wrap;
  }
}

.modal-body {
  padding: 40rpx 32rpx;
  .modal-title { font-size: 30rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 24rpx; }
  .modal-footer { display: flex; gap: 16rpx; margin-top: 28rpx; }
}

.user-row {
  display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0;
  border-bottom: 1rpx solid #EEF2F0;
  .user-name   { flex: 1; font-size: 26rpx; color: #1C2A27; }
  .user-date   { font-size: 20rpx; color: #B0B8B5; }
  .user-status {
    font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 12rpx;
    &.available { background: #E8F5F1; color: #4A8A7A; }
    &.used      { background: #F0F0F0; color: #8A9E97; }
    &.expired   { background: #FFF0EE; color: #E07050; }
  }
}
</style>
