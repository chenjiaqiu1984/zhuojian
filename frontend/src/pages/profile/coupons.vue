<template>
  <view class="page">
    <!-- Tab 切换 -->
    <u-tabs :list="tabs" :current="tab" @click="tab = $event.index" />

    <view v-if="loading" class="empty-wrap"><u-loading-icon /></view>
    <view v-else>
      <view v-if="filtered.length === 0" class="empty-wrap">
        <u-empty text="暂无优惠券" mode="coupon" />
        <view v-if="tab === 0" class="action-btn action-btn--primary" style="margin-top:32rpx" @click="uni.navigateTo({ url: '/pages/profile/coupon-activity' })"><text class="action-btn-text">去领取活动券</text></view>
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
            <view class="action-btn action-btn--mini action-btn--primary" @click="goUse()"><text class="action-btn-text">去使用</text></view>
          </view>
        </view>
      </view>

      <!-- 活动券领取入口 -->
      <view class="activity-banner" @click="showActivityModal = true">
        <ZjIcon class="activity-icon" name="gift" :size="40" color="#4A8A7A" />
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
        <view class="action-btn action-btn--primary action-btn--block" @click="doClaim()"><text class="action-btn-text">{{ claiming ? '领取中…' : '立即领取' }}</text></view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { couponApi } from '../../api/index';
import ZjIcon from '../../components/ZjIcon.vue';

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
$primary: #4A8A7A;
$primary-grad: linear-gradient(135deg, #4A8A7A, #6AADA0);
$bg: $zj-bg;
$text-main: #1C2A27;
$text-muted: #9BBCB4;
$text-sub: #8A9E97;

.page { min-height: 100vh; background: $bg; padding-bottom: 40rpx; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 100rpx 32rpx; }
.action-btn {
  text-align: center; padding: 20rpx 40rpx; border-radius: $zj-radius-sm;
  &--primary { background: #4A8A7A; }
  &--block   { width: 100%; box-sizing: border-box; }
  &--mini    { padding: 12rpx 24rpx; }
  &:active { opacity: 0.88; }
}
.action-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

.list { padding: 20rpx 24rpx; display: flex; flex-direction: column; gap: 20rpx; }

.coupon-card {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-radius: $zj-radius-card;
  overflow: hidden;
  position: relative;
  box-shadow: $zj-shadow-card;

  &.used, &.expired { opacity: .55; }

  .coupon-left {
    width: 188rpx;
    flex-shrink: 0;
    background: $primary-grad;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28rpx 16rpx;

    .coupon-unit  { font-size: 26rpx; color: rgba(255,255,255,.75); }
    .coupon-value { font-size: 60rpx; font-weight: 800; color: #fff; line-height: 1; font-variant-numeric: tabular-nums; }
    .coupon-value.activity { font-size: 36rpx; }
    .coupon-type-label { font-size: 20rpx; color: rgba(255,255,255,.85); margin-top: 6rpx; letter-spacing: 0.04em; }
  }

  .coupon-divider {
    width: 2rpx;
    background: repeating-linear-gradient(
      to bottom, transparent 0, transparent 8rpx, #EEF2F0 8rpx, #EEF2F0 16rpx
    );
    flex-shrink: 0;
  }

  .coupon-right {
    flex: 1;
    padding: 24rpx 28rpx 24rpx 24rpx;
    display: flex;
    flex-direction: column;
    gap: 6rpx;

    .coupon-name      { font-size: 28rpx; font-weight: 700; color: $text-main; }
    .coupon-desc      { font-size: 22rpx; color: $text-sub; line-height: 1.5; }
    .coupon-threshold { font-size: 22rpx; color: #C8821A; background: #FFF8EC; padding: 4rpx 12rpx; border-radius: 8rpx; display: inline-block; margin-top: 2rpx; }

    .coupon-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10rpx;
    }

    .meta-expire { font-size: 20rpx; color: $text-muted; }

    .status-tag {
      font-size: 20rpx;
      padding: 4rpx 14rpx;
      border-radius: 20rpx;
      font-weight: 600;
      &.available { background: #E8F5F1; color: $primary; }
      &.used      { background: #F0F0F0; color: $text-sub; }
      &.expired   { background: #FFF0EE; color: #E07050; }
    }
  }

  .use-btn-wrap {
    position: absolute;
    bottom: 24rpx;
    right: 24rpx;
  }
}

.activity-banner {
  margin: 20rpx 24rpx 0;
  padding: 28rpx 32rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: $zj-shadow-card;

  .activity-icon { width: 40rpx; }
  .activity-text { flex: 1; font-size: 28rpx; color: $text-main; font-weight: 500; }
  &:active { opacity: 0.88; }
}

.modal-body {
  padding: 44rpx 32rpx 56rpx;

  .modal-title {
    font-size: 32rpx;
    font-weight: 700;
    color: $text-main;
    display: block;
    margin-bottom: 24rpx;
  }
}
</style>
