const prisma = require('../config/db');

async function requireWebAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  const user = await prisma.users.findUnique({ where: { id: req.session.userId } });
  if (!user || !user.isActive) {
    req.session.destroy(() => {
      res.clearCookie('sid');
      return res.redirect('/login?error=Account disabled');
    });
    return;
  }
  next();
}

function requireWebRole(roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.userRole)) {
      return res.redirect('/');
    }
    next();
  };
}

function requireApiAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireApiRole(roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  requireWebAuth,
  requireWebRole,
  requireApiAuth,
  requireApiRole
};
