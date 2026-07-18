<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-blob" />
      <view class="hero-content">
        <text class="hero-eyebrow">治疗工具包</text>
        <text class="hero-title">作业练习</text>
        <text class="hero-sub">系统化的心理练习，陪伴你持续成长</text>
      </view>
    </view>

    <!-- Tool Cards -->
    <view class="tools-wrap">
      <view
        class="tool-card"
        v-for="tool in tools"
        :key="tool.name"
        @click="nav(tool.url)"
      >
        <view class="icon-wrap" :style="{ background: tool.bg }">
          <view class="icon-shine" />
          <ZjIcon class="icon-text" :name="tool.icon" :size="48" color="#fff" />
        </view>
        <view class="info">
          <text class="name">{{ tool.name }}</text>
          <text class="desc">{{ tool.desc }}</text>
        </view>
        <view class="arrow-wrap">
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup>
import ZjIcon from '../../components/ZjIcon.vue';

const tools = [
  {
    icon: 'notebook-pen',
    name: '情绪日记',
    desc: '每日记录情绪变化，追踪心理状态',
    url: '/pages/homework/mood',
    bg: 'linear-gradient(140deg, #62A090 0%, #4A8A7A 100%)'
  },
  {
    icon: 'brain',
    name: '认知记录表（CBT）',
    desc: '识别并重构负性自动想法',
    url: '/pages/homework/cbt',
    bg: 'linear-gradient(140deg, #4E8898 0%, #3A6E80 100%)'
  },
  {
    icon: 'moon',
    name: '梦的工作记录',
    desc: '记录梦境、自由联想与治疗师解释',
    url: '/pages/homework/dream',
    bg: 'linear-gradient(140deg, #6E5A8A 0%, #5A4A7A 100%)'
  },
  {
    icon: 'mountain',
    name: '冰山模型自我分析',
    desc: '探索规条背后的感受、期待与渴望',
    url: '/pages/homework/iceberg',
    bg: 'linear-gradient(140deg, #3E6E8A 0%, #2A5A7A 100%)'
  },
  {
    icon: 'scroll',
    name: '规条转换练习',
    desc: '将刚性规条改写为有弹性的生活原则',
    url: '/pages/homework/rule',
    bg: 'linear-gradient(140deg, #8E5E4E 0%, #7A4A3A 100%)'
  }
];

function nav(url) { uni.navigateTo({ url }); }
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F5F7F6;
  padding-bottom: 80rpx;
}

/* ---- Hero ---- */
.hero {
  position: relative;
  padding: 96rpx 48rpx 80rpx;
  overflow: hidden;
  background: $zj-gradient-header;
}

.hero-glow {
  position: absolute;
  top: -160rpx;
  right: -120rpx;
  width: 560rpx;
  height: 480rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, transparent 66%);
  pointer-events: none;
}

.hero-blob {
  position: absolute;
  bottom: -80rpx;
  left: -60rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.68);
  margin-bottom: 28rpx;
}

.hero-title {
  display: block;
  font-size: 66rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 0.06em;
  line-height: 1.18;
  margin-bottom: 24rpx;
  font-family: "Noto Serif SC", serif;
}

.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.80);
  line-height: 1.9;
  letter-spacing: 0.03em;
}

/* ---- Tool Cards ---- */
.tools-wrap {
  padding: 40rpx 28rpx 0;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.tool-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 26rpx;
  box-shadow: 0 4rpx 20rpx rgba(28,42,39,0.06);
  border: 1rpx solid #EDF2F0;

  &:active {
    transform: scale(0.985);
  }
}

.icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.icon-shine {
  position: absolute;
  top: -24rpx;
  left: -16rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.20);
  pointer-events: none;
}

.icon-text {
  width: 48rpx;
  position: relative;
  z-index: 1;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  display: block;
  font-size: 29rpx;
  font-weight: 700;
  color: #1C2A27;
  letter-spacing: 0.02em;
  margin-bottom: 8rpx;
  font-family: "Noto Serif SC", serif;
}

.desc {
  display: block;
  font-size: 23rpx;
  color: #7A9E97;
  line-height: 1.55;
}

.arrow-wrap {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #F0F6F4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.arrow {
  font-size: 34rpx;
  color: #4A8A7A;
  font-weight: 300;
  line-height: 1;
}

</style>
