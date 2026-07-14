<template>
  <view v-if="notFound" style="padding:80rpx;text-align:center;color:#999;font-size:28rpx">内容已下线或不存在</view>
  <view class="page" v-else-if="news">
    <view v-if="news.videoUrl" class="video-wrap">
      <video class="video" :src="news.videoUrl" controls />
    </view>
    <view class="body">
      <text class="title">{{news.title}}</text>
      <view class="meta-row">
        <u-tag :text="news.type === 'activity' ? '活动' : news.type === 'psychology' ? '心理科普' : '新闻'" :type="news.type === 'activity' ? 'success' : news.type === 'psychology' ? 'warning' : 'primary'" size="mini" />
        <text class="date">{{fmt(news.createdAt)}}</text>
        <text v-if="news.author" class="author">{{news.author}}</text>
      </view>
      <view class="content">
        <!-- #ifdef H5 -->
        <view v-html="safeContent" />
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <mp-html :content="safeContent" :tag-style="mpHtmlTagStyle" scroll-table selectable />
        <!-- #endif -->
      </view>
    </view>

    <view class="action-bar">
      <view class="action-btn" @click="toggleLike()">
        <u-icon :name="news.isLiked ? 'thumb-up-fill' : 'thumb-up'" :color="news.isLiked ? '#4A8A7A' : '#999'" size="44" />
        <text :class="['action-label', news.isLiked && 'active']">{{news.likeCount || 0}}</text>
      </view>
      <view class="action-btn" @click="toggleFavorite()">
        <u-icon :name="news.isFavorited ? 'star-fill' : 'star'" :color="news.isFavorited ? '#E6A23C' : '#999'" size="44" />
        <text :class="['action-label', news.isFavorited && 'active-fav']">{{news.favoriteCount || 0}}</text>
      </view>
      <view class="action-btn" @click="share()">
        <u-icon name="share" color="#999" size="44" />
        <text class="action-label">转发</text>
      </view>
    </view>

    <view class="comment-section" :class="{ 'comment-section--with-reg': isActivity && !isExpired }">
      <text class="section-title">留言</text>
      <view class="comment-input-row">
        <input class="comment-input" v-model="commentText" placeholder="写下你的留言..." />
        <text class="send-btn" @click="submitComment()">发送</text>
      </view>
      <view class="comment-list">
        <view class="comment-item" v-for="c in comments" :key="c.id" :class="{ reply: c.parentId }">
          <view class="comment-meta">
            <text class="comment-who">{{c.parentId ? '管理员回复' : '我'}}</text>
            <text class="comment-time">{{fmt(c.createdAt)}}</text>
            <text class="del-btn" v-if="!c.parentId" @click="delComment(c.id)">删除</text>
          </view>
          <text class="comment-content">{{c.content}}</text>
        </view>
      </view>
    </view>

    <view v-if="isActivity && !isExpired" class="reg-bar">
      <view class="reg-info">
        <text v-if="news.price > 0" class="reg-price">¥{{ (news.price / 100).toFixed(2) }}</text>
        <text v-else class="reg-price reg-price--free">免费</text>
        <text class="reg-label">活动报名</text>
      </view>
      <view class="reg-btn" @click="registerActivity()">
        <text class="reg-btn-txt">立即报名</text>
      </view>
    </view>
  </view>
  <u-loading-page :loading="loading" />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import DOMPurify from 'dompurify';
import { newsApi } from '../../api/index';
// #ifndef H5
import mpHtml from '@/components/mp-html/mp-html.vue';
// #endif


const loading = ref(true);
const news = ref(null);
const notFound = ref(false);
const comments = ref([]);
const commentText = ref('');
let newsId = null;

function processHtml(html) {
  let result = html;

  // img：清除固定宽高属性，注入内联样式实现等比缩放（mini-program 的 rich-text 只认内联样式）
  result = result.replace(/<img\b([^>]*?)(\s*\/?>)/gi, (_, attrs, end) => {
    let a = attrs
      .replace(/\s+width=["'][^"']*["']/gi, '')
      .replace(/\s+height=["'][^"']*["']/gi, '');
    if (/\bstyle=/i.test(a)) {
      a = a.replace(/\bstyle=(["'])([^"']*)\1/i, (__, q, s) => {
        const cleaned = s
          .replace(/\bwidth\s*:\s*[^;]+;?\s*/gi, '')
          .replace(/\bheight\s*:\s*[^;]+;?\s*/gi, '');
        return `style=${q}max-width:100%;width:100%;height:auto;display:block;${cleaned}${q}`;
      });
    } else {
      a += ' style="max-width:100%;width:100%;height:auto;display:block"';
    }
    return `<img${a}${end}`;
  });

  // 其他元素内联 style 里的固定像素宽度
  result = result
    .replace(/\bwidth\s*:\s*\d+(?:\.\d+)?px\b/gi, 'max-width:100%')
    .replace(/\bmin-width\s*:\s*\d+(?:\.\d+)?px\b/gi, '');

  // table 套横向滚动容器，合并已有 style 避免重复属性
  result = result.replace(/<table(\b[^>]*?)>/gi, (_, attrs) => {
    const baseStyle = 'width:100%;word-break:break-all;';
    if (/\bstyle=/i.test(attrs)) {
      attrs = attrs.replace(/\bstyle=(["'])([^"']*)\1/i, (__, q, s) => `style=${q}${baseStyle}${s}${q}`);
    } else {
      attrs += ` style="${baseStyle}"`;
    }
    return `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table${attrs}>`;
  });
  result = result.replace(/<\/table>/gi, '</table></div>');

  return result;
}

const safeContent = computed(() => {
  if (!news.value?.content) return '';
  // #ifdef H5
  return processHtml(DOMPurify.sanitize(news.value.content, { USE_PROFILES: { html: true } }));
  // #endif
  // #ifndef H5
  return processHtml(news.value.content);
  // #endif
});

const isActivity = computed(() => news.value?.type === 'activity');

// #ifndef H5
const mpHtmlTagStyle = {
  p:          'margin:8px 0;line-height:1.8;font-size:15px;color:#444;',
  h1:         'font-size:22px;font-weight:bold;margin:16px 0 8px;color:#1C2A27;line-height:1.4;',
  h2:         'font-size:19px;font-weight:bold;margin:14px 0 7px;color:#1C2A27;line-height:1.4;',
  h3:         'font-size:17px;font-weight:bold;margin:12px 0 6px;color:#333;line-height:1.4;',
  h4:         'font-size:15px;font-weight:bold;margin:10px 0 5px;color:#333;',
  ul:         'padding-left:20px;margin:8px 0;',
  ol:         'padding-left:20px;margin:8px 0;',
  li:         'margin:4px 0;line-height:1.8;font-size:15px;color:#444;',
  blockquote: 'border-left:3px solid #4A8A7A;margin:12px 0;padding:8px 16px;background:#f0f7f5;color:#555;',
  pre:        'background:#f5f5f5;border-radius:4px;padding:12px;overflow-x:auto;margin:8px 0;',
  code:       'background:#f0f0f0;padding:1px 4px;border-radius:2px;font-size:13px;font-family:monospace;',
  a:          'color:#4A8A7A;text-decoration:underline;',
  td:         'border:1px solid #ddd;padding:6px;text-align:left;word-break:break-all;',
  th:         'border:1px solid #ddd;padding:6px;background:#f5f5f5;font-weight:bold;',
  hr:         'border:none;border-top:1px solid #e0e0e0;margin:16px 0;',
};
// #endif
const isExpired = computed(() => {
  const d = news.value?.endDate;
  return d ? new Date(d) < new Date() : false;
});

onMounted(async () => {
  const pages = getCurrentPages();
  newsId = pages[pages.length - 1]?.options?.id;
  if (!newsId) {
    // #ifdef H5
    const hash = window.location.hash;
    const q = hash.indexOf('?');
    if (q !== -1) newsId = new URLSearchParams(hash.slice(q + 1)).get('id');
    // #endif
  }
  try {
    news.value = await newsApi.get(newsId);
    loadComments();
  } catch {
    notFound.value = true;
  } finally { loading.value = false; }
});

async function loadComments() {
  try { comments.value = await newsApi.getComments(newsId); } catch {}
}

function fmt(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }

async function toggleLike() {
  try {
    const r = await newsApi.like(news.value.id);
    news.value.isLiked = r.isLiked; news.value.likeCount = r.likeCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

async function toggleFavorite() {
  try {
    const r = await newsApi.favorite(news.value.id);
    news.value.isFavorited = r.isFavorited; news.value.favoriteCount = r.favoriteCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

function share() {
  // #ifdef H5
  const url = `${window.location.origin}${window.location.pathname}#/pages/news/detail?id=${newsId}`;
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) });
  // #endif
  // #ifndef H5
  uni.showShareMenu({ withShareTicket: true });
  // #endif
}

async function submitComment() {
  const text = commentText.value.trim();
  if (!text) return;
  if (text.length > 500) return uni.showToast({ title: '留言不超过500字', icon: 'none' });
  try {
    await newsApi.addComment(newsId, text);
    commentText.value = '';
    loadComments();
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

async function delComment(id) {
  try { await newsApi.deleteComment(id); loadComments(); } catch {}
}

function registerActivity() {
  if (!news.value.price || news.value.price <= 0) {
    // 免费活动：直接报名，不走支付
    try {
      const key = 'registeredActivities';
      const id = Number(newsId);
      const ids = JSON.parse(uni.getStorageSync(key) || '[]');
      if (!ids.includes(id)) {
        ids.push(id);
        uni.setStorageSync(key, JSON.stringify(ids));
      }
    } catch {}
    uni.showToast({ title: '报名成功', icon: 'success' });
    return;
  }
  const title = encodeURIComponent(news.value.title);
  const endDate = news.value.endDate ? encodeURIComponent(news.value.endDate) : '';
  uni.navigateTo({ url: `/pages/payment/index?newsId=${newsId}&activityName=${title}&amount=${news.value.price}&endDate=${endDate}` });
}
</script>

<style scoped lang="scss">
.cover { width: 100%; height: 350rpx; }
.video-wrap { padding: 24rpx; background: #000; }
.video { width: 100%; height: 400rpx; }
.body { padding: 32rpx; padding-bottom: 0; }
.title { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 16rpx; }
.meta-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.date, .author { font-size: 24rpx; color: #999; }
.content { font-size: 28rpx; color: #444; line-height: 1.8; overflow-x: auto; word-break: break-word; }
.content :deep(p) { margin: 8px 0; }
.content :deep(h1) { font-size: 44rpx; font-weight: bold; margin: 24rpx 0 12rpx; color: #1C2A27; }
.content :deep(h2) { font-size: 38rpx; font-weight: bold; margin: 20rpx 0 10rpx; color: #1C2A27; }
.content :deep(h3) { font-size: 34rpx; font-weight: bold; margin: 16rpx 0 8rpx; color: #1C2A27; }
.content :deep(h4), .content :deep(h5), .content :deep(h6) { font-size: 30rpx; font-weight: bold; margin: 12rpx 0 6rpx; color: #333; }
.content :deep(ul), .content :deep(ol) { padding-left: 40rpx; margin: 8rpx 0; }
.content :deep(li) { margin: 4rpx 0; }
.content :deep(ul li) { list-style-type: disc; }
.content :deep(ol li) { list-style-type: decimal; }
.content :deep(blockquote) { border-left: 6rpx solid #4A8A7A; margin: 16rpx 0; padding: 12rpx 24rpx; background: #f0f7f5; color: #555; }
.content :deep(pre) { background: #f5f5f5; border-radius: 8rpx; padding: 20rpx; overflow-x: auto; margin: 12rpx 0; }
.content :deep(code) { font-family: monospace; background: #f0f0f0; padding: 2rpx 8rpx; border-radius: 4rpx; font-size: 26rpx; }
.content :deep(pre code) { background: transparent; padding: 0; }
.content :deep(a) { color: #4A8A7A; text-decoration: underline; }
.content :deep(strong), .content :deep(b) { font-weight: bold; }
.content :deep(em), .content :deep(i) { font-style: italic; }
.content :deep(hr) { border: none; border-top: 1rpx solid #e0e0e0; margin: 24rpx 0; }
.content :deep(img) { max-width: 100% !important; width: auto !important; height: auto !important; display: block; margin: 8rpx 0; }
.content :deep(table) { border-collapse: collapse; width: 100%; min-width: 400rpx; }
.content :deep(td), .content :deep(th) { border: 1px solid #ddd; padding: 8px; text-align: left; word-break: normal; }
.content :deep(th) { background: #f5f5f5; font-weight: bold; }
.content :deep(iframe), .content :deep(video) { max-width: 100%; }
.action-bar { display: flex; gap: 48rpx; justify-content: center; padding: 32rpx; border-top: 1rpx solid #f0f0f0; margin-top: 32rpx; }
.action-btn { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.action-label { font-size: 24rpx; color: #999; }
.active { color: #4A8A7A; }
.active-fav { color: #E6A23C; }
.comment-section { padding: 32rpx; border-top: 1rpx solid #f0f0f0; }
.comment-section--with-reg { padding-bottom: 180rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 20rpx; }
.comment-input-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.comment-input { flex: 1; border: 1rpx solid #e0e0e0; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; }
.send-btn { background: #4A8A7A; color: #fff; border-radius: 12rpx; padding: 16rpx 28rpx; font-size: 26rpx; white-space: nowrap; }
.comment-item { padding: 20rpx; background: #f9f9f9; border-radius: 12rpx; margin-bottom: 16rpx; }
.comment-item.reply { background: #eef6f4; margin-left: 32rpx; }
.comment-meta { display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; }
.comment-who { font-size: 24rpx; font-weight: 600; color: #4A8A7A; }
.comment-time { font-size: 22rpx; color: #999; flex: 1; }
.del-btn { font-size: 22rpx; color: #f56c6c; }
.comment-content { font-size: 26rpx; color: #444; line-height: 1.6; display: block; }

.reg-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-top: 1rpx solid #e8edeb;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4rpx 24rpx rgba(28,42,39,0.08);
  z-index: 100;
}
.reg-info { display: flex; flex-direction: column; gap: 4rpx; }
.reg-price { font-size: 40rpx; font-weight: 800; color: #1C2A27; }
.reg-price--free { font-size: 32rpx; color: #4A8A7A; }
.reg-label { font-size: 22rpx; color: #9BBCB4; }
.reg-btn {
  background: linear-gradient(135deg, #1F5448 0%, #4A8A7A 100%);
  border-radius: 48rpx;
  padding: 24rpx 72rpx;
  &:active { opacity: 0.85; }
}
.reg-btn-txt { font-size: 30rpx; font-weight: 700; color: #fff; letter-spacing: 2rpx; }
</style>
