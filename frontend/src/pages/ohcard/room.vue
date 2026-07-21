<template>
  <view class="page">
    <view v-if="!inRoom" class="join">
      <text class="title">房间抽卡</text>
      <text class="desc">输入房间号加入，或创建新房间</text>
      <u-input v-model="roomInput" placeholder="输入房间号" type="number" style="margin:32rpx 0" />
      <view class="action-btn action-btn--primary" @click="joinRoom()"><text class="action-btn-text">加入房间</text></view>
      <view class="action-btn action-btn--plain" @click="createRoom()" style="margin-top:16rpx"><text class="action-btn-text">创建新房间</text></view>
    </view>

    <view v-else class="room">
      <view class="room-header">
        <text class="room-id">房间号：{{roomId}}</text>
        <view class="action-btn action-btn--mini" @click="dealCards()"><text class="action-btn-text">发牌</text></view>
      </view>
      <view class="members">
        <view class="member" v-for="m in members" :key="m.socketId">
          <view class="member-header">
            <text class="m-name">{{m.name}}</text>
            <u-tag v-if="m.ready" text="准备好了" type="success" size="mini" />
          </view>
          <view v-if="m.shared && m.cards" class="shared-cards">
            <view class="mini-card" v-for="c in m.cards" :key="c.id">
              <image v-if="c.image_url" :src="c.image_url" mode="aspectFit" class="mini-img" />
              <text v-else class="mini-word">{{c.word}}</text>
            </view>
          </view>
          <view v-else-if="m.ready" class="hidden-cards">
            <view class="mini-card back" v-for="i in (m.cards?.length||3)" :key="i" />
          </view>
        </view>
      </view>
      <view class="my-cards" v-if="myCards.length">
        <text class="my-title">我的牌</text>
        <scroll-view scroll-x>
          <view class="my-card-row">
            <view class="my-card" v-for="c in myCards" :key="c.id">
              <image v-if="c.image_url" :src="c.image_url" mode="aspectFit" class="card-img" />
              <text v-else class="card-word">{{c.word}}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      <view class="actions">
        <view class="action-btn" :class="isReady ? 'action-btn--disabled' : 'action-btn--primary'" @click="!isReady && setReady()"><text class="action-btn-text">{{isReady ? '已准备' : '准备好了'}}</text></view>
        <view class="action-btn" :class="isShared ? 'action-btn--warning' : 'action-btn--success'" @click="toggleShare()"><text class="action-btn-text">{{isShared ? '取消分享' : '分享给大家'}}</text></view>
        <view class="action-btn action-btn--danger-plain" @click="leaveRoom()"><text class="action-btn-text">离开房间</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('ohcard/room'));
// #endif

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { track } from '../../utils/track';
import { SERVER } from '../../config';

const store = useUserStore();
const roomInput = ref('');
const roomId = ref('');
const inRoom = ref(false);
const members = ref([]);
const myCards = ref([]);
const isReady = ref(false);
const isShared = ref(false);
let socket = null;

function initSocket() {
  socket = io(SERVER);
  socket.on('room-update', data => { members.value = data.members; });
  socket.on('cards-dealt', cards => { myCards.value = cards; isReady.value = false; isShared.value = false; });
}

function joinRoom() {
  if (!roomInput.value) return;
  roomId.value = roomInput.value;
  connectRoom();
}

function createRoom() {
  roomId.value = Math.floor(100000 + Math.random() * 900000).toString();
  connectRoom();
}

function connectRoom() {
  if (!store.isLoggedIn()) return uni.navigateTo({ url: '/pages/login/index' });
  initSocket();
  socket.emit('join-room', { roomId: roomId.value, userId: store.user.id, name: store.user.name || store.user.username });
  inRoom.value = true;
}

async function dealCards() {
  try {
    const cats = await ohcardApi.categories();
    const imgCat = cats.find(c => c.type === 'image');
    if (!imgCat) return;
    const cards = await ohcardApi.cards({ category_id: imgCat.id, count: 3 });
    socket.emit('deal-cards', { roomId: roomId.value, cards });
  } catch {}
}

function setReady() { socket.emit('set-ready', { roomId: roomId.value }); isReady.value = true; }
function toggleShare() {
  isShared.value = !isShared.value;
  socket.emit(isShared.value ? 'share-cards' : 'unshare-cards', { roomId: roomId.value });
}
function leaveRoom() { socket?.disconnect(); inRoom.value = false; roomId.value = ''; members.value = []; myCards.value = []; }

onUnmounted(() => socket?.disconnect());
onMounted(() => track('page_view', '/pages/ohcard/room'));
</script>

<style scoped lang="scss">
.page { padding: 32rpx; min-height: 100vh; background: $zj-bg; }
.join { display: flex; flex-direction: column; }
.title { font-size: 36rpx; font-weight: bold; color: $zj-text-1; display: block; margin-bottom: 8rpx; font-family: $zj-font-serif; }
.desc { font-size: 26rpx; color: $zj-text-2; display: block; }
.room-header { display: flex; justify-content: space-between; align-items: center; background: $zj-gradient-hero; padding: 16rpx 24rpx; border-radius: $zj-radius-sm; color: #fff; margin-bottom: 16rpx; }
.room-id { font-size: 28rpx; font-weight: 600; }
.member { background: $zj-surface; border-radius: $zj-radius-sm; padding: 20rpx; margin-bottom: 12rpx; box-shadow: $zj-shadow-card; }
.member-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.m-name { font-size: 28rpx; font-weight: 600; color: $zj-text-1; }
.shared-cards, .hidden-cards, .my-card-row { display: flex; gap: 12rpx; }
.mini-card { width: 100rpx; height: 130rpx; border-radius: 10rpx; overflow: hidden; background: $zj-bg; display: flex; align-items: center; justify-content: center; }
.mini-card.back { background: $zj-gradient-hero; }
.mini-img { width: 100%; height: 100%; }
.mini-word { font-size: 22rpx; font-weight: bold; color: $zj-teal; }
.my-cards { background: $zj-surface; border-radius: $zj-radius-sm; padding: 20rpx; margin: 16rpx 0; box-shadow: $zj-shadow-card; }
.my-title { font-size: 28rpx; font-weight: 600; color: $zj-text-1; display: block; margin-bottom: 16rpx; }
.my-card { width: 150rpx; height: 200rpx; flex-shrink: 0; border-radius: 12rpx; overflow: hidden; background: $zj-bg; display: flex; align-items: center; justify-content: center; }
.card-img { width: 100%; height: 100%; }
.card-word { font-size: 32rpx; font-weight: bold; color: $zj-teal; }
.actions { display: flex; flex-direction: column; gap: 16rpx; margin-top: 24rpx; }
.action-btn {
  text-align: center; padding: 22rpx 0; border-radius: 14rpx;
  &--primary     { background: $zj-teal; &:active { opacity: 0.88; } }
  &--warning     { background: #C88A2A; &:active { opacity: 0.88; } }
  &--success     { background: $zj-teal-dark; &:active { opacity: 0.88; } }
  &--danger-plain { border: 1.5rpx solid #C03030; background: #FFF5F5; &:active { opacity: 0.7; } }
  &--plain       { border: 1.5rpx solid $zj-border; background: $zj-surface; &:active { opacity: 0.7; } }
  &--mini        { padding: 12rpx 24rpx; &:active { opacity: 0.88; } }
  &--disabled    { opacity: 0.5; }
}
.action-btn-text {
  font-size: 28rpx; font-weight: 600;
  .action-btn--primary &, .action-btn--warning &, .action-btn--success & { color: #fff; }
  .action-btn--danger-plain & { color: #C03030; }
  .action-btn--plain & { color: $zj-text-2; }
  .action-btn--mini & { font-size: 24rpx; }
}
</style>
