<template>
  <view class="page">
    <text class="tip">选择咨询师，提交后由咨询师为您深度解读（¥咨询师单次价格）</text>
    <view class="c-card" v-for="c in consultants" :key="c.id" :class="{selected: selectedId===c.id}" @click="selectedId=c.id">
      <image class="avatar" :src="fullUrl(c.avatar) || '/static/default-avatar.png'" mode="aspectFill" />
      <view class="info">
        <text class="name">{{c.name}}</text>
        <text class="title-text">{{c.title}}</text>
        <text class="price">¥{{c.price}} / 次</text>
      </view>
      <text v-if="selectedId===c.id" class="check">✓</text>
    </view>
    <u-empty v-if="!consultants.length" text="暂无咨询师" mode="data" />
    <view v-if="selectedId" class="submit-btn" @click="tapHandler = submit">
      提交申请（¥{{consultants.find(c=>c.id===selectedId)?.price || 0}}）
    </view>
  </view>
</template>

<script setup>
import {ref, onMounted, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { consultantApi, homeworkApi } from '../../api/index';
import { SERVER } from '../../config';

// #ifndef H5
const tapHandler = ref(null);
watch(tapHandler, () => { if (tapHandler.value) { const fn = tapHandler.value; tapHandler.value = null; fn(); } });
// #endif

const consultants = ref([]);
const selectedId = ref(null);
let type = '', recordId = 0;

onLoad((opts) => { type = opts.type; recordId = Number(opts.recordId); });
onMounted(() => {
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
.page { padding: 24rpx; background: #F5F7F6; min-height: 100vh; padding-bottom: 160rpx; }
.tip { display: block; font-size: 26rpx; color: #617870; margin-bottom: 24rpx; line-height: 1.6; }
.c-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; display: flex; align-items: center; gap: 20rpx; border: 3rpx solid transparent; }
.c-card.selected { border-color: #4A8A7A; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; flex-shrink: 0; }
.info { flex: 1; }
.name { font-size: 30rpx; font-weight: 700; color: #1C2A27; display: block; }
.title-text { font-size: 24rpx; color: #617870; display: block; margin: 4rpx 0; }
.price { font-size: 26rpx; color: #4A8A7A; font-weight: 600; }
.check { font-size: 36rpx; color: #4A8A7A; }
.submit-btn { position: fixed; bottom: 40rpx; left: 24rpx; right: 24rpx; background: #4A8A7A; color: #fff; text-align: center; padding: 28rpx; border-radius: 16rpx; font-size: 32rpx; font-weight: 700; }
</style>
