export function createDemoCaptcha(now = Date.now()) {
  const digits = crypto.getRandomValues(new Uint8Array(4));
  const answer = Array.from(digits, (n) => String(n % 10)).join('');
  const letters = Array.from(
    answer,
    (c, i) =>
      `<text x="${16 + i * 26}" y="34" transform="rotate(${i % 2 ? 9 : -8} ${16 + i * 26} 30)" fill="${i % 2 ? '#765ad0' : '#255a83'}">${c}</text>`,
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="126" height="48" viewBox="0 0 126 48"><rect width="126" height="48" rx="6" fill="#edf2fc"/><path d="M3 13L122 37M4 40L123 9M8 24L118 20" stroke="#b4bee1" fill="none"/><g font-family="Arial,sans-serif" font-size="28" font-weight="bold">${letters}</g></svg>`;
  return {
    id: crypto.randomUUID(),
    answer,
    image: 'data:image/svg+xml;base64,' + btoa(svg),
    expiresAt: now + 120000,
    used: false,
  };
}
export function verifyDemoCaptcha(challenge, code, now = Date.now()) {
  if (!challenge || challenge.used) throw Error('请刷新验证码后重试。');
  challenge.used = true;
  if (now >= challenge.expiresAt) throw Error('验证码已过期，请刷新后重试。');
  if (String(code || '').trim() !== challenge.answer) throw Error('验证码不正确，请重新输入。');
  return true;
}
