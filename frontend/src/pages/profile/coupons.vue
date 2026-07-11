<template>
  <view class="page">
    <!-- Tab 切换 -->
    <u-tabs :list="tabs" :current="tab" @click="tab = $event.index" />

    <view v-if="loading" class="empty-wrap"><u-loading-icon /></view>
    <view v-else>
      <view v-if="filtered.length === 0" class="empty-wrap">
        <u-empty text="暂无优惠券" mode="coupon" />
        <u-button v-if="tab === 0" type="primary" size="small"
          style="margin-top:32rpx"
          @click="uni.navigateTo({ url: '/pages/profile/coupon-activity' })">
          去领取活动券
        </u-button>
      </view>

      <view v-else class="list">
        <view
          v-for="uc in filtered"
          :key="uc.id"
          :class="['coupon-card', uc.status]"
        >
          <!-- 左侧金额区 -->
          <view class="coupon-left">
            <template v-if="uc.coupon.type === 'discount'">
              <text class="coupon-value">{{ Math.round(uc.coupon.value * 10) }}折</text>
              <text class="coupon-type-label">打折券</text>
            </template>
            <template v-else-if="uc.coupon.type === 'direct'">
              <text class="coupon-unit">¥</text>
              <text class="coupon-value">{{ (uc.coupon.value / 100).toFixed(0) }}</text>
              <text class="coupon-type-label">直减券</text>
            </template>
            <template v-else-if="uc.coupon.type === 'threshold'">
              <text class="coupon-unit">¥</text>
              <text class="coupon-value">{{ (uc.coupon.value / 100).toFixed(0) }}</text>
              <text class="coupon-type-label">满减券</text>
            </template>
            <template v-else>
              <text class="coupon-value activity">免费</text>
              <text class="coupon-type-label">活动券</text>
            </template>
          </view>

          <!-- 虚线 -->
          <view class="coupon-divider" />

          <!-- 右侧详情 -->
          <view class="coupon-right">
            <text class="coupon-name">{{ uc.coupon.name }}</text>
            <text class="coupon-desc" v-if="uc.coupon.description">{{ uc.coupon.description }}</text>
            <text class="coupon-threshold" v-if="uc.coupon.type === 'threshold'">
              满¥{{ (uc.coupon.threshold / 100).toFixed(0) }}可用
            </text>
            <view class="coupon-meta">
              <text class="meta-expire" v-if="uc.coupon.expireAt">
                {{ fmtDate(uc.coupon.expireAt) }} 到期
              </text>
              <text class="meta-expire" v-else>长期有效</text>
              <text :class="['status-tag', uc.status]">{{ statusLabel[uc.status] }}</text>
            </view>
          </view>

          <!-- 可用时显示使用按钮 -->
          <view v-if="uc.status === 'available'" class="use-btn-wrap">
            <u-button type="primary" size="mini" @click="goUse()">去使用</u-button>
          </view>
        </view>
      </view>

      <!-- 活动券领取入口 -->
      <view class="activity-banner" @click="showActivityModal = true">
        <text class="activity-icon">🎁</text>
        <text class="activity-text">输入兑换码领取优惠券</text>
        <u-icon name="arrow-right" color="#4A8A7A" />
      </view>
    </view>

    <!-- 兑换码弹窗 -->
    <u-popup :show="showActivityModal" round="12" @close="showActivityModal = false">
      <view class="modal-body">
        <text class="modal-title">输入兑换码</text>
        <u-input v-model="claimCode" placeholder="请输入优惠码" clearable
          style="margin:16rpx 0" />
        <u-button type="primary" block :loading="claiming" @click="doClaim()">
          立即领取
        </u-button>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { couponApi } from '../../api/index';

const tabs     = [{ name: '可用' }, { name: '已用' }, { name: '已过期' }];
const tab      = ref(0);
const list     = ref([]);
const loading  = ref(true);
const showActivityModal = ref(false);
const claimCode = ref('');
const claiming  = ref(false);

const statusLabel = { available: '可用', used: '已使用', expired: '已过期' };
const statusMap   = ['available', 'used', 'expired'];

const filtered = computed(() =>
  list.value.filter(uc => uc.status === statusMap[tab.value])
);

function fmtDate(str) {
  const d = new Date(str);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function goUse() {
  uni.switchTab({ url: '/pages/consultants/index' });
}

async function doClaim() {
  if (!claimCode.value.trim()) return uni.showToast({ title: '请输入兑换码', icon: 'none' });
  claiming.value = true;
  try {
    await couponApi.claim(claimCode.value.trim());
    uni.showToast({ title: '领取成功', icon: 'success' });
    showActivityModal.value = false;
    claimCode.value = '';
    list.value = await couponApi.my();
  } catch (e) {
    uni.showToast({ title: e?.error || '领取失败', icon: 'none' });
  } finally {
    claiming.value = false;
  }
}

onMounted(async () => {
  try { list.value = await couponApi.my(); } catch {}
  loading.value = false;
});
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; padding-bottom: 40rpx; }
.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 100rpx 32rpx; }

.list { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }

.coupon-card {
  display: flex; align-items: stretch; background: #fff;
  border-radius: 20rpx; overflow: hidden;
  position: relative;

  &.used, &.expired { opacity: .55; }

  .coupon-left {
    width: 180rpx; flex-shrink: 0;
    background: linear-gradient(135deg, #4A8A7A, #6AADA0);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24rpx 16rpx;
    .coupon-unit  { font-size: 28rpx; color: rgba(255,255,255,.8); }
    .coupon-value { font-size: 56rpx; font-weight: 700; color: #fff; line-height: 1; }
    .coupon-value.activity { font-size: 36rpx; }
    .coupon-type-label { font-size: 20rpx; color: rgba(255,255,255,.85); margin-top: 4rpx; }
  }

  .coupon-divider {
    width: 2rpx; background: repeating-linear-gradient(
      to bottom, transparent 0, transparent 8rpx, #EEF2F0 8rpx, #EEF2F0 16rpx
    );
    flex-shrink: 0;
  }

  .coupon-right {
    flex: 1; padding: 24rpx 28rpx; display: flex; flex-direction: column; gap: 6rpx;
    .coupon-name      { font-size: 28rpx; font-weight: 600; color: #1C2A27; }
    .coupon-desc      { font-size: 22rpx; color: #8A9E97; }
    .coupon-threshold { font-size: 22rpx; color: #C8821A; }
    .coupon-meta      { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
    .meta-expire      { font-size: 20rpx; color: #B0B8B5; }
    .status-tag {
      font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx;
      &.available { background: #E8F5F1; color: #4A8A7A; }
      &.used      { background: #F0F0F0; color: #8A9E97; }
      &.expired   { background: #FFF0EE; color: #E07050; }
    }
  }

  .use-btn-wrap {
    position: absolute; bottom: 24rpx; right: 24rpx;
  }
}

.activity-banner {
  margin: 24rpx; padding: 28rpx 32rpx;
  background: #fff; border-radius: 16rpx;
  display: flex; align-items: center; gap: 16rpx;
  .activity-icon { font-size: 36rpx; }
  .activity-text { flex: 1; font-size: 28rpx; color: #1C2A27; }
}

.modal-body {
  padding: 40rpx 32rpx;
  .modal-title { font-size: 30rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 8rpx; }
}
</style>
