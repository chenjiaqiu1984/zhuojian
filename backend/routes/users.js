const router = require('express').Router();
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

const ROLE_MAP = { '超级管理员': 'super_admin', '管理员': 'admin', '咨询师': 'consultant', '普通用户': 'user' };
const VALID_ROLES = ['user', 'consultant', 'admin', 'super_admin'];
const SENSITIVE_ROLES = ['admin', 'super_admin'];
const VALID_STATUSES = ['active', 'pending', 'suspended'];

// GET /api/users/admin/list?q=&page=1&pageSize=20&status=pending
router.get('/admin/list', ...requireRole('admin', 'super_admin'), async (req, res) => {
  const { q = '', page = 1, pageSize = 20, status = '' } = req.query;
  const conditions = [];
  if (q.trim()) {
    conditions.push({ OR: [
      { name: { contains: q.trim() } },
      { phone: { contains: q.trim() } },
      { username: { contains: q.trim() } }
    ]});
  }
  if (status === 'pending')    conditions.push({ status: 'pending' });
  else if (status === 'active')     conditions.push({ status: 'active' });
  else if (status === 'suspended')  conditions.push({ status: 'suspended' });
  const where = conditions.length ? (conditions.length === 1 ? conditions[0] : { AND: conditions }) : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, username: true, name: true, phone: true, role: true, status: true, createdAt: true },
      orderBy: { id: 'desc' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize)
    })
  ]);
  res.json({ total, users: users.map(u => ({ ...u, role: ROLE_MAP[u.role] || u.role, status: u.status || 'active' })) });
});

// PATCH /api/users/admin/:id/role
router.patch('/admin/:id/role', ...requireRole('admin', 'super_admin'), async (req, res) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: '无效角色' });

  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: '不能修改自己的角色' });

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const targetRole = ROLE_MAP[target.role] || target.role;

  const isSuperAdmin = req.user.role === 'super_admin';
  if (!isSuperAdmin && (SENSITIVE_ROLES.includes(role) || SENSITIVE_ROLES.includes(targetRole))) {
    return res.status(403).json({ error: '只有超级管理员才能管理管理员角色' });
  }

  const updated = await prisma.user.update({ where: { id: targetId }, data: { role } });
  res.json({ id: updated.id, role: updated.role });
});

// PATCH /api/users/admin/:id/status — 修改账号状态（active / suspended）
// pending 由用户自己完善信息后自动解除，管理员可将异常账号恢复为 active 或封禁为 suspended
router.patch('/admin/:id/status', ...requireRole('admin', 'super_admin'), async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: '无效状态' });

  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: '不能修改自己的状态' });

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
  if (!target) return res.status(404).json({ error: '用户不存在' });

  const isSuperAdmin = req.user.role === 'super_admin';
  const targetRole = ROLE_MAP[target.role] || target.role;
  if (!isSuperAdmin && SENSITIVE_ROLES.includes(targetRole)) {
    return res.status(403).json({ error: '只有超级管理员才能修改管理员账号状态' });
  }

  await prisma.user.update({ where: { id: targetId }, data: { status } });
  res.json({ ok: true, status });
});

// DELETE /api/users/admin/:id — 删除用户（级联删除所有关联数据）
router.delete('/admin/:id', ...requireRole('admin', 'super_admin'), async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: '不能删除自己' });

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
  if (!target) return res.status(404).json({ error: '用户不存在' });

  const isSuperAdmin = req.user.role === 'super_admin';
  const targetRole = ROLE_MAP[target.role] || target.role;
  if (!isSuperAdmin && SENSITIVE_ROLES.includes(targetRole)) {
    return res.status(403).json({ error: '只有超级管理员才能删除管理员账号' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. 测评答题明细（依赖 AssessmentResult）
      const resultIds = (await tx.assessmentResult.findMany({ where: { userId: targetId }, select: { id: true } })).map(r => r.id);
      if (resultIds.length) await tx.assessmentAnswer.deleteMany({ where: { resultId: { in: resultIds } } });

      // 2. 测评相关
      await tx.assessmentResult.deleteMany({ where: { userId: targetId } });
      await tx.assessmentProgress.deleteMany({ where: { userId: targetId } });
      await tx.assessmentFavorite.deleteMany({ where: { userId: targetId } });

      // 3. 订单（依赖 Booking / UserPackage / UserCoupon，需先删）
      await tx.order.deleteMany({ where: { userId: targetId } });

      // 4. 释放该用户占用的预约时间槽
      const bookingSlots = await tx.booking.findMany({
        where: { userId: targetId },
        select: { slotId: true, secondSlotId: true }
      });
      const slotIds = bookingSlots.flatMap(b => [b.slotId, b.secondSlotId].filter(Boolean));
      if (slotIds.length) await tx.timeSlot.updateMany({ where: { id: { in: slotIds } }, data: { isBooked: 0 } });
      await tx.booking.deleteMany({ where: { userId: targetId } });

      // 5. 套餐 / 优惠券
      await tx.userPackage.deleteMany({ where: { userId: targetId } });
      await tx.userCoupon.deleteMany({ where: { userId: targetId } });

      // 6. 作业记录
      await tx.moodEntry.deleteMany({ where: { userId: targetId } });
      await tx.cbtRecord.deleteMany({ where: { userId: targetId } });
      await tx.dreamRecord.deleteMany({ where: { userId: targetId } });
      await tx.icebergRecord.deleteMany({ where: { userId: targetId } });
      await tx.homeworkHelp.deleteMany({ where: { userId: targetId } });
      await tx.ruleRecord.deleteMany({ where: { userId: targetId } });

      // 7. 其他
      await tx.ohCardRecord.deleteMany({ where: { userId: targetId } });
      await tx.newsLike.deleteMany({ where: { userId: targetId } });
      await tx.newsFavorite.deleteMany({ where: { userId: targetId } });
      await tx.newsComment.deleteMany({ where: { userId: targetId } });
      await tx.eventLog.deleteMany({ where: { userId: targetId } });

      // 8. 咨询师档案（如果有）
      await tx.consultant.deleteMany({ where: { userId: targetId } });

      // 9. 最后删用户
      await tx.user.delete({ where: { id: targetId } });
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[delete user]', e);
    res.status(500).json({ error: '删除失败：' + (e.message || '未知错误') });
  }
});

module.exports = router;
