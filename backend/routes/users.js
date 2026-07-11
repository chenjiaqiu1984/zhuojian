const router = require('express').Router();
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

const ROLE_MAP = { '超级管理员': 'super_admin', '管理员': 'admin', '咨询师': 'consultant', '普通用户': 'user' };
const VALID_ROLES = ['user', 'consultant', 'admin', 'super_admin'];
const SENSITIVE_ROLES = ['admin', 'super_admin'];

// GET /api/users/admin/list?q=&page=1&pageSize=20
router.get('/admin/list', ...requireRole('admin', 'super_admin'), async (req, res) => {
  const { q = '', page = 1, pageSize = 20 } = req.query;
  const where = q.trim() ? {
    OR: [
      { name: { contains: q.trim() } },
      { phone: { contains: q.trim() } },
      { username: { contains: q.trim() } }
    ]
  } : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, username: true, name: true, phone: true, role: true, createdAt: true },
      orderBy: { id: 'desc' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize)
    })
  ]);
  res.json({ total, users: users.map(u => ({ ...u, role: ROLE_MAP[u.role] || u.role })) });
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

module.exports = router;
