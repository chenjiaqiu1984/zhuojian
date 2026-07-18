<template>
  <!-- ══ 微信小程序：沉浸式全屏设计 ══ -->
  <!-- #ifdef MP-WEIXIN -->
  <view class="mp-root">
    <!-- 柔和背景光晕 -->
    <view class="glow glow-1" />
    <view class="glow glow-2" />

    <!-- 品牌区 -->
    <view class="mp-brand">
      <view class="mp-logo-wrap">
        <view class="mp-logo-frame">
          <image class="mp-logo-img" src="/static/logo.jpg" mode="aspectFit" />
        </view>
      </view>
      <text class="mp-name">卓见心理</text>
      <text class="mp-tagline">专业心理咨询服务平台</text>
    </view>

    <!-- 登录卡片 -->
    <view class="mp-card">
      <text class="mp-card-title">你好，欢迎</text>
      <text class="mp-card-desc">授权后手机号将加密保护，用于登录或快速注册</text>

      <button
        class="mp-tap-btn"
        open-type="getPhoneNumber"
        :disabled="loading"
        @getphonenumber="(e) => onGetPhoneNumber(e)"
        @tap="() => onBtnTap()"
      >{{ loading ? '登录中…' : '微信一键登录' }}</button>

      <view class="mp-terms">
        <text class="mp-terms-text">登录即代表同意</text>
        <view class="mp-terms-link" @click="goTerms()">
          <text class="mp-terms-link-text">《用户协议》</text>
        </view>
        <text class="mp-terms-text">与</text>
        <view class="mp-terms-link" @click="goPrivacy()">
          <text class="mp-terms-link-text">《隐私政策》</text>
        </view>
      </view>
    </view>
  </view>
  <!-- #endif -->

  <!-- ══ H5 / 其他平台：完整表单 ══ -->
  <!-- #ifndef MP-WEIXIN -->
  <view class="page">
    <!-- 背景柔光 -->
    <view class="bg-glow bg-glow-1" />
    <view class="bg-glow bg-glow-2" />

    <!-- 顶部品牌区 -->
    <view class="brand-area">
      <view class="brand-logo-frame">
        <image class="brand-logo-img" src="/static/logo.jpg" mode="aspectFit" />
      </view>
      <text class="brand-name">卓见心理</text>
      <text class="brand-sub">专业心理服务平台</text>
    </view>

    <!-- 表单卡片 -->
    <view class="form-card">
      <text class="form-welcome">你好，欢迎</text>

      <view class="tab-bar">
        <view v-for="(t,i) in tabs" :key="i"
              class="tab-item" :class="{active: activeTab===i}"
              @click="activeTab=i">
          {{t}}
        </view>
      </view>

      <!-- 密码登录 -->
      <view v-if="activeTab===0" class="tab-body">
        <view class="field-group">
          <text class="field-label">用户名</text>
          <view class="input-wrap">
            <input class="ipt" v-model="pwd.username" placeholder="请输入用户名" />
          </view>
        </view>
        <view class="field-group">
          <text class="field-label">密码</text>
          <view class="input-wrap">
            <input class="ipt" v-model="pwd.password" placeholder="请输入密码" type="password" />
          </view>
        </view>
        <text class="submit-btn" @click="loginPwd()">{{loading ? '登录中…' : '登 录'}}</text>
        <view class="remember-row" @click="rememberMe=!rememberMe">
          <view :class="['checkbox', rememberMe && 'checked']" />
          <text class="remember-txt">记住登录状态（30天）</text>
        </view>
        <view class="aux-row">
          <text class="aux-link" @click="activeTab=1">注册新账号</text>
          <text class="aux-link" @click="uni.navigateTo({url:'/pages/login/reset'})">忘记密码</text>
        </view>
      </view>

      <!-- 手机验证码 -->
      <view v-if="activeTab===1" class="tab-body">
        <view class="field-group">
          <text class="field-label">手机号</text>
          <view class="input-wrap">
            <input class="ipt" v-model="phone.num" placeholder="请输入手机号" type="number" maxlength="11" />
          </view>
        </view>
        <view class="field-group">
          <text class="field-label">图形码</text>
          <view class="captcha-row">
            <image class="captcha-img" :src="captchaUrl" @click="refreshCaptcha()" mode="aspectFit" />
            <view class="input-wrap" style="flex:1">
              <input class="ipt" v-model="captchaAnswer" placeholder="点击图片可刷新" maxlength="4" />
            </view>
          </view>
        </view>
        <view class="field-group">
          <text class="field-label">验证码</text>
          <view class="code-row">
            <view class="input-wrap" style="flex:1">
              <input class="ipt" v-model="phone.code" placeholder="6位验证码" type="number" maxlength="6" />
            </view>
            <view :class="['send-btn', phone.countdown>0 && 'send-btn-disabled']" @click="sendSms()">
              <text>{{phone.countdown>0 ? `${phone.countdown}s` : '获取验证码'}}</text>
            </view>
          </view>
        </view>
        <text class="submit-btn" @click="loginPhone()">{{loading ? '登录中…' : '登录 / 注册'}}</text>
        <view class="remember-row" @click="rememberMe=!rememberMe">
          <view :class="['checkbox', rememberMe && 'checked']" />
          <text class="remember-txt">记住登录状态（30天）</text>
        </view>
      </view>

      <!-- 第三方登录 -->
      <view class="third-login">
        <view class="divider"><text class="divider-txt">其他方式登录</text></view>
        <view class="third-btns">
          <view class="third-btn wechat" @click="loginWechat()">
            <u-icon name="weixin-circle-fill" color="#fff" size="36" />
          </view>
        </view>
      </view>
    </view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../../store/user';
import { authApi } from '../../api/index';
import { track } from '../../utils/track';
import { useCaptcha } from '../../composables/useCaptcha';

const store = useUserStore();
const activeTab = ref(0);
const loading = ref(false);
const tabs = ['密码登录', '手机登录'];

const phone = ref({ num: '', code: '', countdown: 0 });
const pwd = ref({ username: '', password: '' });
const rememberMe = ref(true);

const { captchaUrl, captchaToken, captchaAnswer, refreshCaptcha } = useCaptcha();
onMounted(() => refreshCaptcha());

function startCountdown(target) {
  target.countdown = 60;
  const t = setInterval(() => { if (--target.countdown <= 0) clearInterval(t); }, 1000);
}

async function sendSms() {
  if (!/^1[3-9]\d{9}$/.test(phone.value.num)) return uni.showToast({ title: '手机号格式错误', icon: 'none' });
  if (!captchaAnswer.value) return uni.showToast({ title: '请输入图形验证码', icon: 'none' });
  try {
    await authApi.sendSms(phone.value.num, captchaToken.value, captchaAnswer.value);
    startCountdown(phone.value); uni.showToast({ title: '验证码已发送' });
  } catch (e) {
    refreshCaptcha();
    if (e.resetAt) {
      const mins = Math.ceil((e.resetAt - Date.now()) / 60000);
      uni.showToast({ title: `${e.error}，${mins <= 1 ? '请稍后再试' : `请在 ${mins} 分钟后重试`}`, icon: 'none', duration: 4000 });
    } else {
      uni.showToast({ title: e.error || '发送失败', icon: 'none' });
    }
  }
}

async function loginPhone() {
  if (!phone.value.num || !phone.value.code) return uni.showToast({ title: '请填写完整', icon: 'none' });
  loading.value = true;
  try {
    await store.loginPhone(phone.value.num, phone.value.code, rememberMe.value);
    if (store.isPending) uni.redirectTo({ url: '/pages/login/complete' });
    else success();
  } catch (e) { uni.showToast({ title: e.error || '验证码错误', icon: 'none' }); }
  finally { loading.value = false; }
}

async function loginPwd() {
  if (!pwd.value.username || !pwd.value.password) return uni.showToast({ title: '请填写完整', icon: 'none' });
  loading.value = true;
  try { await store.login(pwd.value.username, pwd.value.password, rememberMe.value); success(); }
  catch (e) { uni.showToast({ title: e.error || '登录失败', icon: 'none' }); }
  finally { loading.value = false; }
}

async function loginWechat() {
  uni.showToast({ title: '请在微信内使用', icon: 'none' });
}

// #ifdef MP-WEIXIN
function goTerms() { uni.navigateTo({ url: '/pages/legal/terms' }); }
function goPrivacy() { uni.navigateTo({ url: '/pages/legal/privacy' }); }
// #endif

// #ifdef MP-WEIXIN
function onBtnTap() {}
// #endif

// #ifdef MP-WEIXIN
// 一键登录：同时获取手机号 + openid，实现 30 天免登录
async function onGetPhoneNumber(e) {
  console.log('[login] getPhoneNumber detail:', JSON.stringify(e.detail));

  // errno 非 0 表示用户拒绝或出错；errno===2 是用户主动取消，不必提示
  const errno = Number(e.detail.errno) || 0;
  if (errno !== 0) {
    console.warn('[login] errno non-zero:', errno);
    if (errno !== 2) uni.showToast({ title: '获取手机号被拒绝', icon: 'none' });
    return;
  }
  // code 为空：老版基础库或授权异常，给出明确提示而不是静默退出
  if (!e.detail.code) {
    console.warn('[login] no code in detail');
    uni.showToast({ title: '未获取到授权码，请升级微信后重试', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    // 静默调用 wx.login 获取 loginCode（用于后端绑定 openid）
    // 加 5s 超时防止 uni.login 挂起
    console.log('[login] calling wx.login...');
    const loginCode = await new Promise((resolve) => {
      const t = setTimeout(() => { console.warn('[login] wx.login timeout'); resolve(null); }, 5000);
      uni.login({
        provider: 'weixin',
        success: (r) => { clearTimeout(t); console.log('[login] wx.login ok, code prefix:', r.code?.slice(0,8)); resolve(r.code); },
        fail:    (err) => { clearTimeout(t); console.error('[login] wx.login fail:', err); resolve(null); }
      });
    });

    console.log('[login] calling loginPhoneWechat, loginCode:', loginCode ? 'ok' : 'null');
    await store.loginPhoneWechat(e.detail.code, loginCode);
    console.log('[login] loginPhoneWechat ok, isPending:', store.isPending, 'user status:', store.user?.status);

    if (store.isPending) {
      console.log('[login] redirectTo complete page');
      uni.redirectTo({ url: '/pages/login/complete' });
    } else {
      console.log('[login] calling success()');
      success();
    }
  } catch (err) {
    // err.error：后端业务错误；err.errMsg：uni-app 网络错误
    console.error('[login] error:', JSON.stringify(err));
    uni.showToast({ title: err.error || err.errMsg || '登录失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
// #endif

function success() {
  track('login_success', '/pages/login/index');
  uni.showToast({ title: '登录成功' });
  setTimeout(() => {
    const pages = getCurrentPages();
    if (pages.length > 1) uni.navigateBack();
    else uni.reLaunch({ url: '/pages/index/index' });
  }, 1000);
}
</script>

<style scoped lang="scss">
/* ═══════════════════════════════════════════
   微信小程序：沉浸式登录页
   ─ 全屏渐变 · 浮动卡片 · 品牌感
═══════════════════════════════════════════ */

.mp-root {
  min-height: 100vh;
  background: linear-gradient(168deg, #163831 0%, #1F5448 22%, #2E7262 45%, #4A8A7A 68%, #7DBFB0 88%, #D6EDE8 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 背景柔光 —— pointer-events:none 固定伪元素，不影响 GPU 卷轴性能 */
.glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
.glow-1 {
  width: 560rpx; height: 560rpx;
  top: -120rpx; right: -120rpx;
  background: radial-gradient(circle, rgba(255,255,255,.10) 0%, transparent 65%);
}
.glow-2 {
  width: 420rpx; height: 420rpx;
  top: 38%; left: -140rpx;
  background: radial-gradient(circle, rgba(255,255,255,.07) 0%, transparent 65%);
}

/* ── 品牌区 ── */
.mp-brand {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx 80rpx;
}

/* Logo：真实品牌图片 — iOS app icon 风格圆角正方形 */
.mp-logo-wrap {
  margin-bottom: 40rpx;
  position: relative;
}
/* 外层 view 负责圆角裁剪 — 小程序中 image 直接设 border-radius 不可靠 */
.mp-logo-frame {
  width: 160rpx;
  height: 160rpx;
  border-radius: 36rpx;
  overflow: hidden;
  /* translateZ(0) 强制独立合成层，使 overflow:hidden 正确裁剪圆角 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  background: #fff;
  box-shadow:
    0 8rpx 40rpx rgba(22,56,49,.40),
    0 0 0 3rpx rgba(255,255,255,.20),
    0 0 0 10rpx rgba(255,255,255,.07);
}
.mp-logo-img {
  width: 160rpx;
  height: 160rpx;
  display: block;
}

.mp-name {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 6rpx;
  margin-bottom: 16rpx;
}
.mp-tagline {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,.58);
  letter-spacing: 2rpx;
}

/* ── 浮动登录卡片 ── */
.mp-card {
  position: relative;
  z-index: 1;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 64rpx 52rpx 80rpx;
  box-shadow: 0 -8rpx 80rpx rgba(22,56,49,.18);
}

.mp-card-title {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  color: #142721;
  letter-spacing: -0.5rpx;
  margin-bottom: 14rpx;
}
.mp-card-desc {
  display: block;
  font-size: 26rpx;
  color: #80A89E;
  line-height: 1.65;
  margin-bottom: 52rpx;
}

/* 一键登录按钮 */
.mp-tap-btn {
  display: block;
  width: 100%;
  height: 108rpx;
  line-height: 108rpx;
  text-align: center;
  background: linear-gradient(135deg, #1F5448 0%, #2E7262 40%, #4A8A7A 100%);
  border-radius: 28rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1rpx;
  border: none;
  box-shadow: 0 16rpx 48rpx rgba(30,84,72,.35), inset 0 1rpx 0 rgba(255,255,255,.15);
  margin-bottom: 44rpx;
  &::after { border: none !important; }
  &[disabled] {
    opacity: 0.55;
    box-shadow: none;
  }
}

/* 分隔线 */
.mp-divider {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 36rpx;
}
.mp-divider-line {
  flex: 1;
  height: 1rpx;
  background: #EAF0EE;
}
.mp-divider-text {
  font-size: 22rpx;
  color: #B8CEC9;
  letter-spacing: 1rpx;
  white-space: nowrap;
}

/* 协议行 */
.mp-terms {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2rpx;
}
.mp-terms-text {
  font-size: 24rpx;
  color: #A0BAB5;
}
.mp-terms-link {
  padding: 6rpx 10rpx;
}
.mp-terms-link-text {
  font-size: 24rpx;
  color: #4A8A7A;
  font-weight: 600;
}


/* ═══════════════════════════════════════════
   H5 / 其他平台：精致全屏设计
   ─ 同款渐变 · 品牌感 · 浮动白卡
═══════════════════════════════════════════ */

.page {
  min-height: 100vh;
  background: linear-gradient(168deg, #163831 0%, #1F5448 22%, #2E7262 45%, #4A8A7A 68%, #7DBFB0 88%, #D6EDE8 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 背景柔光 */
.bg-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
.bg-glow-1 {
  width: 560rpx; height: 560rpx;
  top: -120rpx; right: -120rpx;
  background: radial-gradient(circle, rgba(255,255,255,.10) 0%, transparent 65%);
}
.bg-glow-2 {
  width: 420rpx; height: 420rpx;
  top: 40%; left: -140rpx;
  background: radial-gradient(circle, rgba(255,255,255,.07) 0%, transparent 65%);
}

/* 品牌区 */
.brand-area {
  position: relative;
  z-index: 1;
  padding: 88rpx 48rpx 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.brand-logo-frame {
  width: 140rpx;
  height: 140rpx;
  border-radius: 32rpx;
  overflow: hidden;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  background: #fff;
  box-shadow:
    0 8rpx 40rpx rgba(22,56,49,.40),
    0 0 0 3rpx rgba(255,255,255,.20),
    0 0 0 10rpx rgba(255,255,255,.07);
  margin-bottom: 28rpx;
}
.brand-logo-img {
  width: 140rpx;
  height: 140rpx;
  display: block;
}
.brand-name {
  display: block;
  font-size: 48rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: 4rpx;
  margin-bottom: 12rpx;
}
.brand-sub {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,.58);
  letter-spacing: 2rpx;
}

/* 表单卡片 */
.form-card {
  position: relative;
  z-index: 1;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  flex: 1;
  padding: 56rpx 48rpx 80rpx;
  box-shadow: 0 -8rpx 80rpx rgba(22,56,49,.18);
}

/* 欢迎标题 */
.form-welcome {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  color: #142721;
  letter-spacing: -0.5rpx;
  margin-bottom: 36rpx;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  border-bottom: 2rpx solid #EEF1EF;
  margin-bottom: 8rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #9BBCB4;
  position: relative;
  transition: color 0.2s;
}
.tab-item.active {
  color: #142721;
  font-weight: 700;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -2rpx;
  left: 15%;
  width: 70%;
  height: 4rpx;
  background: linear-gradient(90deg, #2E7262, #4A8A7A);
  border-radius: 2rpx;
}

/* 表单区域 */
.tab-body {
  padding-top: 36rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 16rpx;
}
.field-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #617870;
  padding-left: 4rpx;
}
.input-wrap {
  background: #F7F9F8;
  border-radius: 16rpx;
  border: 2rpx solid #E8EDEB;
  padding: 0 28rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  transition: border-color 0.2s, background 0.2s;
}
.input-wrap:focus-within {
  border-color: #4A8A7A;
  background: #F3FAF8;
}
.ipt {
  flex: 1;
  height: 100rpx;
  font-size: 28rpx;
  color: #1C2A27;
  background: transparent;
}

/* 验证码行 */
.code-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.send-btn {
  background: #EDF7F4;
  border-radius: 16rpx;
  padding: 0 32rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { opacity: 0.88; }
}
.send-btn text {
  font-size: 24rpx;
  color: #4A8A7A;
  font-weight: 600;
  white-space: nowrap;
}
.send-btn-disabled { background: #F2F4F3; }
.send-btn-disabled text { color: #B0BEB8; }

/* 提交按钮 */
.submit-btn {
  display: block;
  width: 100%;
  height: 108rpx;
  line-height: 108rpx;
  text-align: center;
  background: linear-gradient(135deg, #1F5448 0%, #2E7262 40%, #4A8A7A 100%);
  border-radius: 28rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
  box-shadow: 0 16rpx 48rpx rgba(30,84,72,.30), inset 0 1rpx 0 rgba(255,255,255,.15);
  margin-top: 12rpx;
  box-sizing: border-box;
  &:active { opacity: 0.88; }
}

/* 记住我 */
.remember-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 24rpx;
  cursor: pointer;
}
.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #C0CCC8;
  border-radius: 8rpx;
  background: #fff;
  flex-shrink: 0;
  transition: background-color 0.2s, border-color 0.2s;
}
.checkbox.checked {
  background: #4A8A7A;
  border-color: #4A8A7A;
  position: relative;
}
.checkbox.checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 22rpx;
  line-height: 1;
}
.remember-txt {
  font-size: 24rpx;
  color: #617870;
}

/* 辅助链接行 */
.aux-row {
  display: flex;
  justify-content: space-between;
  margin-top: 28rpx;
  padding: 0 4rpx;
}
.aux-link {
  font-size: 26rpx;
  color: #4A8A7A;
  font-weight: 500;
}

/* 第三方登录 */
.third-login { margin-top: 56rpx; }
.divider {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1rpx;
  background: #EEF1EF;
}
.divider-txt {
  font-size: 22rpx;
  color: #B0BEB8;
  flex-shrink: 0;
}
.third-btns {
  display: flex;
  justify-content: center;
  gap: 40rpx;
}
.third-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,.14);
}
.wechat { background: #07C160; }

/* 图形验证码 */
.captcha-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.captcha-img {
  width: 200rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: #F7F9F8;
  flex-shrink: 0;
  border: 2rpx solid #E8EDEB;
}
</style>
