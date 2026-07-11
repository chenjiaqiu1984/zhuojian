<template>
  <view class="about">
    <image v-if="about.banner_image" class="banner" :src="about.banner_image" mode="aspectFill" />
    <view v-else class="banner-fallback">
      <text class="brand-name">卓见心理·艺术疗愈</text>
      <text class="slogan">在创造中，遇见真实的自己</text>
    </view>

    <!-- 什么是艺术疗愈 -->
    <view class="section">
      <view class="section-tag">我们的故事</view>
      <text class="section-title">开启心灵的旅程</text>
      <text class="body-text">忙碌的工作、内卷的生活、快节奏的都市，让压力和焦虑接踵而至。人们常常忽视自己的情绪，缺乏合理的情绪出口。</text>
      <view class="card-box">
        <text class="card-heading">什么是艺术疗愈？</text>
        <text class="body-text">横跨艺术与心理两大领域，参与者在艺术创作过程中实现自我表达。艺术疗愈师通过创作过程及作品，帮助参与者解析内在问题，达到理解情感冲突、增加自我意识、减压等目的。</text>
        <view class="tag-row">
          <text class="pill">无年龄限制</text>
          <text class="pill">过程重于结果</text>
          <text class="pill">情绪得以释放</text>
        </view>
      </view>
    </view>

    <!-- 团队 -->
    <view class="section section-dark">
      <view class="section-tag light">我们是谁</view>
      <text class="section-title light">专业团队</text>
      <text class="body-text light">由国家级心理咨询师、体验式培训师、团建策划设计师共同组建。核心成员拥有多年实战经验，服务过企业、IT、地产、金融、教育、互联网等多领域机构。</text>
    </view>

    <!-- 疗愈形式 -->
    <view class="section">
      <view class="section-tag">疗愈形式</view>
      <text class="section-title">在色彩与创造中，与自我深度对话</text>
      <view class="healing-list">
        <view class="healing-card" v-for="h in healings" :key="h.name">
          <view class="healing-body">
            <view class="healing-header-row">
              <text class="heal-icon">{{h.icon}}</text>
              <text class="healing-name">{{h.name}}</text>
              <text class="healing-tag">{{h.tag}}</text>
            </view>
            <text class="healing-desc">{{h.desc}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 重点项目 -->
    <view class="section">
      <view class="section-tag">重点项目</view>
      <text class="section-title">心理团辅 & 亲子沙龙</text>
      <view class="project-list">
        <view class="project-card-v2" v-for="p in projects" :key="p.title">
          <view class="project-body">
            <text class="project-title-v2">{{p.title}}</text>
            <text class="project-desc">{{p.desc}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 更多服务 -->
    <view class="section">
      <view class="section-tag">服务体系</view>
      <text class="section-title">全方位心理支持</text>
      <view class="service-card-list">
        <view class="service-card-v2" v-for="s in services" :key="s.title">
          <view class="service-body">
            <view class="service-color-bar" :style="{background: s.color}" />
            <text class="service-title-v2">{{s.title}}</text>
            <text class="service-desc-v2">{{s.desc}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 疗愈课程 -->
    <view class="section section-green">
      <view class="section-tag light">疗愈课程</view>
      <text class="section-title light">多元技术深度疗愈</text>
      <view class="course-row">
        <view class="course-item" v-for="c in courses" :key="c">
          <text class="course-text">{{c}}</text>
        </view>
      </view>
    </view>

    <!-- 三大使命 -->
    <view class="section">
      <view class="section-tag">核心理念</view>
      <text class="section-title">我们的信念</text>
      <view class="mission-card" v-for="m in missions" :key="m.role">
        <text class="mission-role">{{m.role}}</text>
        <text class="mission-desc">{{m.desc}}</text>
      </view>
    </view>

    <!-- 结尾 -->
    <view class="footer-block">
      <text class="footer-quote">创造，即疗愈</text>
      <text class="footer-sub">每一次心灵的探索，都值得被珍视</text>
      <text class="footer-sub">相信每个人都有自我疗愈的智慧</text>
      <view class="contact-row">
        <text class="contact-item">客服邮箱：345958875@qq.com</text>
        <text class="contact-item">小程序开发联系：553997877@qq.com</text>
      </view>
      <view class="icp-row">
        <text class="icp-text" @click="openIcp()">苏ICP备2026043098号</text>
        <view class="beian-row" @click="openBeian()">
          <image class="beian-icon" src="/static/beian.png" mode="aspectFit" />
          <text class="icp-text">苏公网安备32010402002563号</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import {ref, onMounted, watch } from 'vue';
import { aboutApi } from '../../api/index';


const about = ref({});

const healings = [
  { icon: '🌀', name: '冥想曼陀罗', tag: '手工疗愈',    desc: '以圆形几何为载体，在重复的涂色与绘制中进入专注状态。曼陀罗的对称美感能平息内心的杂念，让大脑从高压中短暂抽离，体验深层放松。' },
  { icon: '🌸', name: '扭扭棒花束', tag: '手工疗愈',    desc: '用细腻的手指动作将彩色棒弯折成花朵，专注于每一个细节的塑造。创作过程中的触觉反馈与色彩搭配，能有效舒缓焦虑，带来完成一件事的满足感。' },
  { icon: '🎨', name: '绘画疗法',   tag: '非语言表达', desc: '无需绘画基础，以颜色、线条和形状代替语言，将内心深处难以言说的情感外化于画布。绘画过程本身就是疗愈，作品揭示心灵真实的语言。' },
  { icon: '🃏', name: '心理图卡疗法', tag: '潜意识探索', desc: '运用OH卡等系列投射性图卡，通过随机抽取图片激活潜意识联想。卡片上的图像成为自我对话的媒介，帮助探索隐藏的情绪模式与内在资源。' },
  { icon: '🏖️', name: '沙盘游戏',   tag: '意象表达',   desc: '在沙盘中自由摆放各类微缩模型，创造出内心世界的立体映像。这种三维的象征性表达，能触及语言无法抵达的深层体验，特别适合不善言辞的来访者。' },
  { icon: '🎭', name: '心理剧',     tag: '角色扮演',   desc: '在安全的小组环境中将内心冲突搬上舞台，通过扮演不同角色获得新视角。心理剧能帮助重新体验与整合过去的经历，实现情感的宣泄与修复。' },
];

const projects = [
  { title: '💬 心理团辅', desc: '营造安全的小团体环境，让参与者感受温暖与陪伴。通过分享故事、互相倾听，从他人经历中获得新视角，有效缓解孤独感与压力，重新建立内心的连结。' },
  { title: '👨‍👩‍👧 亲子沙龙', desc: '以亲子共绘、互动游戏等创意形式开展，搭建亲子沟通的情感桥梁。在轻松愉快的氛围中打破沟通障碍，帮助父母更好地理解孩子的内心世界，构建更紧密的亲子关系。' },
];

const services = [
  { title: '心理专业学历提升', desc: '联合优质院校，提供系统化心理学课程（本科至研究生），线上线下结合，助力专业成长。', color: '#4A8A7A' },
  { title: 'EAP企业员工援助', desc: '为企业定制压力管理、情绪疏导、讲座、咨询等服务，提升团队凝聚力与工作幸福感。', color: '#3A6E80' },
  { title: '家庭教育培训', desc: '聚焦家长教育理念更新与孩子行为引导，提升家庭养育质量，建立更健康的亲子互动模式。', color: '#5A7A9A' },
  { title: '特色亲子活动', desc: '儿童财商之旅、农事体验、荒野求生、小昆虫大世界等主题活动，在玩耍中激发潜能。', color: '#6A8A6A' },
];

const courses = ['心理图卡潜意识探索', '沙盘游戏', '催眠治疗', '绘画疗法', '心理剧', '亲子关系修复', '职场压力应对', '焦虑缓解'];

const missions = [
  { role: '🔗 专业与艺术的连接者', desc: '融合严谨心理学与多元艺术形式，让专业知识通过艺术更好地发挥作用' },
  { role: '🛡️ 安全与接纳的守护者', desc: '打造绝对保密、无评判的疗愈空间，让人们安心面对情绪与问题' },
  { role: '🌱 个人成长的陪伴者', desc: '不止于解决问题，更致力于赋能内在成长，帮助人们遇见更好的自己' },
];

onMounted(async () => {
  try { about.value = await aboutApi.get(); } catch {}
});

function openIcp() {
  // #ifdef H5
  window.open('https://beian.miit.gov.cn/', '_blank');
  // #endif
  // #ifndef H5
  uni.navigateTo({ url: '/pages/webview/index?url=' + encodeURIComponent('https://beian.miit.gov.cn/') });
  // #endif
}

function openBeian() {
  const url = 'https://beian.mps.gov.cn/portal/registerSystemInfo?recordcode=32010402002563';
  // #ifdef H5
  window.open(url, '_blank');
  // #endif
  // #ifndef H5
  uni.navigateTo({ url: '/pages/webview/index?url=' + encodeURIComponent(url) });
  // #endif
}
</script>

<style scoped lang="scss">
.about { min-height: 100vh; background: #F5F7F6; }
.banner { width: 100%; height: 320rpx; }
.banner-fallback {
  height: 320rpx; background: linear-gradient(135deg, #2a4a3e, #3A6E80);
  display: flex; flex-direction: column; justify-content: flex-end; padding: 40rpx;
}
.brand-name { color: #fff; font-size: 44rpx; font-weight: 700; display: block; }
.slogan { color: rgba(255,255,255,.75); font-size: 26rpx; margin-top: 10rpx; display: block; letter-spacing: 2rpx; }

.section { padding: 40rpx 32rpx 8rpx; }
.section-dark { background: #2a4a3e; }
.section-green { background: linear-gradient(135deg, #4A8A7A, #3A6E80); }
.section-tag { display: inline-block; font-size: 22rpx; color: #4A8A7A; background: #EDF4F0; padding: 6rpx 18rpx; border-radius: 20rpx; margin-bottom: 12rpx; }
.section-tag.light { color: #a8d8c8; background: rgba(255,255,255,.15); }
.section-title { font-size: 36rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 16rpx; }
.section-title.light { color: #fff; }
.body-text { font-size: 27rpx; color: #617870; line-height: 1.8; display: block; margin-bottom: 16rpx; }
.body-text.light { color: rgba(255,255,255,.85); }

.card-box { background: #fff; border-radius: 20rpx; padding: 28rpx; margin: 8rpx 0 24rpx; }
.card-heading { font-size: 30rpx; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 12rpx; }
.tag-row { display: flex; gap: 12rpx; flex-wrap: wrap; margin-top: 16rpx; }
.pill { font-size: 22rpx; color: #4A8A7A; background: #EDF4F0; padding: 6rpx 18rpx; border-radius: 20rpx; }

/* ── 疗愈形式卡 ── */
.healing-list { display: flex; flex-direction: column; gap: 16rpx; margin: 16rpx 0 24rpx; }
.healing-card { background: #fff; border-radius: 24rpx; padding: 28rpx; }
.heal-icon { font-size: 40rpx; flex-shrink: 0; }
.healing-body {}
.healing-header-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.healing-name { font-size: 30rpx; font-weight: 700; color: #1C2A27; flex: 1; }
.healing-tag { font-size: 20rpx; color: #4A8A7A; background: #EDF7F4; padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; }
.healing-desc { font-size: 25rpx; color: #617870; line-height: 1.8; }

/* ── 重点项目卡 ── */
.project-list { display: flex; flex-direction: column; gap: 16rpx; margin: 16rpx 0 24rpx; }
.project-card-v2 { background: #fff; border-radius: 24rpx; padding: 28rpx; }
.project-body {}
.project-title-v2 { font-size: 32rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 12rpx; }
.project-desc { font-size: 25rpx; color: #617870; line-height: 1.8; display: block; }

/* ── 服务体系卡 ── */
.service-card-list { display: flex; flex-direction: column; gap: 16rpx; margin: 16rpx 0 24rpx; }
.service-card-v2 { background: #fff; border-radius: 24rpx; padding: 28rpx; }
.service-body { display: flex; flex-direction: column; gap: 8rpx; }
.service-color-bar { width: 40rpx; height: 6rpx; border-radius: 3rpx; margin-bottom: 4rpx; }
.service-title-v2 { font-size: 28rpx; font-weight: 700; color: #1C2A27; }
.service-desc-v2 { font-size: 24rpx; color: #617870; line-height: 1.7; }

.course-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin: 16rpx 0 32rpx; }
.course-item { background: rgba(255,255,255,.2); border-radius: 20rpx; padding: 8rpx 22rpx; }
.course-text { font-size: 24rpx; color: #fff; }

.mission-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.mission-role { font-size: 28rpx; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 8rpx; }
.mission-desc { font-size: 25rpx; color: #617870; line-height: 1.7; display: block; }

.footer-block { background: #2a4a3e; padding: 48rpx 32rpx; margin-top: 16rpx; text-align: center; }
.footer-quote { font-size: 40rpx; font-weight: 700; color: #fff; display: block; margin-bottom: 20rpx; letter-spacing: 4rpx; }
.footer-sub { font-size: 26rpx; color: rgba(255,255,255,.7); display: block; margin-bottom: 8rpx; line-height: 1.8; }
.icp-row { margin-top: 24rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(255,255,255,.15); }
.icp-text { font-size: 22rpx; color: rgba(255,255,255,.5); }
.contact-row { margin-top: 24rpx; display: flex; flex-direction: column; gap: 10rpx; }
.contact-item { font-size: 22rpx; color: rgba(255,255,255,.6); }
.beian-row { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-top: 12rpx; }
.beian-icon { width: 28rpx; height: 28rpx; flex-shrink: 0; }
</style>
