<template>
  <view class="page">
    <view v-if="!store.isLoggedIn()" class="empty">
      <u-empty text="请先登录查看记录" mode="auth" />
      <u-button type="primary" @click="uni.navigateTo({url:'/pages/login/index'})">去登录</u-button>
    </view>
    <view v-else>
      <view class="record" v-for="r in records" :key="r.id" @click="toggle(r.id)">
        <view class="r-header">
          <u-tag :text="typeLabel[r.type] || r.type" :type="typeColor[r.type] || 'info'" />
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
import { ref, onMounted } from 'vue';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';

const store = useUserStore();
const records = ref([]);
const expandedId = ref(null);
const fsCard = ref(null);

const typeLabel = { imgonly:'心理图卡', classic:'图卡+字卡', sort:'图卡排序', match:'图字匹配', room:'房间抽卡', combo:'跨卡牌组合', scene:'场景选卡', dilemma:'人生困境' };
const typeColor = { imgonly:'success', classic:'primary', sort:'warning', match:'success', room:'error', combo:'info', scene:'info', dilemma:'warning' };

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
.page { padding:24rpx; min-height:100vh; background:#F5F7F6; }
.empty { display:flex; flex-direction:column; align-items:center; padding:80rpx 0; gap:24rpx; }
.record { background:#fff; border-radius:16rpx; padding:24rpx; margin-bottom:16rpx; }
.r-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10rpx; }
.r-date { font-size:22rpx; color:#bbb; }
.r-name { font-size:28rpx; font-weight:600; color:#333; display:block; margin-bottom:10rpx; }
.r-preview { display:flex; align-items:center; gap:16rpx; margin-bottom:8rpx; }
.preview-img { width:80rpx; height:100rpx; border-radius:8rpx; }
.preview-word-box { background:linear-gradient(160deg,#0f2044,#1a3a6b); border-radius:8rpx; width:70rpx; height:80rpx; display:flex; align-items:center; justify-content:center; }
.preview-word { font-size:32rpx; font-weight:bold; color:#fff; }
.r-note { font-size:26rpx; color:#666; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.r-deck { font-size:22rpx; color:#4A8A7A; display:block; margin-top:4rpx; }

.r-cards-preview { display:flex; gap:8rpx; flex-wrap:wrap; margin:10rpx 0; }
.r-card-thumb { width:80rpx; height:110rpx; border-radius:6rpx; flex-shrink:0; }
.r-card-word-thumb { width:80rpx; height:110rpx; border-radius:6rpx; flex-shrink:0; background:linear-gradient(160deg,#0f2044,#1a3a6b); display:flex; align-items:center; justify-content:center; }
.r-card-word-txt { font-size:32rpx; font-weight:bold; color:#fff; }
.cards-expand { display:flex; flex-wrap:wrap; gap:12rpx; margin-top:16rpx; padding-top:16rpx; border-top:1rpx solid #f0f0f0; }
.ec-item { display:flex; flex-direction:column; align-items:center; width:140rpx; }
.ec-img { width:140rpx; height:190rpx; border-radius:10rpx; }
.ec-word { width:140rpx; height:190rpx; border-radius:10rpx; background:linear-gradient(160deg,#0f2044,#1a3a6b); display:flex; align-items:center; justify-content:center; }
.ec-word-text { font-size:48rpx; font-weight:bold; color:#fff; }
.ec-label { font-size:20rpx; color:#666; margin-top:6rpx; text-align:center; }
.ec-cat { font-size:18rpx; color:#aaa; text-align:center; }

/* 全屏 */
.fs-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.92); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20rpx; }
.fs-img { width:100vw; height:80vh; }
.fs-word { width:80vw; height:80vw; border:4rpx solid #c8a84b; border-radius:20rpx; display:flex; align-items:center; justify-content:center; background:linear-gradient(160deg,#0f2044,#1a3a6b); }
.fs-word-text { font-size:120rpx; font-weight:bold; color:#fff; }
.fs-label { color:rgba(255,255,255,.7); font-size:24rpx; }
</style>
