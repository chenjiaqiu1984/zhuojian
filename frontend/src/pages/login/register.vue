<template>
  <view class="page">
    <view class="form-card">
      <text class="title">注册账号</text>
      <view class="input-wrap"><input class="ipt" v-model="form.username" placeholder="用户名" /></view>
      <view class="input-wrap"><input class="ipt" v-model="form.password" placeholder="密码（6位以上）" password /></view>
      <view class="input-wrap"><input class="ipt" v-model="form.name" placeholder="真实姓名（选填）" /></view>
      <view class="input-wrap"><input class="ipt" v-model="form.phone" placeholder="手机号（选填）" type="number" /></view>

      <!-- 协议勾选 -->
      <view class="agree-row">
        <view class="checkbox" :class="{checked: agreed}" @click="agreed=!agreed">
          <text v-if="agreed" class="check-mark">✓</text>
        </view>
        <text class="agree-text">
          我已阅读并同意
          <text class="link" @click.stop="nav('terms')">《用户服务协议》</text>
          和
          <text class="link" @click.stop="nav('privacy')">《隐私政策》</text>
        </text>
      </view>

      <view class="submit-btn" :class="{'submit-btn--loading': loading}" @click="!loading && doRegister()" style="margin-top:24rpx">
        <text class="submit-btn-text">{{ loading ? '注册中…' : '注册' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { authApi } from '../../api/index';
import { hashPassword } from '../../utils/crypto';

const form = ref({ username: '', password: '', name: '', phone: '' });
const loading = ref(false);
const agreed = ref(false);

function nav(page) {
  uni.navigateTo({ url: `/pages/legal/${page}` });
}

async function doRegister() {
  if (!form.value.username || !form.value.password) return uni.showToast({ title: '请填写用户名和密码', icon: 'none' });
  if (!agreed.value) return uni.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
  loading.value = true;
  try {
    await authApi.register({ ...form.value, password: await hashPassword(form.value.password), termsAccepted: true });
    uni.showToast({ title: '注册成功' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e) { uni.showToast({ title: e.error || '注册失败', icon: 'none' }); }
  finally { loading.value = false; }
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: linear-gradient(160deg,#4A8A7A 0%,#3A6E80 100%); display: flex; flex-direction: column; }
.form-card { background: #fff; flex: 1; border-radius: 40rpx 40rpx 0 0; margin-top: 80rpx; padding: 48rpx 40rpx 80rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 32rpx; }
.input-wrap { background: #f5f6f8; border-radius: 16rpx; border: 2rpx solid #e8e8e8; padding: 0 24rpx; height: 96rpx; display: flex; align-items: center; margin-bottom: 24rpx; }
.ipt { flex: 1; height: 96rpx; font-size: 28rpx; color: #333; background: transparent; }

.agree-row { display: flex; align-items: flex-start; gap: 14rpx; margin-top: 8rpx; }
.checkbox { width: 36rpx; height: 36rpx; border: 2rpx solid #4A8A7A; border-radius: 6rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.checkbox.checked { background: #4A8A7A; }
.check-mark { color: #fff; font-size: 24rpx; font-weight: bold; }
.agree-text { font-size: 24rpx; color: #666; line-height: 1.6; flex: 1; }
.link { color: #4A8A7A; }
.submit-btn {
  background: #4A8A7A; border-radius: 16rpx; padding: 26rpx 0; text-align: center;
  &--loading { opacity: 0.7; }
  &:active { opacity: 0.88; }
}
.submit-btn-text { color: #fff; font-size: 30rpx; font-weight: 700; }
</style>
