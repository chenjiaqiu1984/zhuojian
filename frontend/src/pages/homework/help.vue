<template>
  <view class="page">
    <view class="page-header">
      <view class="hdr-glow" />
      <text class="hdr-icon">🩺</text>
      <text class="hdr-title">申请咨询解读</text>
      <text class="hdr-desc">选择咨询师，由专业治疗师为您深度解读</text>
    </view>

    <view class="content">
      <view class="tip-card">
        <text class="tip-text">提交后由咨询师按单次价格为您解读，费用在预约时结算</text>
      </view>

      <view class="c-card" v-for="c in consultants" :key="c.id" :class="{selected: selectedId===c.id}" @click="selectedId=c.id">
        <image class="avatar" :src="fullUrl(c.avatar) || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="info">
          <text class="c-name">{{c.name}}</text>
          <text class="c-title">{{c.title}}</text>
          <text class="c-price">¥{{c.price}} / 次</text>
        </view>
        <view class="check-wrap" :class="{active: selectedId===c.id}">
          <text v-if="selectedId===c.id" class="check-icon">✓</text>
        </view>
      </view>

      <u-empty v-if="!consultants.length" text="暂无咨询师" mode="data" />
    </view>

    <view v-if="selectedId" class="submit-btn" @click="submit()">
      提交申请（¥{{consultants.find(c=>c.id===selectedId)?.price || 0}}）
    </view>
  </view>
</template>

<script setup>
import {ref, onMounted, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { consultantApi, homeworkApi } from '../../api/index';
import { SERVER } from '../../config';
import { requireActive } from '../../utils/requireActive';


const consultants = ref([]);
const selectedId = ref(null);
let type = '', recordId = 0;

onLoad((opts) => { type = opts.type; recordId = Number(opts.recordId); });
onMounted(() => {
  if (!requireActive()) return;
  consultantApi.list().then(list => { consultants.value = list.filter(c => c.isActive !== 0); }).catch(() => {});
});

function fullUrl(url) { return url ? (url.startsWith('http') ? url : SERVER + url) : ''; }

async function submit() {
  try {
    await homeworkApi.helpCreate({ consultantId: selectedId.value, recordType: type, recordId });
    uni.showToast({ title: '申请已提交', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1200);
  } catch { uni.showToast({ title: '提交失败，可能已申请过', icon: 'none' }); }
}
</script>

<style scoped lang="scss">
$primary: #4A8A7A;
$bg: #F5F7F6;
$surface: #F5F8F7;
$text-main: #1C2A27;
$text-sub: #617870;
$text-muted: #9BBCB4;

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 160rpx;
}

/* Page Header */
.page-header {
  position: relative;
  overflow: hidden;
  padding: 56rpx 36rpx 44rpx;
  background: linear-gradient(155deg, #4A8A7A 0%, #2E5870 100%);
}

.hdr-glow {
  position: absolute;
  top: -100rpx;
  right: -80rpx;
  width: 360rpx;
  height: 320rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.14) 0%, transparent 66%);
  pointer-events: none;
}

.hdr-icon { display: block; font-size: 52rpx; margin-bottom: 16rpx; position: relative; z-index: 1; }

.hdr-title {
  display: block;
  font-size: 46rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.05em;
  font-family: "Noto Serif SC", serif;
  margin-bottom: 12rpx;
  position: relative;
  z-index: 1;
}

.hdr-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.75);
  line-height: 1.7;
  position: relative;
  z-index: 1;
}

/* Content */
.content { padding: 28rpx; }

.tip-card {
  background: #fff;
  border-radius: 18rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  border-left: 5rpx solid $primary;
  box-shadow: 0 2rpx 12rpx rgba(28,42,39,0.05);
}

.tip-text {
  font-size: 26rpx;
  color: $text-sub;
  line-height: 1.7;
}

/* Consultant Card */
.c-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border: 2rpx solid transparent;
  box-shadow: 0 2rpx 12rpx rgba(28,42,39,0.05);
  transition: all 0.15s;

  &.selected {
    border-color: $primary;
    background: #F5FAF8;
    box-shadow: 0 4rpx 20rpx rgba(74,138,122,0.14);
  }
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  flex-shrink: 0;
  border: 3rpx solid #E8F0EE;
}

.c-card.selected .avatar { border-color: rgba($primary, 0.4); }

.info { flex: 1; }

.c-name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-main;
  display: block;
  margin-bottom: 6rpx;
}

.c-title {
  font-size: 24rpx;
  color: $text-sub;
  display: block;
  margin-bottom: 8rpx;
}

.c-price {
  font-size: 26rpx;
  color: $primary;
  font-weight: 700;
}

.check-wrap {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 2rpx solid #D8E8E5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;

  &.active {
    background: $primary;
    border-color: $primary;
  }
}

.check-icon {
  font-size: 26rpx;
  color: #fff;
}

/* Submit Button */
.submit-btn {
  position: fixed;
  bottom: 40rpx;
  left: 28rpx;
  right: 28rpx;
  background: linear-gradient(135deg, $primary, #3A7068);
  color: #fff;
  text-align: center;
  padding: 30rpx;
  border-radius: 22rpx;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 8rpx 28rpx rgba(74,138,122,0.30);
}
</style>
