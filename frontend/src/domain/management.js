const shared = [
  { id: 'dashboard', label: '运营概览', icon: 'chart' },
  { id: 'stations', label: '站点管理', icon: 'system' },
  { id: 'devices', label: '设备与插座', icon: 'device' },
  { id: 'rates', label: '计费管理', icon: 'rule' },
  { id: 'orders', label: '充电订单', icon: 'order' },
  { id: 'reports', label: '故障报修', icon: 'edit' },
  { id: 'operations', label: '设备告警', icon: 'chart' },
];

export function managementNavigation(role) {
  if (!['ADMIN', 'OPERATOR_ADMIN', 'OPERATOR'].includes(role)) return [];
  const platform = role === 'ADMIN';
  const menu = shared.map(item => ({ ...item }));
  menu[0].label = platform ? '平台概览' : '运营概览';
  if (platform) {
    menu.splice(1, 0, { id: 'operators', label: '运营商管理', icon: 'system' });
    menu.splice(6, 0, { id: 'users', label: '平台用户', icon: 'user' });
  } else {
    menu.splice(5, 0, { id: 'serviceUsers', label: '服务用户', icon: 'user' });
  }
  menu.push({ id: 'statistics', label: platform ? '统计分析' : '经营统计', icon: 'chart' });
  if (platform) menu.push({ id: 'audit', label: '操作日志', icon: 'rule' });
  if (role === 'OPERATOR_ADMIN') menu.push({ id: 'team', label: '团队账号', icon: 'user' });
  return menu;
}

export const managementPages = new Set(['operators', 'serviceUsers', 'team', 'statistics', 'audit']);

export function csvDocument(rows) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n');
}

export function downloadCsv(filename, rows) {
  const url = URL.createObjectURL(new Blob([csvDocument(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const displayTime = value => value ? String(value).replace('T', ' ').slice(0, 19) : '—';
export const decimal = value => Number(value || 0).toFixed(2);
