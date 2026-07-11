<template>
  <view class="page">
    <view class="form-card">
      <text class="title">完善账户信息</text>
      <text class="sub">请设置你的名字和登录密码，以便下次直接使用密码登录</text>

      <view class="field-group">
        <text class="field-label">昵称 <text class="required">*</text></text>
        <view class="input-wrap">
          <input class="ipt" v-model="form.name" placeholder="请输入你的名字" maxlength="20" />
        </view>
      </view>

      <view class="field-group">
        <text class="field-label">设置密码 <text class="required">*</text></text>
        <view class="input-wrap">
          <input class="ipt" v-model="form.password" placeholder="至少6位" password />
        </view>
      </view>

      <view class="field-group">
        <text class="field-label">确认密码 <text class="required">*</text></text>
        <view class="input-wrap">
          <input class="ipt" v-model="form.confirm" placeholder="再次输入密码" password />
        </view>
      </view>

      <view class="submit-btn" @click="submit">
        <text>{{loading ? '保存中...' : '完成'}}</text>
      </view>

      <text class="skip-link" @click="skip">暂时跳过，稍后在设置中完善</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../../store/user';
import { authApi } from '../../api/index';
import { hashPassword } from '../../utils/crypto';

const store = useUserStore();
const loading = ref(false);
const form = ref({ name: '', password: '', confirm: '' });

async function submit() {
  if (!form.value.name.trim()) return uni.showToast({ title: '请输入名字', icon: 'none' });
  if (form.value.password.length < 6) return uni.showToast({ title: '密码至少6位', icon: 'none' });
  if (form.value.password !== form.value.confirm) return uni.showToast({ title: '两次密码不一致', icon: 'none' });

  loading.value = true;
  try {
    const [profileRes] = await Promise.all([
      authApi.updateProfile({ name: form.value.name.trim() }),
      authApi.changePassword(null, await hashPassword(form.value.password)),
    ]);
    Object.assign(store.user, profileRes.user);
    uni.setStorageSync('user', JSON.stringify(store.user));
    uni.showToast({ title: '设置完成' });
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000);
  } catch (e) {
    uni.showToast({ title: e?.error || '保存失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function skip() {
  uni.reLaunch({ url: '/pages/index/index' });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: linear-gradient(160deg, #4A8A7A 0%, #3A6E80 100%);
  display: flex; flex-direction: column;
}
.form-card {
  background: #fff; flex: 1;
  border-radius: 40rpx 40rpx 0 0;
  margin-top: 80rpx; padding: 48rpx 40rpx 80rpx;
  display: flex; flex-direction: column;
}
.title { font-size: 40rpx; font-weight: 800; color: #1C2A27; display: block; margin-bottom: 12rpx; }
.sub { font-size: 24rpx; color: #8A9E97; display: block; margin-bottom: 40rpx; line-height: 1.6; }
.field-group { display: flex; flex-direction: column; gap: 10rpx; margin-bottom: 24rpx; }
.field-label { font-size: 24rpx; font-weight: 600; color: #617870; padding-left: 4rpx; }
.required { color: #E05A4A; }
.input-wrap {
  background: #F7F9F8; border-radius: 16rpx;
  border: 2rpx solid #E8EDEB; padding: 0 24rpx; height: 96rpx;
  display: flex; align-items: center;
}
.input-wrap:focus-within { border-color: #4A8A7A; }
.ipt { flex: 1; height: 96rpx; font-size: 28rpx; color: #1C2A27; background: transparent; }
.submit-btn {
  background: linear-gradient(135deg, #4A8A7A, #3A6E80);
  border-radius: 16rpx; padding: 28rpx 0;
  text-align: center; margin-top: 16rpx;
}
.submit-btn text { color: #fff; font-size: 30rpx; font-weight: 700; letter-spacing: 1rpx; }
.skip-link {
  text-align: center; font-size: 24rpx; color: #B0BEB8;
  margin-top: 32rpx; display: block;
}
</style>
