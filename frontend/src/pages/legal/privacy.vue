<template>
  <scroll-view class="page" scroll-y>
    <view class="content">
      <text class="update-date">最后更新：2026年7月</text>

      <text class="section-title">一、我们收集哪些信息</text>
      <text class="body">注册时：手机号或邮箱、用户名、密码（加密存储）。</text>
      <text class="body">使用中：情绪记录、CBT练习内容、梦境分析、冰山模型、规则修改练习、心理测评答案与结果、OH卡牌使用记录、预约与咨询记录。</text>
      <text class="body">设备信息：操作系统版本、设备型号、IP地址（仅用于安全验证，不作画像分析）。</text>

      <text class="section-title">二、我们如何使用这些信息</text>
      <text class="body indent">• 提供并优化平台功能；</text>
      <text class="body indent">• 向你匹配合适的咨询师；</text>
      <text class="body indent">• 在你授权的情况下，让咨询师查看你的相关记录；</text>
      <text class="body indent">• 发送预约提醒等服务通知；</text>
      <text class="body indent">• 统计分析平台使用情况（匿名汇总，不涉及个人识别）。</text>

      <text class="section-title">三、心理数据的特别保护</text>
      <text class="body">你的情绪记录、测评结果等心理健康数据属于敏感个人信息，我们采取以下措施保护：</text>
      <text class="body indent">• 数据传输全程 HTTPS 加密；</text>
      <text class="body indent">• 数据库加密存储；</text>
      <text class="body indent">• 仅你本人和你明确授权的咨询师可查看明细；</text>
      <text class="body indent">• 不用于广告投放或商业画像。</text>

      <text class="section-title">四、信息共享</text>
      <text class="body">我们不出售你的个人信息。以下情形可能涉及信息共享：</text>
      <text class="body indent">• 你预约咨询师时，咨询师可查看你提交的相关背景信息；</text>
      <text class="body indent">• 法律法规要求的情形（如配合司法调查）；</text>
      <text class="body indent">• 紧急安全情形（合理判断存在人身安全威胁时）。</text>

      <text class="section-title">五、数据保留与删除</text>
      <text class="body">你可以随时在"设置 → 账户"中删除个人记录或注销账号。注销后数据将在30天内彻底删除（法律强制保留的除外）。</text>

      <text class="section-title">六、未成年人</text>
      <text class="body">14岁以下用户请勿使用本平台。14-16岁用户请在监护人知情同意下使用。</text>

      <text class="section-title">七、Cookie 与跟踪</text>
      <text class="body">H5版本使用 localStorage 存储登录状态，不使用第三方跟踪 Cookie。小程序端使用微信官方存储机制。</text>

      <text class="section-title">八、隐私政策变更</text>
      <text class="body">如有重大变更，我们将在平台内公告通知，并在你下次登录时请求重新确认。</text>

      <text class="section-title">九、联系我们</text>
      <text class="body">如需行使数据访问、更正、删除权利，或对隐私政策有疑问，请通过"关于我们"页面联系我们。</text>
    </view>
  </scroll-view>
</template>

<script setup>
</script>

<style scoped lang="scss">
.page { height: 100vh; background: #F5F7F6; }
.content { padding: 32rpx; }
.update-date { display: block; font-size: 24rpx; color: #aaa; margin-bottom: 32rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #1C2A27; margin: 32rpx 0 12rpx; }
.body { display: block; font-size: 26rpx; color: #555; line-height: 1.8; margin-bottom: 12rpx; }
.indent { padding-left: 24rpx; }
</style>
