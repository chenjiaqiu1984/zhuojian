<template>
  <view class="page">
    <view v-if="!store.isLoggedIn()" class="empty">
      <u-empty text="请先登录查看记录" mode="auth" />
      <view class="login-btn" @click="uni.navigateTo({url:'/pages/login/index'})"><text class="login-btn-text">去登录</text></view>
    </view>
    <view v-else>
      <view class="record" v-for="r in records" :key="r.id" @click="toggle(r.id)">
        <view class="r-header">
          <text class="r-type-tag">{{typeLabel[r.type] || r.type}}</text>
          <text class="r-date">{{fmt(r.created_at || r.createdAt)}}</text>
        </view>
        <!-- 名称标题 (combo/scene/dilemma) -->
        <text v-if="parsed(r).combo || parsed(r).scene || parsed(r).dilemma" class="r-name">
          {{(parsed(r).combo || parsed(r).scene || parsed(r).dilemma)?.title}}
        </text>
        <!-- 多卡预览 (combo/scene/dilemma) -->
        <view v-if="r.type==='combo'||r.type==='scene'||r.type==='dilemma'" class="r-cards-preview">
          <template v-for="(c,i) in (parsed(r).cards||[])" :key="i">
            <image v-if="c.imageUrl" :src="fullUrl(c.imageUrl)" class="r-card-thumb" mode="aspectFill" />
            <view v-else class="r-card-word-thumb"><text class="r-card-word-txt">{{c.word}}</text></view>
          </template>
        </view>
        <!-- 抽卡预览 -->
        <view v-if="r.type==='classic' || r.type==='imgonly'" class="r-preview">
          <image v-if="parsed(r).imgCard?.imageUrl" :src="fullUrl(parsed(r).imgCard.imageUrl)" class="preview-img" mode="aspectFit" />
          <view v-if="parsed(r).wordCard?.word" class="preview-word-box">
            <text class="preview-word">{{parsed(r).wordCard.word}}</text>
          </view>
        </view>
        <text v-if="(r.type==='classic'||r.type==='imgonly') && parsed(r).deckName" class="r-deck">{{parsed(r).deckName}}</text>
        <text v-if="r.note" class="r-note">{{r.note}}</text>

        <!-- 展开：combo/scene 卡牌列表 -->
        <view v-if="expandedId===r.id && parsed(r).cards" class="cards-expand">
          <view class="ec-item" v-for="(c,i) in parsed(r).cards" :key="i" @click.stop="previewCard(c)">
            <image v-if="c.imageUrl" :src="fullUrl(c.imageUrl)" class="ec-img" mode="aspectFill" />
            <view v-else class="ec-word"><text class="ec-word-text">{{c.word}}</text></view>
            <text class="ec-label">{{c.label}}</text>
            <text class="ec-cat">{{c.cat}}</text>
          </view>
        </view>
      </view>
      <u-empty v-if="!records.length" text="暂无记录" mode="data" />
    </view>

    <!-- 全屏预览 -->
    <view v-if="fsCard" class="fs-overlay" @click="fsCard=null">
      <image v-if="fsCard.imageUrl" :src="fullUrl(fsCard.imageUrl)" mode="aspectFit" class="fs-img" />
      <view v-else class="fs-word"><text class="fs-word-text">{{fsCard.word}}</text></view>
      <text class="fs-label">{{fsCard.label}} · {{fsCard.cat}}</text>
    </view>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('ohcard/record'));
// #endif

import { ref, onMounted } from 'vue';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';

const store = useUserStore();
const records = ref([]);
const expandedId = ref(null);
const fsCard = ref(null);

const typeLabel = { imgonly:'心理图卡', classic:'图卡+字卡', sort:'图卡排序', match:'图字匹配', room:'房间抽卡', combo:'跨卡牌组合', scene:'场景选卡', dilemma:'人生困境' };

onMounted(async () => {
  if (!store.isLoggedIn()) return;
  try { records.value = await ohcardApi.records(); } catch {}
});

function parsed(r) { try { return JSON.parse(r.data); } catch { return {}; } }
function fmt(d) { return d ? new Date(d).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''; }
function fullUrl(u) { return u?.startsWith('http') ? u : SERVER + u; }

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id;
}
function previewCard(c) { fsCard.value = c; }
</script>

<style scoped lang="scss">
.page { padding:32rpx 24rpx 64rpx; min-height:100vh; background: #F5F7F6; }
.empty { display:flex; flex-direction:column; align-items:center; padding:100rpx 0; gap:28rpx; }
.record { background:#FFFFFF; border:1rpx solid #E8EFED; border-radius:20rpx; padding:26rpx 24rpx; margin-bottom:16rpx; box-shadow:0 4rpx 18rpx rgba(28,42,39,0.04); }
.r-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12rpx; }
.r-type-tag { font-size:22rpx; color:$zj-teal; background:$zj-teal-light; padding:4rpx 16rpx; border-radius:20rpx; }
.r-date { font-size:22rpx; color:#B7C6C1; }
.r-name { font-size:28rpx; font-weight:600; color:#1C2A27; display:block; margin-bottom:12rpx; }
.r-preview { display:flex; align-items:center; gap:16rpx; margin-bottom:8rpx; }
.preview-img { width:80rpx; height:100rpx; border-radius:8rpx; }
.preview-word-box { background:linear-gradient(160deg,#1E3A34,#2C5249); border-radius:8rpx; width:70rpx; height:80rpx; display:flex; align-items:center; justify-content:center; }
.preview-word { font-size:32rpx; font-weight:bold; color:#fff; }
.r-note { font-size:26rpx; color:#617870; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.6; }
.r-deck { font-size:22rpx; color:#4A8A7A; display:block; margin-top:6rpx; }

.r-cards-preview { display:flex; gap:8rpx; flex-wrap:wrap; margin:12rpx 0; }
.r-card-thumb { width:80rpx; height:110rpx; border-radius:6rpx; flex-shrink:0; }
.r-card-word-thumb { width:80rpx; height:110rpx; border-radius:6rpx; flex-shrink:0; background:linear-gradient(160deg,#1E3A34,#2C5249); display:flex; align-items:center; justify-content:center; }
.r-card-word-txt { font-size:32rpx; font-weight:bold; color:#fff; }
.cards-expand { display:flex; flex-wrap:wrap; gap:12rpx; margin-top:18rpx; padding-top:18rpx; border-top:1rpx solid #EEF2F0; }
.ec-item { display:flex; flex-direction:column; align-items:center; width:140rpx; }
.ec-img { width:140rpx; height:190rpx; border-radius:10rpx; }
.ec-word { width:140rpx; height:190rpx; border-radius:10rpx; background:linear-gradient(160deg,#1E3A34,#2C5249); display:flex; align-items:center; justify-content:center; }
.ec-word-text { font-size:48rpx; font-weight:bold; color:#fff; }
.ec-label { font-size:20rpx; color:#617870; margin-top:6rpx; text-align:center; }
.ec-cat { font-size:18rpx; color:#B7C6C1; text-align:center; }

/* 全屏 */
.fs-overlay { position:fixed; inset:0; z-index:$zj-z-modal; background:rgba(20,32,29,.94); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20rpx; }
.fs-img { width:100vw; height:80vh; }
.fs-word { width:80vw; height:80vw; border:4rpx solid #C8A84B; border-radius:20rpx; display:flex; align-items:center; justify-content:center; background:linear-gradient(160deg,#1E3A34,#2C5249); }
.fs-word-text { font-size:120rpx; font-weight:bold; color:#fff; }
.fs-label { color:rgba(255,255,255,.7); font-size:24rpx; }
.login-btn { margin-top:32rpx; background:#4A8A7A; padding:22rpx 60rpx; border-radius:14rpx; text-align:center; }
.login-btn-text { color:#fff; font-size:28rpx; font-weight:600; }
</style>
