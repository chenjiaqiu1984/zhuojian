import { SERVER } from '../config';
const BASE_URL = `${SERVER}/api`;

function getToken() { return uni.getStorageSync('token') || ''; }

// 401 跳转登录：多个接口同时 401 时只跳一次；reLaunch 在微信开发者工具里偶发
// timeout，失败后回退到 navigateTo 再试一次，避免跳转失败卡在空白页。
let redirectingToLogin = false;
function redirectToLogin() {
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  uni.removeStorageSync('token');
  uni.removeStorageSync('user');
  const done = () => { redirectingToLogin = false; };
  uni.reLaunch({
    url: '/pages/login/index',
    success: done,
    fail: () => {
      // reLaunch 超时/失败兜底：换用 navigateTo 再试
      uni.navigateTo({ url: '/pages/login/index', complete: done });
    },
  });
}

async function request(method, path, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${path}`, method, data,
      header: { Authorization: `Bearer ${getToken()}` },
      success: res => {
        if (res.statusCode === 401) {
          redirectToLogin();
          return reject({ __authRedirect: true });
        }
        res.statusCode >= 400 ? reject(res.data) : resolve(res.data);
      },
      fail: err => reject(err)
    });
  });
}
const get = (p, d) => request('GET', p, d);
const post = (p, d) => request('POST', p, d);
const put = (p, d) => request('PUT', p, d);
const del = (p) => request('DELETE', p);

export const authApi = {
  login: d => post('/auth/login', d),
  register: d => post('/auth/register', d),
  getCaptcha: () => get('/auth/captcha'),
  sendSms: (phone, captchaToken, captchaAnswer) => post('/auth/send-sms', { phone, captchaToken, captchaAnswer }),
  loginPhone: (phone, code, rememberMe) => post('/auth/login-phone', { phone, code, rememberMe }),
  loginWechat: code => post('/auth/login-wechat', { code }),
  loginPhoneWechat: (code, loginCode) => post('/auth/login-phone-wechat', { code, loginCode }),
  loginQQ: access_token => post('/auth/login-qq', { access_token }),
  updateProfile: d => put('/auth/profile', d),
  sendBindSms: (phone, captchaToken, captchaAnswer) => post('/auth/send-bind-sms', { phone, captchaToken, captchaAnswer }),
  bindPhone: (phone, code) => post('/auth/bind-phone', { phone, code }),
  sendChangePhone: (phone, captchaToken, captchaAnswer) => post('/auth/send-change-phone', { phone, captchaToken, captchaAnswer }),
  changePhone: (phone, code) => post('/auth/change-phone', { phone, code }),
  changePassword: (oldPassword, newPassword) => put('/auth/password', { oldPassword, newPassword }),
  completeSetup: d => put('/auth/complete-setup', d),
  sendReset: (target, captchaToken, captchaAnswer) => post('/auth/send-reset', { target, captchaToken, captchaAnswer }),
  resetPassword: (target, code, newPassword) => post('/auth/reset-password', { target, code, newPassword })
};

export const aboutApi = {
  get: () => get('/about'),
  update: d => put('/about', d)
};

export const consultantApi = {
  list: () => get('/consultants'),
  get: id => get(`/consultants/${id}`),
  myConsultant: () => get('/consultants/my'),
  getWeekSlots: id => get(`/consultants/${id}/week-slots`),
  create: d => post('/consultants', d),
  update: (id, d) => put(`/consultants/${id}`, d),
  delete: id => del(`/consultants/${id}`),
  addSlots: (id, slots) => post(`/consultants/${id}/slots`, { slots }),
  deleteSlot: slotId => del(`/consultants/slots/${slotId}`),
  applyTemplate: id => post(`/consultants/${id}/apply-template`)
};

export const newsApi = {
  list: p => get('/news', p),
  favorites: () => get('/news/favorites'),
  get: id => get(`/news/${id}`),
  like: id => post(`/news/${id}/like`),
  favorite: id => post(`/news/${id}/favorite`),
  create: d => post('/news', d),
  update: (id, d) => put(`/news/${id}`, d),
  delete: id => del(`/news/${id}`),
  getComments: id => get(`/news/${id}/comments`),
  addComment: (id, content) => post(`/news/${id}/comment`, { content }),
  replyComment: (commentId, content) => post(`/news/comments/${commentId}/reply`, { content }),
  deleteComment: id => del(`/news/comments/${id}`),
};

export const bookingApi = {
  list: () => get('/booking'),
  create: d => post('/booking', d),
  updateStatus: (id, d) => put(`/booking/${id}/status`, d),
  reschedule: (id, d) => put(`/booking/${id}/reschedule`, d),
  delete: id => del(`/booking/${id}`)
};

export const paymentApi = {
  createBookingOrder:    (bookingId, d) => post(`/payment/booking/${bookingId}`, d),
  createH5Order:         (bookingId, d) => post(`/payment/h5/${bookingId}`, d),
  createAlipayOrder:     (bookingId, d) => post(`/payment/alipay/${bookingId}`, d),
  createNativeOrder:     (bookingId, d) => post(`/payment/native/${bookingId}`, d),
  createAlipayPcOrder:   (bookingId, d) => post(`/payment/alipay-pc/${bookingId}`, d),
  createActivityOrder:   (newsId, d)    => post(`/payment/activity/${newsId}`, d),
  queryOrder:            orderNo        => get(`/payment/order/${orderNo}`),
  syncAlipayReturn:      (orderNo, d)   => post(`/payment/sync-return/${orderNo}`, d),
  listOrders:            ()             => get(`/payment/orders`),
  deleteOrder:           orderNo        => del(`/payment/order/${orderNo}`),
  refund:                (orderNo, d)   => post(`/payment/refund/${orderNo}`, d),
};

export const couponApi = {
  my:        ()          => get('/coupons/my'),
  available: amount      => get('/coupons/available', { amount }),
  activity:  ()          => get('/coupons/activity'),
  claim:     code        => post('/coupons/claim', { code }),
  // admin
  list:      ()          => get('/coupons'),
  create:    d           => post('/coupons', d),
  update:    (id, d)     => put(`/coupons/${id}`, d),
  remove:    id          => del(`/coupons/${id}`),
  send:      (id, d)     => post(`/coupons/${id}/send`, d),
  users:     id          => get(`/coupons/${id}/users`),
};

export const packageApi = {
  list:          ()              => get('/packages'),
  my:            ()              => get('/packages/my'),
  buy:           (id, d)         => post(`/packages/${id}/buy`, d),
  use:           (userPkgId, d)  => post(`/packages/use/${userPkgId}`, d),
  // admin
  create:        d               => post('/packages', d),
  update:        (id, d)         => put(`/packages/${id}`, d),
  remove:        id              => del(`/packages/${id}`),
  grant:         d               => post('/packages/grant', d),
  // 咨询师折扣率（复用 consultantApi.update）
  setDiscount:   (id, rate)      => put(`/consultants/${id}`, { discountRate: rate }),
};

export const assessmentApi = {
  getScales: () => get('/assessment/scales'),
  getScale: id => get(`/assessment/scales/${id}`),
  submit: d => post('/assessment/submit', d),
  checkAccess: scaleId => get(`/assessment/check-access/${scaleId}`),
  getResults: () => get('/assessment/results'),
  getResult: id => get(`/assessment/results/${id}`),
  redeemVoucher: d => post('/assessment/voucher/redeem', d),
  myAvailable: () => get('/assessment/my-available'),
  myVouchers: () => get('/assessment/my-vouchers'),
  adminGetScales: () => get('/assessment/admin/scales'),
  adminUpdateScale: (id, d) => request('PATCH', `/assessment/admin/scales/${id}`, d),
  adminGetVouchers: () => get('/assessment/admin/vouchers'),
  adminCreateVouchers: d => post('/assessment/admin/vouchers', d),
  pushSearch: phone => get('/assessment/push-search', { phone }),
  pushToUser: d => post('/assessment/push', d),
  trackScale: id => post(`/assessment/track/${id}`, {}),
  getFavorites: () => get('/assessment/favorites'),
  toggleFavorite: id => post(`/assessment/favorite/${id}`, {}),
};

export const ohcardApi = {
  categories: () => get('/ohcard/categories'),
  cards: p => get('/ohcard/cards', p),
  createCategory: d => post('/ohcard/categories', d),
  deleteCard: id => del(`/ohcard/cards/${id}`),
  records: () => get('/ohcard/records'),
  saveRecord: d => post('/ohcard/records', d),
  updateRecord: (id, d) => put(`/ohcard/records/${id}`, d),
  presets: (type) => get('/ohcard/presets', { type })
};

export const homeworkApi = {
  moodList: () => get('/homework/mood'),
  moodCreate: d => post('/homework/mood', d),
  moodDel: id => del(`/homework/mood/${id}`),
  cbtList: () => get('/homework/cbt'),
  cbtCreate: d => post('/homework/cbt', d),
  cbtUpdate: (id, d) => put(`/homework/cbt/${id}`, d),
  cbtDel: id => del(`/homework/cbt/${id}`),
  dreamList: () => get('/homework/dream'),
  dreamCreate: d => post('/homework/dream', d),
  dreamUpdate: (id, d) => put(`/homework/dream/${id}`, d),
  dreamDel: id => del(`/homework/dream/${id}`),
  icebergList: () => get('/homework/iceberg'),
  icebergCreate: d => post('/homework/iceberg', d),
  icebergUpdate: (id, d) => put(`/homework/iceberg/${id}`, d),
  icebergDel: id => del(`/homework/iceberg/${id}`),
  helpList: () => get('/homework/help'),
  helpCreate: d => post('/homework/help', d),
  ruleList: () => get('/homework/rule'),
  ruleCreate: d => post('/homework/rule', d),
  ruleUpdate: (id, d) => put(`/homework/rule/${id}`, d),
  ruleDel: id => del(`/homework/rule/${id}`),
};

export const monsterApi = {
  list: () => get('/monster'),
  create: d => post('/monster', d),
  detail: id => get(`/monster/${id}`),
  update: (id, d) => put(`/monster/${id}`, d),
  del: id => del(`/monster/${id}`),
  feed: (id, d) => post(`/monster/${id}/feed`, d),
};

export const mandalaApi = {
  list: () => get('/mandala'),
  create: d => post('/mandala', d),
  detail: id => get(`/mandala/${id}`),
  del: id => del(`/mandala/${id}`),
};
