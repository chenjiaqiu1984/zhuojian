<template>
  <view class="page">
    <!-- 顶部品牌区 -->
    <view class="brand-area">
      <view class="brand-circle">
        <text class="brand-initial">卓</text>
      </view>
      <text class="brand-name">卓见心理</text>
      <text class="brand-sub">专业心理服务平台</text>
    </view>

    <!-- 表单卡片 -->
    <view class="form-card">
      <view class="tab-bar">
        <view v-for="(t,i) in tabs" :key="i"
              class="tab-item" :class="{active: activeTab===i}"
              @click="activeTab=i">
          {{t}}
        </view>
      </view>

      <!-- 手机验证码 -->
      <view v-if="activeTab===0" class="tab-body">
        <view class="field-group">
          <text class="field-label">手机号</text>
          <view class="input-wrap">
            <input class="ipt" v-model="phone.num" placeholder="请输入手机号" type="number" maxlength="11" />
          </view>
        </view>
        <view class="field-group">
          <text class="field-label">验证码</text>
          <view class="code-row">
            <view class="input-wrap" style="flex:1">
              <input class="ipt" v-model="phone.code" placeholder="6位验证码" type="number" maxlength="6" />
            </view>
            <view :class="['send-btn', phone.countdown>0 && 'send-btn-disabled']" @click="sendSms">
              <text>{{phone.countdown>0 ? `${phone.countdown}s` : '获取验证码'}}</text>
            </view>
          </view>
        </view>
        <view class="submit-btn" @click="loginPhone">
          <text>{{loading ? '登录中...' : '登录 / 注册'}}</text>
        </view>
      </view>

      <!-- 邮箱验证码 -->
      <view v-if="activeTab===1" class="tab-body">
        <view class="field-group">
          <text class="field-label">邮箱</text>
          <view class="input-wrap">
            <input class="ipt" v-model="email.addr" placeholder="请输入邮箱地址" />
          </view>
        </view>
        <view class="field-group">
          <text class="field-label">验证码</text>
          <view class="code-row">
            <view class="input-wrap" style="flex:1">
              <input class="ipt" v-model="email.code" placeholder="6位验证码" type="number" maxlength="6" />
            </view>
            <view :class="['send-btn', email.countdown>0 && 'send-btn-disabled']" @click="sendEmail">
              <text>{{email.countdown>0 ? `${email.countdown}s` : '获取验证码'}}</text>
            </view>
          </view>
        </view>
        <view class="submit-btn" @click="loginEmail">
          <text>{{loading ? '登录中...' : '登录 / 注册'}}</text>
        </view>
      </view>

      <!-- 密码登录 -->
      <view v-if="activeTab===2" class="tab-body">
        <view class="field-group">
          <text class="field-label">用户名</text>
          <view class="input-wrap">
            <input class="ipt" v-model="pwd.username" placeholder="请输入用户名" />
          </view>
        </view>
        <view class="field-group">
          <text class="field-label">密码</text>
          <view class="input-wrap">
            <input class="ipt" v-model="pwd.password" placeholder="请输入密码" password />
          </view>
        </view>
        <view class="submit-btn" @click="loginPwd">
          <text>{{loading ? '登录中...' : '登录'}}</text>
        </view>
        <view class="aux-row">
          <text class="aux-link" @click="uni.navigateTo({url:'/pages/login/register'})">注册新账号</text>
          <text class="aux-link" @click="uni.navigateTo({url:'/pages/login/reset'})">忘记密码</text>
        </view>
      </view>

      <!-- 第三方登录 -->
      <view class="third-login">
        <view class="divider"><text class="divider-txt">其他方式登录</text></view>
        <view class="third-btns">
          <!-- #ifdef MP-WEIXIN -->
          <view class="third-btn wechat" @click="loginWechat">
            <u-icon name="weixin-circle-fill" color="#fff" size="36" />
          </view>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <view class="third-btn wechat" @click="loginWechat">
            <u-icon name="weixin-circle-fill" color="#fff" size="36" />
          </view>
          <view class="third-btn qq" @click="loginQQ">
            <u-icon name="qq-circle-fill" color="#fff" size="36" />
          </view>
          <!-- #endif -->
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../../store/user';
import { authApi } from '../../api/index';
import { track } from '../../utils/track';

const store = useUserStore();
const activeTab = ref(0);
const loading = ref(false);
const tabs = ['手机登录', '邮箱登录', '密码登录'];

const phone = ref({ num: '', code: '', countdown: 0 });
const email = ref({ addr: '', code: '', countdown: 0 });
const pwd = ref({ username: '', password: '' });

function startCountdown(target) {
  target.countdown = 60;
  const t = setInterval(() => { if (--target.countdown <= 0) clearInterval(t); }, 1000);
}

async function sendSms() {
  if (!/^1[3-9]\d{9}$/.test(phone.value.num)) return uni.showToast({ title: '手机号格式错误', icon: 'none' });
  try { await authApi.sendSms(phone.value.num); startCountdown(phone.value); uni.showToast({ title: '验证码已发送' }); }
  catch (e) { uni.showToast({ title: e.error || '发送失败', icon: 'none' }); }
}

async function sendEmail() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.addr)) return uni.showToast({ title: '邮箱格式错误', icon: 'none' });
  try { await authApi.sendEmail(email.value.addr); startCountdown(email.value); uni.showToast({ title: '验证码已发送至邮箱' }); }
  catch (e) { uni.showToast({ title: e.error || '发送失败', icon: 'none' }); }
}

async function loginPhone() {
  if (!phone.value.num || !phone.value.code) return uni.showToast({ title: '请填写完整', icon: 'none' });
  loading.value = true;
  try { await store.loginPhone(phone.value.num, phone.value.code, true); success(); }
  catch (e) { uni.showToast({ title: e.error || '验证码错误', icon: 'none' }); }
  finally { loading.value = false; }
}

async function loginEmail() {
  if (!email.value.addr || !email.value.code) return uni.showToast({ title: '请填写完整', icon: 'none' });
  loading.value = true;
  try { await store.loginEmail(email.value.addr, email.value.code, true); success(); }
  catch (e) { uni.showToast({ title: e.error || '验证码错误', icon: 'none' }); }
  finally { loading.value = false; }
}

async function loginPwd() {
  if (!pwd.value.username || !pwd.value.password) return uni.showToast({ title: '请填写完整', icon: 'none' });
  loading.value = true;
  try { await store.login(pwd.value.username, pwd.value.password); success(); }
  catch (e) { uni.showToast({ title: e.error || '登录失败', icon: 'none' }); }
  finally { loading.value = false; }
}

async function loginWechat() {
  // #ifdef MP-WEIXIN
  uni.login({ provider: 'weixin', success: async ({ code }) => {
    try { await store.loginWechat(code); success(); }
    catch (e) { uni.showToast({ title: e.error || '微信登录失败', icon: 'none' }); }
  }});
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信内使用', icon: 'none' });
  // #endif
}

async function loginQQ() {
  uni.login({ provider: 'qq', success: async ({ code }) => {
    try { await store.loginWechat(code); success(); }
    catch (e) { uni.showToast({ title: e.error || 'QQ登录失败', icon: 'none' }); }
  }, fail: () => uni.showToast({ title: '请在QQ内使用', icon: 'none' }) });
}

function success() { track('login_success', '/pages/login/index'); uni.showToast({ title: '登录成功' }); setTimeout(() => uni.navigateBack(), 1000); }
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: linear-gradient(170deg, #3A6E80 0%, #4A8A7A 55%, #F2F4F3 55%);
  display: flex; flex-direction: column;
}

/* 品牌区 */
.brand-area {
  padding: 72rpx 48rpx 48rpx;
  display: flex; flex-direction: column; align-items: center;
}
.brand-circle {
  width: 100rpx; height: 100rpx; border-radius: 50%;
  background: rgba(255,255,255,.22);
  border: 2rpx solid rgba(255,255,255,.4);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20rpx;
}
.brand-initial { font-size: 44rpx; font-weight: 800; color: #fff; }
.brand-name { font-size: 48rpx; font-weight: 800; color: #fff; letter-spacing: -1rpx; }
.brand-sub { font-size: 22rpx; color: rgba(255,255,255,.7); margin-top: 8rpx; letter-spacing: 1rpx; }

/* 表单卡片 */
.form-card {
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  flex: 1; padding: 36rpx 40rpx 80rpx;
  margin-top: 16rpx;
}

/* Tab */
.tab-bar { display: flex; border-bottom: 2rpx solid #F2F4F3; margin-bottom: 4rpx; }
.tab-item {
  flex: 1; text-align: center; padding: 20rpx 0;
  font-size: 26rpx; color: #9BBCB4; position: relative;
  transition: color 0.2s;
}
.tab-item.active { color: #1C2A27; font-weight: 700; }
.tab-item.active::after {
  content: ''; position: absolute;
  bottom: -2rpx; left: 20%; width: 60%; height: 4rpx;
  background: #4A8A7A; border-radius: 2rpx;
}

/* 表单字段 */
.tab-body { padding-top: 32rpx; display: flex; flex-direction: column; gap: 8rpx; }
.field-group { display: flex; flex-direction: column; gap: 10rpx; margin-bottom: 12rpx; }
.field-label { font-size: 24rpx; font-weight: 600; color: #617870; padding-left: 4rpx; }
.input-wrap {
  background: #F7F9F8; border-radius: 16rpx;
  border: 2rpx solid #E8EDEB;
  padding: 0 24rpx; height: 96rpx;
  display: flex; align-items: center;
}
.input-wrap:focus-within { border-color: #4A8A7A; }
.ipt { flex: 1; height: 96rpx; font-size: 28rpx; color: #1C2A27; background: transparent; }

/* 验证码行 */
.code-row { display: flex; align-items: center; gap: 16rpx; }
.send-btn {
  background: #EDF7F4; border-radius: 16rpx;
  padding: 0 28rpx; height: 96rpx;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.send-btn text { font-size: 24rpx; color: #4A8A7A; font-weight: 600; white-space: nowrap; }
.send-btn-disabled { background: #F2F4F3; }
.send-btn-disabled text { color: #B0BEB8; }

/* 提交按钮 */
.submit-btn {
  background: linear-gradient(135deg, #4A8A7A, #3A6E80);
  border-radius: 16rpx; padding: 28rpx 0;
  text-align: center; margin-top: 8rpx;
}
.submit-btn text { color: #fff; font-size: 30rpx; font-weight: 700; letter-spacing: 1rpx; }

/* 辅助链接 */
.aux-row { display: flex; justify-content: center; gap: 48rpx; margin-top: 24rpx; }
.aux-link { font-size: 26rpx; color: #4A8A7A; }

/* 第三方登录 */
.third-login { margin-top: 48rpx; }
.divider {
  display: flex; align-items: center; gap: 16rpx;
  margin-bottom: 32rpx;
}
.divider::before, .divider::after { content: ''; flex: 1; height: 1rpx; background: #EEF1EF; }
.divider-txt { font-size: 22rpx; color: #B0BEB8; flex-shrink: 0; }
.third-btns { display: flex; justify-content: center; gap: 40rpx; }
.third-btn {
  width: 88rpx; height: 88rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.wechat { background: #07C160; }
.qq { background: #1296DB; }
</style>
