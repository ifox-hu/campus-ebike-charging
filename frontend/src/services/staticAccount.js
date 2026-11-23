// Public demonstration adapter. It provides no authentication or server access.
// Demo credentials are public UI simulation only, never a security boundary.
// No password is persisted or sent to a server; settings belong to this browser.
import { validateAvatar } from './avatar.js';
export const STATIC_DEMO_ACCOUNT = Object.freeze({
  username: 'demo',
  password: 'demo123',
  displayName: '演示管理员',
  label: '平台管理员',
  role: 'ADMIN',
});
export const STATIC_DEMO_ACCOUNTS = Object.freeze([
  STATIC_DEMO_ACCOUNT,
  Object.freeze({
    username: 'demo_campus',
    password: 'demo123',
    displayName: '校园运营商管理员',
    label: '校园运营商',
    role: 'OPERATOR_ADMIN',
    operatorId: 'campus',
  }),
  Object.freeze({
    username: 'demo_hospital',
    password: 'demo123',
    displayName: '医院运营商管理员',
    label: '医院运营商',
    role: 'OPERATOR_ADMIN',
    operatorId: 'hospital',
  }),
]);
const key = 'campus-charging-pages-settings-v1',
  sessionKey = 'campus-charging-pages-session-v1';
export function createStaticAccountRequest({
  storage,
  sessionStorage,
  now = () => new Date().toISOString(),
}) {
  const unauthorized = (message) => Object.assign(Error(message), { status: 401 });
  const findAccount = (username) =>
    STATIC_DEMO_ACCOUNTS.find((candidate) => candidate.username === username);
  const storageKey = (username) =>
    username === STATIC_DEMO_ACCOUNT.username ? key : `${key}:${username}`;
  function load(account) {
    const identity = {
      id: account.operatorId ? 'public-' + account.username : 'public-demo',
      username: account.username,
      role: account.role,
      operatorId: account.operatorId,
    };
    const state = {
      profile: {
        ...identity,
        displayName: account.displayName,
        avatar: '',
        email: '',
        phone: '',
        bio: '',
        preferences: { fontSize: 'normal', density: 'comfortable' },
        updatedAt: now(),
      },
      readKeys: [],
    };
    try {
      const saved = JSON.parse(storage.getItem(storageKey(account.username)) || 'null');
      if (saved?.profile?.username === account.username && Array.isArray(saved.readKeys)) {
        state.profile = { ...state.profile, ...saved.profile, ...identity };
        state.readKeys = saved.readKeys.filter((v) => typeof v === 'string');
      }
    } catch {}
    try {
      state.profile.avatar = validateAvatar(state.profile.avatar || '');
    } catch {
      state.profile.avatar = '';
    }
    return state;
  }
  let state;
  try {
    const restored = sessionStorage?.getItem(sessionKey);
    const account = findAccount(restored === 'active' ? 'demo' : restored);
    if (account) state = load(account);
  } catch {}
  const save = () => {
    state.profile.updatedAt = now();
    storage.setItem(storageKey(state.profile.username), JSON.stringify(state));
  };
  const response = (data, message = '公开演示操作已完成') => ({
    data: JSON.parse(JSON.stringify(data)),
    message,
  });
  return async (path, { method = 'GET', body = {} } = {}) => {
    if (path === '/auth/login' && method === 'POST') {
      const account = findAccount(body.username);
      if (!account || body.password !== account.password)
        throw unauthorized('演示账号或密码不正确，请使用页面提示的演示账号。');
      state = load(account);
      try {
        sessionStorage?.setItem(sessionKey, account.username);
      } catch {}
      return response(state.profile, '已登录公开演示');
    }
    if (path === '/auth/logout' && method === 'POST') {
      state = undefined;
      try {
        sessionStorage?.removeItem(sessionKey);
      } catch {}
      return response(null, '已退出公开演示');
    }
    if (!state) throw unauthorized('请先登录公开演示。');
    if (path === '/auth/me') return response(state.profile);
    if (path === '/account/password') throw Error('公开演示没有真实账号，不提供修改密码功能。');
    if (path === '/account/profile' && method === 'PUT') {
      const name = String(body.displayName || '').trim();
      if (!name || name.length > 60) throw Error('显示名称须为 1～60 个字符。');
      const avatar = body.avatar === undefined ? state.profile.avatar : validateAvatar(body.avatar);
      const previous = { ...state.profile };
      for (const field of ['email', 'phone', 'bio'])
        state.profile[field] = String(body[field] || '').slice(0, field === 'bio' ? 300 : 160);
      state.profile.displayName = name;
      state.profile.avatar = avatar;
      try {
        save();
      } catch {
        state.profile = previous;
        throw Error('个人资料保存失败，浏览器存储空间可能不足，请缩小头像后重试。');
      }
      return response(state.profile);
    }
    if (path === '/account/preferences' && method === 'PUT') {
      if (
        !['normal', 'large', 'xlarge'].includes(body.fontSize) ||
        !['comfortable', 'compact'].includes(body.density)
      )
        throw Error('显示设置不受支持。');
      state.profile.preferences = { fontSize: body.fontSize, density: body.density };
      save();
      return response(state.profile);
    }
    if (path === '/notifications/read-state') {
      if (method === 'POST') {
        state.readKeys = [
          ...new Set([
            ...state.readKeys,
            ...(body.keys || []).filter((v) => typeof v === 'string'),
          ]),
        ].slice(-2000);
        save();
      }
      return response(state.readKeys);
    }
    throw Error('公开演示不支持此接口。');
  };
}
