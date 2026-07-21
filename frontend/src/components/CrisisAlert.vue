<template>
  <view v-if="visible" class="overlay">
    <view class="modal">
      <view class="icon-row"><ZjIcon class="icon" name="heart" :size="40" color="#4A8A7A" /></view>

      <text class="title">我们注意到你可能正在经历一些困难</text>
      <text class="subtitle">你不需要独自面对，我们的咨询师随时可以陪伴你</text>

      <view class="btn-row">
        <view class="btn-consult" @click="goConsult()">
          <text class="btn-consult-text">预约咨询师</text>
        </view>
        <view class="btn-close" @click="close()">
          <text class="btn-close-text">我知道了</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import ZjIcon from './ZjIcon.vue';

const visible = ref(false);

function show() { visible.value = true; }
function close() { visible.value = false; }

function goConsult() {
  close();
  uni.navigateTo({ url: '/pages/consultants/index' });
}

defineExpose({ show });
</script>

<style scoped lang="scss">
.overlay {
  position: fixed; inset: 0; z-index: $zj-z-modal;
  background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  padding: 40rpx;
}

.modal {
  background: #fff;
  border-radius: 24rpx;
  padding: 56rpx 36rpx 40rpx;
  width: 100%;
  max-width: 600rpx;
}

.icon-row { display: flex; justify-content: center; margin-bottom: 24rpx; }
.icon { width: 40rpx; }

.title {
  display: block;
  font-size: 32rpx; font-weight: 700; color: #1C2A27;
  text-align: center; line-height: 1.5; margin-bottom: 16rpx;
}
.subtitle {
  display: block;
  font-size: 26rpx; color: #666;
  text-align: center; line-height: 1.7; margin-bottom: 40rpx;
}

.btn-row { display: flex; flex-direction: column; gap: 16rpx; }
.btn-consult {
  background: #4A8A7A;
  text-align: center; padding: 24rpx;
  border-radius: 14rpx;
  &:active { opacity: 0.88; }
}
.btn-consult-text { color: #fff; font-size: 28rpx; font-weight: 600; }
.btn-close {
  border: 2rpx solid #ddd;
  text-align: center; padding: 22rpx;
  border-radius: 14rpx;
  &:active { opacity: 0.88; }
}
.btn-close-text { color: #999; font-size: 26rpx; }
</style>
