<template>
  <view class="page">
    <view v-if="!inRoom" class="join">
      <text class="title">房间抽卡</text>
      <text class="desc">输入房间号加入，或创建新房间</text>
      <u-input v-model="roomInput" placeholder="输入房间号" type="number" style="margin:32rpx 0" />
      <u-button type="primary" @click="joinRoom">加入房间</u-button>
      <u-button plain @click="createRoom" style="margin-top:16rpx">创建新房间</u-button>
    </view>

    <view v-else class="room">
      <view class="room-header">
        <text class="room-id">房间号：{{roomId}}</text>
        <u-button size="mini" @click="dealCards">发牌</u-button>
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
        <u-button type="primary" @click="setReady" :disabled="isReady">{{isReady ? '已准备' : '准备好了'}}</u-button>
        <u-button :type="isShared ? 'warning' : 'success'" @click="toggleShare">{{isShared ? '取消分享' : '分享给大家'}}</u-button>
        <u-button type="error" plain @click="leaveRoom">离开房间</u-button>
      </view>
    </view>
  </view>
</template>

<script setup>
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
.page { padding: 32rpx; min-height: 100vh; }
.join { display: flex; flex-direction: column; }
.title { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 8rpx; }
.desc { font-size: 26rpx; color: #777; display: block; }
.room-header { display: flex; justify-content: space-between; align-items: center; background: #4A7BBA; padding: 16rpx 24rpx; border-radius: 16rpx; color: #fff; margin-bottom: 16rpx; }
.room-id { font-size: 28rpx; font-weight: 600; }
.member { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 12rpx; }
.member-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.m-name { font-size: 28rpx; font-weight: 600; color: #333; }
.shared-cards, .hidden-cards, .my-card-row { display: flex; gap: 12rpx; }
.mini-card { width: 100rpx; height: 130rpx; border-radius: 10rpx; overflow: hidden; background: #f5f7fa; display: flex; align-items: center; justify-content: center; }
.mini-card.back { background: linear-gradient(135deg,#4A7BBA,#7B68EE); }
.mini-img { width: 100%; height: 100%; }
.mini-word { font-size: 22rpx; font-weight: bold; color: #4A7BBA; }
.my-cards { background: #fff; border-radius: 16rpx; padding: 20rpx; margin: 16rpx 0; }
.my-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.my-card { width: 150rpx; height: 200rpx; flex-shrink: 0; border-radius: 12rpx; overflow: hidden; background: #f5f7fa; display: flex; align-items: center; justify-content: center; }
.card-img { width: 100%; height: 100%; }
.card-word { font-size: 32rpx; font-weight: bold; color: #4A7BBA; }
.actions { display: flex; flex-direction: column; gap: 16rpx; margin-top: 24rpx; }
</style>
