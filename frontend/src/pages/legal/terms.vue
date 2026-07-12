<template>
  <view class="page">
    <scroll-view class="content-scroll" scroll-y :style="{ height: scrollH }">
    <view class="content">
      <text class="doc-title">用户服务协议</text>
      <text class="update-date">版本日期：2026年7月1日　生效日期：2026年7月1日</text>

      <text class="preamble">
        欢迎使用卓见心理平台。本协议由你（"用户"）与卓见心理平台运营主体（"本平台"）订立，
        具有法律约束力，请在使用前仔细阅读。点击"同意"或使用本平台服务，即视为你已充分理解并接受本协议全部条款。
      </text>

      <text class="section-title">一、平台性质与服务范围</text>
      <text class="body">1.1 本平台提供心理健康自助工具、OH卡牌探索、心理测评及在线心理咨询预约等服务。</text>
      <text class="body">1.2 本平台所有内容仅供个人成长参考，<text class="em">不构成医疗诊断、临床治疗建议或处方</text>。本平台不是医疗机构，不提供精神科诊疗服务。</text>
      <text class="body">1.3 若你正在经历严重心理危机或紧急精神科状况，请立即联系专业机构或拨打急救电话，不得以本平台服务替代紧急救援。</text>

      <text class="section-title">二、用户资格与账户</text>
      <text class="body">2.1 使用本平台须满足以下条件：</text>
      <text class="body indent">（1）年满16周岁；</text>
      <text class="body indent">（2）具有完全民事行为能力，或由法定监护人代为同意本协议；</text>
      <text class="body indent">（3）注册信息真实、准确、完整。</text>
      <text class="body">2.2 不满14周岁的未成年人禁止注册及使用本平台。14周岁以上不满16周岁的未成年人，须在法定监护人明确书面同意后方可注册，本平台将在注册流程中向监护人单独获取同意。</text>
      <text class="body">2.3 如有精神科诊断或正在接受精神科药物治疗，使用本平台前请咨询主治医生，本平台内容不得替代专业医疗意见。</text>
      <text class="body">2.4 你有责任保管账户密码安全，因密码泄露导致的损失由你自行承担。如发现账户被盗用，请立即联系本平台。</text>

      <text class="section-title">三、敏感个人信息的处理</text>
      <text class="body">3.1 你在本平台填写或产生的情绪记录、CBT练习内容、梦境分析、冰山模型练习、心理测评答案及结果等，依据《个人信息保护法》第28条属于<text class="em">敏感个人信息</text>，受到更高级别的保护。</text>
      <text class="body">3.2 本平台将在你首次使用相关功能前，通过弹窗或单独页面的形式，向你单独获取对上述敏感个人信息处理的明示同意（区别于本协议的一般同意）。</text>
      <text class="body">3.3 你的敏感个人信息仅用于以下目的：提供本平台功能服务；经你明确授权，向你选择的咨询师共享必要背景；匿名聚合的产品改进分析（不涉及个人识别）。</text>
      <text class="body">3.4 本平台不向任何第三方出售你的敏感个人信息。以下情形除外：</text>
      <text class="body indent">（1）依法配合司法机关、公安机关的书面调查要求；</text>
      <text class="body indent">（2）本平台合理判断你或他人存在<text class="em">紧急人身安全风险</text>时，向相关专业机构或紧急联系人披露必要信息，并在事后及时告知你。</text>
      <text class="body">3.5 你有权随时向本平台申请查阅、更正或删除你的敏感个人信息，并可撤回授权同意。撤回后，本平台将停止处理相关信息，但不影响撤回前已完成的合法处理行为。</text>

      <text class="section-title">四、咨询服务条款</text>
      <text class="body">4.1 <text class="em">咨询师资质</text>：本平台要求所有入驻咨询师持有国家认可的心理咨询师执照或相关专业资质，并在入驻时进行资质核验。本平台定期复查资质有效性，如发现资质造假，将立即下架并向相关机构举报。</text>
      <text class="body">4.2 <text class="em">平台责任</text>：本平台作为咨询预约服务平台，依法承担平台经营者的相应责任。若因咨询师的原因导致用户合法权益受损，用户可向本平台投诉，本平台将先行处理并保留向相关咨询师追偿的权利。</text>
      <text class="body">4.3 <text class="em">退款规则</text>：
        咨询开始前48小时以上取消：全额退款；
        咨询开始前24-48小时取消：退款50%；
        咨询开始前24小时内取消：不予退款；
        咨询师爽约或单方终止咨询：全额退款并补偿等额代金券。
        退款将在5个工作日内原路返回。</text>
      <text class="body">4.4 咨询关系存在于用户与咨询师之间，平台不干预咨询内容，但有权对违规行为进行处置。</text>

      <text class="section-title">六、知识产权</text>
      <text class="body">6.1 本平台享有平台软件、OH卡牌图像、心理测评量表、文章、视频等内容的知识产权。未经本平台书面授权，不得复制、传播、商业使用。</text>
      <text class="body">6.2 <text class="em">用户内容归属用户本人</text>。你在本平台填写的情绪记录、CBT练习、梦境分析等内容的著作权归你所有。本平台仅获得在提供服务所必要范围内使用上述内容的有限授权，不得将你的个人内容用于商业变现或对外披露。</text>
      <text class="body">6.3 如需将本平台内容用于科研等非商业目的，须事先获得本平台书面同意，并对用户数据进行完全匿名化处理。</text>

      <text class="section-title">七、账户注销与数据删除</text>
      <text class="body">7.1 你可随时在"设置-账户"中申请注销账户。本平台将在收到申请后15个工作日内完成注销。</text>
      <text class="body">7.2 账户注销后，本平台将删除你的个人信息及内容数据，法律法规要求保留的除外（如支付记录须依法保留5年）。</text>
      <text class="body">7.3 注销前，已预约且未完成的咨询须先行处理（完成、取消并退款）。</text>

      <text class="section-title">八、协议变更</text>
      <text class="body">8.1 本平台有权根据法律法规变化或业务调整修订本协议。</text>
      <text class="body">8.2 <text class="em">重大变更</text>（包括但不限于数据处理方式、用户权利、收费标准的变化）将提前<text class="em">15日</text>通过站内通知、短信或邮件方式告知你，并请你重新确认。</text>
      <text class="body">8.3 若你不接受变更后的协议，可在生效前申请注销账户。变更生效后继续使用，视为接受新版本协议。</text>

      <text class="section-title">九、争议解决</text>
      <text class="body">9.1 本协议适用中华人民共和国法律。</text>
      <text class="body">9.2 如双方产生争议，应首先友好协商解决。协商不成的，任一方均可向本平台注册地有管辖权的人民法院提起诉讼。</text>
      <text class="body">9.3 本平台建立投诉处理机制，承诺在收到用户投诉后<text class="em">5个工作日</text>内给予书面回复，复杂问题不超过15个工作日。</text>

      <text class="section-title">十、其他</text>
      <text class="body">10.1 本平台运营主体依法持有互联网信息服务许可证，备案号：<text class="em">苏ICP备2026043098号</text>。用户数据存储于中国境内服务器，符合《数据安全法》及《个人信息保护法》关于数据本地化的要求。</text>
      <text class="body">10.2 本协议任何条款被认定无效或不可执行时，不影响其他条款的效力。</text>
      <text class="body">10.3 如有疑问或需行使数据权利，请发送邮件至平台客服邮箱：<text class="em">345958875@qq.com</text>，或通过"关于我们"页面联系我们。</text>

    </view>
    </scroll-view>

    <!-- 签署区域：在 scroll-view 外，始终固定在底部 -->
    <view v-if="store.isLoggedIn() && !signed" class="sign-bar">
      <text class="sign-tip">阅读并同意以上协议内容</text>
      <text class="sign-btn" @click="signTerms()">同意并签署</text>
    </view>
    <view v-else-if="signed" class="signed-bar">
      <text class="signed-text">✅ 已签署 · {{fmtDate(store.user.termsAcceptedAt)}}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '../../store/user';
import { authApi } from '../../api/index';

// 微信小程序 scroll-view 必须有明确的 height，flex:1 无效
// 根据是否显示 sign-bar 动态计算可滚动区域高度
const scrollH = ref('100vh');
onMounted(() => {
  const { windowHeight } = uni.getSystemInfoSync();
  // sign-bar 约 160rpx，但此时 signed 可能还没算出来，先用全高
  // 有 sign-bar 时父容器 flex 布局会把底部撑开，scroll-view 用 100% 仍然无效
  // 最简单方案：动态减去已知固定高度
  const hasSignBar = store.isLoggedIn() && !signed.value;
  // sign-bar padding(24+24)rpx + button(78rpx) + gap(12rpx) ≈ 138rpx ≈ windowWidth/750*138
  const signBarPx = hasSignBar ? Math.ceil(windowHeight * 138 / (uni.getSystemInfoSync().windowWidth / 750 * 750)) : 0;
  scrollH.value = (windowHeight - signBarPx) + 'px';
});


const store = useUserStore();
const signed = computed(() => !!store.user?.termsAcceptedAt);

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

async function signTerms() {
  try {
    const r = await authApi.updateProfile({ termsAcceptedAt: new Date().toISOString() });
    Object.assign(store.user, r.user);
    uni.setStorageSync('user', JSON.stringify(store.user));
    uni.showToast({ title: '签署成功' });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch {
    uni.showToast({ title: '签署失败，请重试', icon: 'none' });
  }
}
</script>

<style scoped lang="scss">
/* 整页 flex 纵向布局，scroll 区弹性填充剩余高度 */
.page {
  height: 100vh;
  display: flex; flex-direction: column;
  background: #F5F7F6;
}
.content-scroll {
  /* 高度由 JS 动态注入（小程序 scroll-view 必须有明确的 px 高度） */
}
.content { padding: 32rpx 32rpx 40rpx; }

.doc-title {
  display: block;
  font-size: 40rpx; font-weight: 800; color: #1C2A27;
  margin-bottom: 12rpx; letter-spacing: -0.5rpx;
}
.update-date { display: block; font-size: 22rpx; color: #9BBCB4; margin-bottom: 24rpx; }
.preamble {
  display: block;
  font-size: 24rpx; color: #617870; line-height: 1.8;
  background: #EDF7F4; border-radius: 16rpx; padding: 24rpx;
  margin-bottom: 8rpx;
}

.section-title {
  display: block;
  font-size: 28rpx; font-weight: 800; color: #1C2A27;
  margin: 36rpx 0 14rpx;
  padding-left: 14rpx;
  border-left: 6rpx solid #4A8A7A;
}
.body {
  display: block;
  font-size: 26rpx; color: #555; line-height: 1.85;
  margin-bottom: 12rpx;
}
.indent { padding-left: 24rpx; }

/* 签署栏：flex-shrink:0 保证始终可见，不随内容滚动 */
.sign-bar {
  flex-shrink: 0;
  background: #fff; padding: 24rpx 32rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0,0,0,.06);
  display: flex; flex-direction: column; gap: 12rpx; align-items: center;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom, 0px));
}
.sign-tip { font-size: 22rpx; color: #9BBCB4; }
.sign-btn {
  width: 100%; background: #4A8A7A; color: #fff;
  text-align: center; font-size: 30rpx; font-weight: 700;
  padding: 24rpx 0; border-radius: 16rpx;
}
.signed-bar {
  flex-shrink: 0;
  padding: 24rpx 32rpx; text-align: center;
  background: #EDF7F4;
}
.signed-text { font-size: 24rpx; color: #4A8A7A; }
</style>