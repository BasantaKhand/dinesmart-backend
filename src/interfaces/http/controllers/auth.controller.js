const di = require('../../../config/di');

const COOKIE_NAME = process.env.COOKIE_NAME || 'token';

const getCookieOptions = (overrides = {}) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  ...overrides,
});

exports.login = async (req, res, next) => {
  try {
    const result = await di.authUseCases.login(req.body);
    res.cookie(COOKIE_NAME, result.token, getCookieOptions({ maxAge: 24 * 60 * 60 * 1000 }));
    res.status(200).json({ success: true, data: { user: result.user, token: result.token } });
  } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
  try {
    await di.authUseCases.logout(req.user);
    res.cookie(COOKIE_NAME, 'none', getCookieOptions({ expires: new Date(0) }));
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await di.authUseCases.getMe(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await di.authUseCases.updateProfile({ userId: req.user.id, ...req.body });
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await di.authUseCases.forgotPassword(req.body);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) { next(error); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await di.authUseCases.resetPassword(req.body);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) { next(error); }
};
