import { activeStatuses, socketStatus, deviceStatus } from './service.js';

export function scopeDashboardSource(source = {}, operatorId = '') {
  const data = { ...source };
  for (const key of [
    'stations',
    'devices',
    'sockets',
    'orders',
    'reports',
    'users',
    'rows',
    'rates',
  ])
    data[key] = source[key] || [];
  if (!operatorId) return data;
  const stationIds = new Set(
    data.stations.filter((s) => String(s.operatorId) === String(operatorId)).map((s) => s.id),
  );
  const deviceIds = new Set(
    data.devices.filter((d) => stationIds.has(d.stationId)).map((d) => d.id),
  );
  const socketIds = new Set(data.sockets.filter((s) => deviceIds.has(s.deviceId)).map((s) => s.id));
  const owned = (row) =>
    row.operatorId
      ? String(row.operatorId) === String(operatorId)
      : stationIds.has(row.stationId) || socketIds.has(row.socketId);
  const orders = data.orders.filter(owned);
  const userIds = new Set(orders.map((o) => o.userId).filter(Boolean));
  const usernames = new Set(orders.map((o) => o.ownerUsername).filter(Boolean));
  return {
    ...data,
    stations: data.stations.filter((s) => stationIds.has(s.id)),
    devices: data.devices.filter((d) => deviceIds.has(d.id)),
    sockets: data.sockets.filter((s) => socketIds.has(s.id)),
    rows: data.rows.filter((r) => stationIds.has(r.stationId)),
    rates: data.rates.filter((r) => stationIds.has(r.stationId)),
    orders,
    reports: data.reports.filter(owned),
    users: data.users.filter((u) => userIds.has(u.id) || usernames.has(u.username || u.account)),
  };
}

export function buildDashboardView(source, operatorId = '') {
  const data = scopeDashboardSource(source, operatorId);
  const sockets = data.sockets.map((s) => {
    const device = data.devices.find((d) => d.id === s.deviceId),
      station = data.stations.find((st) => st.id === device?.stationId),
      order = s.businessId
        ? null
        : data.orders.find((o) => o.socketId === s.id && activeStatuses.includes(o.status));
    return { ...s, device, station, order, status: socketStatus(data, s) };
  });
  const devices = data.devices.map((d) => {
    const ports = sockets.filter((s) => s.deviceId === d.id),
      ended = data.orders.filter((o) => o.deviceId === d.id && o.status === 'ended');
    return {
      ...d,
      row: data.rows.find((r) => r.id === d.rowId),
      station: data.stations.find((s) => s.id === d.stationId),
      portCount: ports.length,
      free: ports.filter((s) => s.status === '空闲').length,
      starting: ports.filter((s) => s.status === '启动中').length,
      charging: ports.filter((s) => s.status === '充电中').length,
      abnormal: ports.filter((s) => s.status === '异常占用').length,
      faults: ports.filter((s) => s.fault).length,
      status: deviceStatus(data, d),
      amount: ended.reduce((n, o) => n + Number(o.total || 0), 0),
      energy: ended.reduce((n, o) => n + Number(o.energy || 0), 0),
      times: ended.length,
    };
  });
  const stations = data.stations.map((s) => {
    const ports = sockets.filter((p) => p.station?.id === s.id);
    return {
      ...s,
      rowCount: data.rows.filter((r) => r.stationId === s.id).length,
      deviceCount: devices.filter((d) => d.stationId === s.id).length,
      portCount: ports.length,
      free: ports.filter((p) => p.status === '空闲').length,
      charging: ports.filter((p) => p.status === '充电中').length,
      rate: data.rates.find((r) => r.stationId === s.id),
    };
  });
  const reports = data.reports.map((r) => ({
    ...r,
    user: data.users.find((u) => u.id === r.userId),
    socket: sockets.find((s) => s.id === r.socketId),
  }));
  return { data, sockets, devices, stations, reports };
}
