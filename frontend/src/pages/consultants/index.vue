<template>
  <view class="page">
    <view class="card" v-for="c in consultants" :key="c.id" @click="nav(c.id)">
      <image class="avatar" :src="fullUrl(c.avatar) || '/static/default-avatar.png'" mode="aspectFill" />
      <view class="info">
        <view class="name-row">
          <text class="name">{{c.name}}</text>
          <text class="title-tag">{{c.title}}</text>
        </view>
        <text class="bio" v-if="c.bio">{{c.bio}}</text>
        <view class="tags" v-if="c.specialties">
          <text class="tag" v-for="s in specialties(c)" :key="s">{{s}}</text>
        </view>
        <view class="meta-row">
          <view class="meta-stat" v-if="c.yearsExp || c.years_exp">
            <text class="meta-num">{{c.yearsExp || c.years_exp}}</text>
            <text class="meta-unit">年经验</text>
          </view>
          <view class="meta-divider" v-if="c.consultHours" />
          <view class="meta-stat" v-if="c.consultHours">
            <text class="meta-num">{{c.consultHours}}</text>
            <text class="meta-unit">咨询时</text>
          </view>
          <view class="price-wrap">
            <text class="price-sym">¥</text>
            <text class="price-num">{{ (c.price / 100).toFixed(2) }}</text>
            <text class="price-unit">/ 次</text>
          </view>
        </view>
        <view class="certs" v-if="certList(c).length">
          <text class="cert" v-for="cert in certList(c).slice(0,2)" :key="cert">{{cert}}</text>
        </view>
        <view :class="['btn', !c.hasAvailableSlots && 'btn-full']" @click.stop="nav(c.id)">
          <text>{{c.hasAvailableSlots ? '预约咨询' : '暂无空位'}}</text>
        </view>
      </view>
    </view>
    <u-empty v-if="!consultants.length && !loading" text="暂无咨询师" mode="data" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { consultantApi } from '../../api/index';
import { SERVER } from '../../config';
import { track } from '../../utils/track';

const BASE = SERVER;
const consultants = ref([]);
const loading = ref(true);

onMounted(async () => {
  track('page_view', '/pages/consultants/index');
  try { consultants.value = await consultantApi.list(); } catch {} finally { loading.value = false; }
});

function fullUrl(url) { return url ? (url.startsWith('http') ? url : BASE + url) : ''; }
function specialties(c) { return c.specialties ? c.specialties.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3) : []; }
function certList(c) { return c.certifications ? c.certifications.split('\n').map(s => s.trim()).filter(Boolean) : []; }
function nav(id) { track('consultant_click', '/pages/consultants/index', { id }); uni.navigateTo({ url: `/pages/consultants/detail?id=${id}` }); }
</script>

<style scoped lang="scss">
.page { padding: 20rpx; background: #F2F4F3; min-height: 100vh; }

.card {
  display: flex; gap: 24rpx;
  background: #fff; border-radius: 24rpx;
  padding: 28rpx; margin-bottom: 16rpx;
  align-items: flex-start;
}

.avatar {
  width: 148rpx; height: 148rpx;
  border-radius: 20rpx; flex-shrink: 0;
  border: 3rpx solid #EDF7F4;
}

.info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; min-width: 0; }

.name-row { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
.name { font-size: 32rpx; font-weight: 800; color: #1C2A27; }
.title-tag {
  font-size: 20rpx; color: #4A8A7A;
  background: #EDF7F4; padding: 4rpx 14rpx;
  border-radius: 20rpx; flex-shrink: 0;
}

.bio {
  font-size: 24rpx; color: #617870; line-height: 1.65;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}

.tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.tag {
  font-size: 21rpx; color: #617870;
  background: #F2F4F3; padding: 5rpx 14rpx;
  border-radius: 20rpx;
}

/* 统计行 */
.meta-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.meta-stat { display: flex; align-items: baseline; gap: 2rpx; }
.meta-num { font-size: 28rpx; font-weight: 700; color: #1C2A27; }
.meta-unit { font-size: 20rpx; color: #9BBCB4; }
.meta-divider { width: 1rpx; height: 24rpx; background: #E0E8E5; }
.price-wrap { margin-left: auto; display: flex; align-items: baseline; gap: 2rpx; }
.price-sym { font-size: 22rpx; color: #4A8A7A; font-weight: 600; }
.price-num { font-size: 36rpx; color: #4A8A7A; font-weight: 800; letter-spacing: -1rpx; }
.price-unit { font-size: 20rpx; color: #9BBCB4; }

/* 证书 */
.certs { display: flex; flex-wrap: wrap; gap: 8rpx; }
.cert {
  font-size: 20rpx; color: #3A6E80;
  background: #EAF2F8; padding: 4rpx 14rpx;
  border-radius: 20rpx;
  display: -webkit-box; -webkit-line-clamp: 1;
  -webkit-box-orient: vertical; overflow: hidden;
  max-width: 340rpx;
}

/* 按钮 */
.btn {
  background: #4A8A7A; border-radius: 14rpx;
  padding: 16rpx 0; text-align: center;
  margin-top: 4rpx;
}
.btn text { color: #fff; font-size: 26rpx; font-weight: 700; letter-spacing: 1rpx; }
.btn-full { background: #D4D9D7; }
.btn-full text { color: #fff; }
</style>
