<template>
  <view class="page">
    <view v-if="!store.isLoggedIn()" class="not-login">
      <u-icon name="lock" size="64" color="#9BBCB4" />
      <text class="empty-text">请先登录</text>
      <view class="login-btn" @click="uni.navigateTo({url:'/pages/login/index'})">去登录</view>
    </view>
    <view v-else>
      <view class="header">
        <image class="avatar" :src="store.user?.avatar || '/static/default-avatar.png'" mode="aspectFill" @click="changeAvatar()" />
        <view class="header-info">
          <text class="name">{{store.user?.name || store.user?.username || '未设置昵称'}}</text>
          <view class="badges-row">
            <view class="role-badge">{{roleLabel[store.user?.role] || '用户'}}</view>
            <view v-if="store.isPending" class="pending-badge" @click="uni.navigateTo({url:'/pages/login/complete'})">待完善 →</view>
          </view>
        </view>
      </view>
      <view class="menus">
        <view class="menu-item" v-for="m in menus" :key="m.label" @click="menuClick(m)">
          <ZjIcon class="menu-icon" :name="m.icon" :size="40" color="#4A8A7A" />
          <text class="menu-label">{{m.label}}</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
      <text class="logout" @click="logout()">退出登录</text>
      <view class="footer-info">
        <text class="footer-item">客服邮箱：345958875@qq.com</text>
        <text class="footer-item">© 小程序开发：553997877@qq.com</text>
      </view>
    </view>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('profile/index'));
// #endif

import { computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import ZjIcon from '../../components/ZjIcon.vue';
import { useUserStore } from '../../store/user';
import { authApi, bookingApi, paymentApi } from '../../api/index';
import { SERVER } from '../../config';
import { track } from '../../utils/track';

const BASE_URL = SERVER;
const store = useUserStore();
const roleLabel = { user: '用户', consultant: '咨询师', admin: '管理员' };

onMounted(() => {
  track('page_view', '/pages/profile/index');
  if (store.isLoggedIn()) updateBadge();
});

onShow(() => {
  if (store.isLoggedIn()) updateBadge();
});

async function updateBadge() {
  try {
    const [bookings, orders] = await Promise.all([
      bookingApi.list(),
      paymentApi.listOrders(),
    ]);
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const paidOrders = orders.filter(o => o.status === 'paid').length;
    const total = pendingBookings + paidOrders;
    if (total > 0) {
      uni.setTabBarBadge({ index: 4, text: String(total) });
    } else {
      uni.removeTabBarBadge({ index: 4 });
    }
  } catch {}
}

function menuClick(m) {
  track('menu_click', '/pages/profile/index', { menu: m.label });
  m.action();
}

const menus = computed(() => {
  const base = [
    { label: '我的预约',   icon: 'calendar',       action: () => uni.navigateTo({ url: '/pages/booking/index' }) },
    { label: '我的订单',   icon: 'receipt',        action: () => uni.navigateTo({ url: '/pages/orders/index' }) },
    { label: '心理测评',   icon: 'clipboard-pen',  action: () => uni.navigateTo({ url: '/pages/assessment/my' }) },
    { label: '测评记录',   icon: 'clipboard-list', action: () => uni.navigateTo({ url: '/pages/assessment/results' }) },
    { label: '我的成就',   icon: 'trophy',         action: () => uni.navigateTo({ url: '/pages/profile/achievements' }) },
    { label: '抽卡记录',   icon: 'layers',         action: () => uni.navigateTo({ url: '/pages/ohcard/record' }) },
    { label: '我的券码',   icon: 'ticket',         action: () => uni.navigateTo({ url: '/pages/profile/coupons' }) },
    { label: '设置',       icon: 'settings',       action: () => uni.navigateTo({ url: '/pages/profile/settings' }) },
  ];
  if (store.user?.role === 'consultant') {
    base.splice(1, 0, { label: '排班管理', icon: 'clock', action: () => uni.navigateTo({ url: '/pages/consultants/schedule' }) });
  }
  return base;
});

function changeAvatar() {
  uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: ({ tempFilePaths }) => {
      uni.uploadFile({
        url: `${BASE_URL}/api/upload/avatar`,
        filePath: tempFilePaths[0],
        name: 'file',
        header: { Authorization: `Bearer ${uni.getStorageSync('token')}` },
        success: res => {
          const { url } = JSON.parse(res.data);
          authApi.updateProfile({ avatar: BASE_URL + url }).then(r => {
            store.user.avatar = BASE_URL + url;
            uni.setStorageSync('user', JSON.stringify(store.user));
          });
        }
      });
    }
  });
}

function logout() {
  uni.showModal({ title: '确认退出', content: '确认退出登录？', success: r => { if (r.confirm) { track('logout', '/pages/profile/index'); store.logout(); } } });
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; }

.not-login { display: flex; flex-direction: column; align-items: center; padding: 120rpx 32rpx; gap: 24rpx; }
.empty-text { font-size: 30rpx; color: #9BBCB4; }
.login-btn { margin-top: 8rpx; background: #4A8A7A; color: #fff; font-size: 28rpx; padding: 20rpx 80rpx; border-radius: 50rpx; }

.header { display: flex; gap: 24rpx; align-items: center; background: linear-gradient(135deg,#4A8A7A,#3A6E80); padding: 60rpx 32rpx 40rpx; }
.avatar { width: 120rpx; height: 120rpx; border-radius: 50%; border: 4rpx solid rgba(255,255,255,.4); }
.header-info { display: flex; flex-direction: column; gap: 12rpx; }
.name { font-size: 34rpx; font-weight: bold; color: #fff; }
.role-badge { background: rgba(255,255,255,.2); color: #fff; font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; align-self: flex-start; }
.badges-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.pending-badge { background: #FFF3E0; color: #F57C00; font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }

.menus { background: #fff; margin: 24rpx; border-radius: $zj-radius-card; overflow: hidden; }
.menu-item {
  display: flex; align-items: center; gap: 20rpx; padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f2f1;
  &:active { opacity: 0.88; }
}
.menu-icon { width: 44rpx; }
.menu-label { flex: 1; font-size: 28rpx; color: #1C2A27; }
.menu-arrow { font-size: 32rpx; color: #ccc; }

.logout {
  display: block; text-align: center; color: #9BBCB4; font-size: 28rpx;
  margin: 24rpx; background: #fff; padding: 30rpx; border-radius: $zj-radius-card;
}

.footer-info {
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
  padding: 24rpx 32rpx 60rpx;
}
.footer-item { font-size: 22rpx; color: #B0B8B5; }
</style>
