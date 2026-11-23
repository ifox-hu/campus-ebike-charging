import { DEMO_OPERATORS, addOperatorOwnership } from './operatorDemo.js';

const STORAGE_KEY = 'ebike-graduation-management-demo-v1';
const clone = (value) => JSON.parse(JSON.stringify(value));
const idOf = (value) => String(value?.id ?? value ?? '');
const timestamp = () => new Date().toISOString();
const round = (value) => Number(value.toFixed(2));
const sanitize = (value) =>
  value == null
    ? null
    : JSON.parse(
        JSON.stringify(value, (key, item) =>
          /password|token|secret|credential/i.test(key) ? '[已隐藏]' : item,
        ),
      );
const active = new Set(['starting', 'charging', 'abnormal']);
const emptyMetrics = () => ({
  orderCount: 0,
  energyKwh: 0,
  electricityFee: 0,
  serviceFee: 0,
  totalAmount: 0,
  paidAmount: 0,
  activeCount: 0,
  deviceCount: 0,
  onlineDeviceCount: 0,
  openRepairCount: 0,
});

function seedAuditExamples(metadata) {
  if (metadata.auditSeedVersion === 1) return false;
  // Anchor relative dates once, so opening a different account or returning tomorrow
  // never changes existing examples or adds a second batch. These do not replay edits.
  const firstExample = metadata.logs.find((row) => row.id === 'audit-demo-v1-campus-rate');
  const anchor =
    metadata.auditSeedDate ||
    firstExample?.createdAt?.slice(0, 10) ||
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const day = (offset) =>
    new Date(Date.parse(`${anchor}T12:00:00+08:00`) - offset * 86400000).toISOString().slice(0, 10);
  const examples = [
    [
      'campus-rate',
      'campus',
      'demo_campus',
      'OPERATOR_ADMIN',
      0,
      '10:15:00',
      'PUT',
      '/rates/ST01',
      '调整站点费率',
      { electricRate: 0.55, serviceRate: 0.05 },
      { electricRate: 0.6, serviceRate: 0.06 },
    ],
    [
      'hospital-device',
      'hospital',
      'demo_hospital',
      'OPERATOR_ADMIN',
      0,
      '09:40:00',
      'PATCH',
      '/devices/D-HOSPITAL-01/online',
      '恢复设备在线状态',
      { online: false },
      { online: true },
    ],
    [
      'platform-team',
      'platform',
      'demo',
      'ADMIN',
      0,
      '09:10:00',
      'POST',
      '/operators/platform/staff',
      '创建运营团队账号',
      null,
      { username: 'sample_platform_staff', role: 'OPERATOR', enabled: true },
    ],
    [
      'campus-repair',
      'campus',
      'demo_campus',
      'OPERATOR_ADMIN',
      1,
      '16:20:00',
      'PATCH',
      '/repairs/SAMPLE-CAMPUS-01',
      '处理插座报修',
      { status: 'pending' },
      { status: 'resolved', resolution: '已检查插座接触情况，记录示例处理结果。' },
    ],
    [
      'hospital-rate',
      'hospital',
      'demo_hospital',
      'OPERATOR_ADMIN',
      1,
      '14:30:00',
      'PUT',
      '/rates/ST07',
      '调整站点服务费',
      { electricRate: 0.6, serviceRate: 0.08 },
      { electricRate: 0.6, serviceRate: 0.06 },
    ],
    [
      'platform-owner',
      'platform',
      'demo',
      'ADMIN',
      1,
      '11:00:00',
      'PUT',
      '/operators/stations/SAMPLE-PLATFORM-01/owner',
      '分配站点运营归属',
      { operatorId: 'campus' },
      { operatorId: 'platform' },
    ],
    [
      'campus-device',
      'campus',
      'demo_campus',
      'OPERATOR_ADMIN',
      2,
      '15:10:00',
      'PATCH',
      '/devices/SAMPLE-CAMPUS-02/status',
      '恢复检修设备使用',
      { enabled: false },
      { enabled: true },
    ],
    [
      'hospital-repair',
      'hospital',
      'demo_hospital',
      'OPERATOR_ADMIN',
      2,
      '13:50:00',
      'PATCH',
      '/repairs/SAMPLE-HOSPITAL-01',
      '处理设备离线报修',
      { status: 'pending' },
      { status: 'resolved', resolution: '已核验通信状态并记录处理结果。' },
    ],
    [
      'campus-team',
      'campus',
      'demo_campus',
      'OPERATOR_ADMIN',
      2,
      '09:30:00',
      'POST',
      '/operators/campus/staff',
      '创建校园运营员账号',
      null,
      { username: 'sample_campus_staff', role: 'OPERATOR', enabled: true },
    ],
  ];
  const knownIds = new Set(metadata.logs.map((row) => row.id));
  for (const [
    key,
    operatorId,
    username,
    role,
    offset,
    time,
    method,
    path,
    action,
    beforeValue,
    afterValue,
  ] of examples) {
    const id = `audit-demo-v1-${key}`;
    if (!knownIds.has(id))
      metadata.logs.push({
        id,
        operatorId,
        username,
        role,
        method,
        path,
        statusCode: 200,
        createdAt: `${day(offset)}T${time}+08:00`,
        action: `${action}（示例）`,
        beforeValue,
        afterValue,
      });
  }
  metadata.logs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  metadata.auditSeedVersion = 1;
  metadata.auditSeedDate = anchor;
  return true;
}

/** Read current cooperation metadata without coupling the charging service to UI state. */
export function isDemoOperatorAcceptingOrders(operatorId, storage = globalThis.localStorage) {
  let operators = DEMO_OPERATORS;
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(saved?.operators)) operators = saved.operators;
  } catch {
    /* Use the known initial demo operators when storage is unavailable. */
  }
  const owner = operators.find((row) => row.id === String(operatorId || 'platform'));
  return Boolean(
    owner &&
    owner.enabled !== false &&
    (!owner.cooperationStatus || ['ACTIVE', '合作中'].includes(owner.cooperationStatus)),
  );
}

/** Local management metadata is shared by demo identities in this browser only. */
export function createDemoManagementClient({ getUser, getSource, onChanged = () => {} }) {
  let metadata = {
    sequence: 0,
    operators: DEMO_OPERATORS.map((row) => ({
      ...row,
      contactName: '',
      phone: '',
      enabled: true,
      cooperationStatus: 'ACTIVE',
    })),
    team: [
      {
        id: 'public-demo_campus',
        username: 'demo_campus',
        displayName: '校园运营商管理员',
        role: 'OPERATOR_ADMIN',
        operatorId: 'campus',
        enabled: true,
      },
      {
        id: 'public-demo_hospital',
        username: 'demo_hospital',
        displayName: '医院运营商管理员',
        role: 'OPERATOR_ADMIN',
        operatorId: 'hospital',
        enabled: true,
      },
    ],
    logs: [],
  };
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null');
    if (
      saved &&
      Number.isInteger(saved.sequence) &&
      ['operators', 'team', 'logs'].every((key) => Array.isArray(saved[key]))
    )
      metadata = saved;
  } catch {
    /* An unavailable browser store still permits an in-memory demo. */
  }
  if (seedAuditExamples(metadata)) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(metadata));
    } catch {
      /* Keep examples available in memory when browser persistence is unavailable. */
    }
  }
  let committedMetadata = clone(metadata);
  function actor() {
    const user = getUser();
    if (!user || !['ADMIN', 'OPERATOR_ADMIN', 'OPERATOR'].includes(user.role))
      throw Error('请先登录管理账号。');
    if (user.role !== 'ADMIN' && !user.operatorId) throw Error('当前账号未关联运营商。');
    return user;
  }
  function platform() {
    if (actor().role !== 'ADMIN') throw Error('仅平台管理员可执行此操作。');
  }
  function scope(operatorId = '') {
    const user = actor(),
      requested = idOf(operatorId);
    if (user.role !== 'ADMIN') {
      if (requested && requested !== String(user.operatorId))
        throw Error('不能访问其他运营商的数据。');
      return String(user.operatorId);
    }
    return requested;
  }
  function manager(operatorId) {
    const user = actor();
    if (user.role === 'OPERATOR') throw Error('仅管理员可管理团队。');
    return scope(operatorId);
  }
  function operator(value) {
    const row = metadata.operators.find((row) => row.id === idOf(value));
    if (!row) throw Error('运营商不存在。');
    return row;
  }
  function save(action, path, beforeValue, afterValue, operatorId = '', method = 'POST') {
    const user = actor();
    metadata.logs.unshift({
      id: `audit-${++metadata.sequence}`,
      username: user.username,
      role: user.role,
      operatorId: operatorId || user.operatorId || '',
      method,
      path,
      statusCode: 200,
      createdAt: timestamp(),
      action,
      beforeValue: sanitize(beforeValue),
      afterValue: sanitize(afterValue),
    });
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(metadata));
    } catch {
      metadata = clone(committedMetadata);
      throw Error('浏览器未能保存管理演示数据，请检查存储空间。');
    }
    committedMetadata = clone(metadata);
    onChanged();
  }
  function source(operatorId = '') {
    const selected = scope(operatorId),
      data = addOperatorOwnership(getSource());
    const stations = (data.stations || []).filter(
      (row) => !selected || String(row.operatorId) === selected,
    );
    const stationIds = new Set(stations.map((row) => row.id));
    const devices = (data.devices || []).filter((row) => stationIds.has(row.stationId));
    const deviceIds = new Set(devices.map((row) => row.id));
    const sockets = (data.sockets || []).filter((row) => deviceIds.has(row.deviceId));
    const orders = (data.orders || []).filter((row) => !selected || row.operatorId === selected);
    const reports = (data.reports || []).filter((row) => !selected || row.operatorId === selected);
    const historicalIds = new Set([...orders, ...reports].map((row) => row.stationId));
    const historicalStations = selected
      ? data.stations
          .filter((row) => !stationIds.has(row.id) && historicalIds.has(row.id))
          .map((row) => ({ ...row, operatorId: selected, historicalOnly: true }))
      : [];
    return {
      ...data,
      stations: [...stations, ...historicalStations],
      devices,
      sockets,
      orders,
      reports,
    };
  }
  function paginate(rows, page = 1, size = 20) {
    page = Math.max(1, Math.trunc(Number(page)) || 1);
    size = Math.min(100, Math.max(1, Math.trunc(Number(size)) || 20));
    return {
      rows: clone(rows.slice((page - 1) * size, page * size)),
      total: rows.length,
      page,
      size,
      totalPages: Math.max(1, Math.ceil(rows.length / size)),
    };
  }
  function usersFor(data, operatorId) {
    const used = new Set(data.orders.map((row) => row.userId));
    return (data.users || [])
      .filter((row) => !operatorId || used.has(row.id))
      .map((row) => {
        const orders = data.orders.filter((order) => order.userId === row.id);
        return {
          id: row.id,
          username: row.username || row.account,
          displayName: row.displayName || row.name,
          enabled: row.enabled !== false,
          orderCount: orders.length,
          lastUsedAt:
            orders
              .map((order) => order.startedAt || '')
              .sort()
              .at(-1) || '',
        };
      });
  }
  function createStaff(body, operatorId) {
    const owner = manager(operatorId);
    if (!owner) throw Error('请选择运营商。');
    if (!operator(owner).enabled) throw Error('不能为已停用的运营商创建团队账号。');
    const username = String(body.username || '').trim(),
      displayName = String(body.displayName || '').trim();
    if (!/^[a-zA-Z0-9_]{3,64}$/.test(username))
      throw Error('登录账号须为 3～64 位字母、数字或下划线。');
    if (!displayName || displayName.length > 60) throw Error('显示名称须为 1～60 个字符。');
    if (
      metadata.team.some((row) => row.username.toLowerCase() === username.toLowerCase()) ||
      username.toLowerCase() === 'demo'
    )
      throw Error('登录账号已存在。');
    if (
      !body.password ||
      String(body.password).length < 10 ||
      String(body.password).length > 64 ||
      !/[a-zA-Z]/.test(body.password) ||
      !/\d/.test(body.password)
    )
      throw Error('密码须为 10～64 个字符，包含字母和数字。');
    const role = body.role || 'OPERATOR';
    if (!['OPERATOR_ADMIN', 'OPERATOR'].includes(role)) throw Error('团队角色无效。');
    const row = {
      id: `demo-staff-${++metadata.sequence}`,
      username,
      displayName,
      role,
      operatorId: owner,
      enabled: true,
      createdAt: timestamp(),
    };
    metadata.team.push(row);
    save('创建团队账号', `/operators/${owner}/staff`, null, row, owner);
    return clone(row);
  }
  return {
    async recordOperation(event) {
      const owner = scope(event.operatorId);
      save(
        String(event.action || '管理操作'),
        String(event.path || '/demo/operations'),
        event.beforeValue,
        event.afterValue,
        owner,
        event.method || 'POST',
      );
    },
    async operators() {
      const owner = scope();
      return clone(metadata.operators.filter((row) => !owner || row.id === owner));
    },
    async createOperator(body) {
      platform();
      body = typeof body === 'string' ? { name: body } : body;
      const name = String(body?.name || '').trim();
      if (!name || name.length > 100) throw Error('运营商名称须为 1～100 个字符。');
      if (metadata.operators.some((row) => row.name === name)) throw Error('运营商名称已存在。');
      const row = {
        id: `demo-operator-${++metadata.sequence}`,
        name,
        contactName: String(body.contactName || '').trim(),
        phone: String(body.phone || '').trim(),
        cooperationStatus: String(body.cooperationStatus || 'ACTIVE'),
        enabled: body.enabled !== false,
      };
      metadata.operators.push(row);
      save('创建运营商', '/operators', null, row, row.id);
      return clone(row);
    },
    async updateOperator(id, body) {
      platform();
      const row = operator(id),
        before = clone(row);
      const name = String(body.name ?? row.name).trim();
      if (!name || name.length > 100) throw Error('运营商名称须为 1～100 个字符。');
      if (metadata.operators.some((item) => item.id !== row.id && item.name === name))
        throw Error('运营商名称已存在。');
      if (body.enabled !== undefined && typeof body.enabled !== 'boolean')
        throw Error('运营商状态必须为布尔值。');
      Object.assign(row, {
        name,
        contactName: String(body.contactName ?? row.contactName).trim(),
        phone: String(body.phone ?? row.phone).trim(),
        cooperationStatus: String(body.cooperationStatus ?? row.cooperationStatus ?? 'ACTIVE'),
        enabled: body.enabled ?? row.enabled,
      });
      save('修改运营商', `/operators/${row.id}`, before, row, row.id, 'PUT');
      return clone(row);
    },
    async operatorStaff(id) {
      const owner = scope(id);
      operator(owner);
      return clone(metadata.team.filter((row) => row.operatorId === owner));
    },
    async createOperatorStaff(id, body) {
      return createStaff(body, id);
    },
    async assignStation(stationId, operatorId) {
      platform();
      const owner = operator(operatorId);
      if (!owner.enabled) throw Error('不能分配给已停用的运营商。');
      const data = addOperatorOwnership(getSource());
      const station = (data.stations || []).find((row) => row.id === idOf(stationId));
      if (!station) throw Error('站点不存在。');
      if (data.orders.some((row) => row.stationId === station.id && active.has(row.status)))
        throw Error('站点存在未结束订单，不能变更运营商。');
      if (
        data.reports.some(
          (row) =>
            row.stationId === station.id &&
            !['resolved', 'closed', 'COMPLETED', 'RESOLVED'].includes(row.status),
        )
      )
        throw Error('站点存在未处理报修，不能变更运营商。');
      const before = { operatorId: station.operatorId };
      station.operatorId = owner.id;
      try {
        save(
          '分配站点',
          `/operators/stations/${station.id}/owner`,
          before,
          { operatorId: owner.id },
          owner.id,
          'PUT',
        );
      } catch (error) {
        station.operatorId = before.operatorId;
        throw error;
      }
      return clone(station);
    },
    async repairAssignees(id) {
      const user = actor();
      if (user.role === 'OPERATOR') throw Error('无报修分派权限。');
      const data = addOperatorOwnership(getSource()),
        report = data.reports.find((row) => row.id === idOf(id));
      if (!report) throw Error('报修不存在。');
      scope(report.operatorId);
      const choices = metadata.team.filter(
        (row) => row.operatorId === report.operatorId && row.enabled !== false,
      );
      return clone(user.role === 'ADMIN' ? [...choices, { ...user, enabled: true }] : choices);
    },
    async handleRepair(id, body) {
      const user = actor(),
        data = addOperatorOwnership(getSource()),
        report = data.reports.find((row) => row.id === idOf(id));
      if (!report) throw Error('报修不存在。');
      scope(report.operatorId);
      if (user.role === 'OPERATOR' && report.assigneeUsername !== user.username)
        throw Error('只能处理分派给本人的报修。');
      if (!['PROCESSING', 'RESOLVED'].includes(body.status)) throw Error('处理状态无效。');
      const assignee = body.assigneeUsername || report.assigneeUsername || user.username;
      if (user.role === 'OPERATOR' && assignee !== user.username)
        throw Error('不能变更报修负责人。');
      const assigned = metadata.team.find(
        (row) =>
          row.username === assignee &&
          row.operatorId === report.operatorId &&
          row.enabled !== false,
      );
      const keepingPlatformAssignee =
        assignee === report.assigneeUsername && report.assigneeRole === 'ADMIN';
      if (
        !assigned &&
        !(user.role === 'ADMIN' && assignee === user.username) &&
        !keepingPlatformAssignee
      )
        throw Error('请选择该运营商的有效处理人员。');
      const note = String(body.resolution || '').trim();
      if (note.length > 500 || (body.status === 'RESOLVED' && note.length < 2))
        throw Error('请填写2—500字的处理结果。');
      if (report.status === 'resolved') throw Error('该报修已完成。');
      const before = clone(report),
        at = timestamp();
      let history = [];
      try {
        history = JSON.parse(report.progressHistory || '[]');
      } catch {
        throw Error('报修进度记录异常。');
      }
      Object.assign(report, {
        status: body.status === 'RESOLVED' ? 'resolved' : 'processing',
        assigneeUsername: assignee,
        assigneeRole: assigned?.role || (keepingPlatformAssignee ? 'ADMIN' : user.role),
        handlerUsername: user.username,
        resolution: note,
        resolvedAt: body.status === 'RESOLVED' ? at : '',
        progressHistory: JSON.stringify([
          ...history,
          { at, status: body.status, note, handler: user.username, assignee },
        ]),
      });
      try {
        save('处理报修', '/repairs/' + report.id, before, report, report.operatorId, 'PATCH');
      } catch (error) {
        for (const key of Object.keys(report)) delete report[key];
        Object.assign(report, before);
        throw error;
      }
      return clone(report);
    },
    async team(operatorId) {
      const owner = scope(operatorId);
      return clone(metadata.team.filter((row) => !owner || row.operatorId === owner));
    },
    async createTeam(body, operatorId) {
      return createStaff(body, operatorId || body.operatorId);
    },
    async setTeamEnabled(id, enabled, operatorId) {
      const owner = manager(operatorId),
        row = metadata.team.find(
          (row) => row.id === idOf(id) && (!owner || row.operatorId === owner),
        );
      if (!row) throw Error('团队账号不存在。');
      if (typeof enabled !== 'boolean') throw Error('账号状态必须为布尔值。');
      if (row.id === idOf(actor().id) || row.username === actor().username)
        throw Error('不能修改自己的账号状态。');
      if (
        !enabled &&
        row.role === 'OPERATOR_ADMIN' &&
        !metadata.team.some(
          (other) =>
            other.id !== row.id &&
            other.operatorId === row.operatorId &&
            other.role === 'OPERATOR_ADMIN' &&
            other.enabled,
        )
      )
        throw Error('不能停用运营商最后一个启用的管理员账号。');
      const before = clone(row);
      row.enabled = enabled;
      save('修改团队账号状态', `/team/${row.id}/status`, before, row, row.operatorId, 'PATCH');
      return clone(row);
    },
    async resetTeamPassword(id, password, operatorId) {
      const owner = manager(operatorId),
        row = metadata.team.find(
          (row) => row.id === idOf(id) && (!owner || row.operatorId === owner),
        );
      if (!row) throw Error('团队账号不存在。');
      if (
        String(password || '').length < 10 ||
        String(password).length > 64 ||
        !/[a-zA-Z]/.test(password) ||
        !/\d/.test(password)
      )
        throw Error('密码须为 10～64 个字符，包含字母和数字。');
      row.passwordResetAt = timestamp();
      save(
        '重置团队密码',
        `/team/${row.id}/password`,
        null,
        { passwordReset: true },
        row.operatorId,
      );
      return { message: '演示密码重置已记录；演示新增账号不提供真实登录。' };
    },
    async serviceUsers({ page = 1, size = 20, keyword = '', operatorId = '' } = {}) {
      const owner = scope(operatorId),
        data = source(owner),
        search = String(keyword).trim().toLowerCase();
      return paginate(
        usersFor(data, owner).filter(
          (row) => !search || `${row.username} ${row.displayName}`.toLowerCase().includes(search),
        ),
        page,
        size,
      );
    },
    async serviceUser(id, { operatorId = '' } = {}) {
      const owner = scope(operatorId),
        data = source(owner),
        user = usersFor(data, owner).find((row) => row.id === idOf(id));
      if (!user) throw Error('服务用户不存在或不在当前运营范围。');
      return clone({
        user,
        orders: data.orders.filter((row) => row.userId === user.id),
        repairs: data.reports.filter((row) => row.userId === user.id),
      });
    },
    async statistics({ operatorId = '', stationId = '', from = '', to = '' } = {}) {
      const data = source(operatorId),
        selected = idOf(stationId);
      if (selected && !data.stations.some((row) => row.id === selected))
        throw Error('站点不存在或不在当前运营范围。');
      if (from && to && from > to) throw Error('开始日期不能晚于结束日期。');
      const orders = data.orders.filter(
        (row) =>
          row.testOrder !== true &&
          (!selected || row.stationId === selected) &&
          (!from || (row.startedAt || '').slice(0, 10) >= from) &&
          (!to || (row.startedAt || '').slice(0, 10) <= to),
      );
      const metrics = (items, station, owner) => {
        const result = emptyMetrics(),
          devices = data.devices.filter(
            (row) =>
              !station ||
              (row.stationId === station.id &&
                !station.historicalOnly &&
                (!owner || station.operatorId === owner)),
          );
        const deviceIds = new Set(devices.map((row) => row.id)),
          socketIds = new Set(
            data.sockets.filter((row) => deviceIds.has(row.deviceId)).map((row) => row.id),
          );
        result.deviceCount = devices.length;
        result.onlineDeviceCount = devices.filter((row) => row.online).length;
        result.openRepairCount = data.reports.filter(
          (row) =>
            socketIds.has(row.socketId) &&
            !['resolved', 'closed', 'COMPLETED', 'RESOLVED'].includes(row.status),
        ).length;
        result.orderCount = items.length;
        for (const row of items) {
          if (active.has(row.status)) result.activeCount++;
          if (!['ended', 'COMPLETED'].includes(row.status)) continue;
          result.energyKwh += Number(row.energy || 0);
          result.electricityFee += Number(row.electricFee || 0);
          result.serviceFee += Number(row.serviceFee || 0);
          result.totalAmount += Number(row.total || 0);
          if (['paid', 'PAID'].includes(row.payStatus)) result.paidAmount += Number(row.total || 0);
        }
        result.energyKwh = Number(result.energyKwh.toFixed(3));
        for (const key of ['electricityFee', 'serviceFee', 'totalAmount', 'paidAmount'])
          result[key] = round(result[key]);
        return result;
      };
      const groups = new Map(
        data.stations
          .filter((row) => !selected || row.id === selected)
          .map((station) => [`${station.operatorId}/${station.id}`, station]),
      );
      for (const order of orders) {
        const key = `${order.operatorId}/${order.stationId}`;
        if (!groups.has(key)) {
          const site = data.stations.find((row) => row.id === order.stationId);
          groups.set(key, {
            ...site,
            id: order.stationId,
            name: site?.name || order.stationName,
            operatorId: order.operatorId,
            historicalOnly: true,
          });
        }
      }
      const rows = [...groups.values()].map((station) => ({
        operatorId: station.operatorId,
        operatorName: metadata.operators.find((row) => row.id === station.operatorId)?.name || '',
        stationId: station.id,
        stationName: station.name,
        ...metrics(
          orders.filter(
            (row) => row.stationId === station.id && row.operatorId === station.operatorId,
          ),
          station,
          station.operatorId,
        ),
      }));
      const summary = emptyMetrics();
      for (const row of rows) for (const key of Object.keys(summary)) summary[key] += row[key];
      for (const key of Object.keys(summary))
        summary[key] = Number(summary[key].toFixed(key === 'energyKwh' ? 3 : 2));
      const daily = [...new Set(orders.map((row) => (row.startedAt || '').slice(0, 10)))]
        .sort()
        .map((date) => {
          const totals = metrics(orders.filter((row) => (row.startedAt || '').startsWith(date)));
          return {
            date,
            orderCount: totals.orderCount,
            energyKwh: totals.energyKwh,
            totalAmount: totals.totalAmount,
            paidAmount: totals.paidAmount,
          };
        });
      return { summary, rows, daily };
    },
    async audit(page = 1, filters = {}) {
      const owner = scope(filters.operatorId),
        keyword = String(filters.keyword || '').toLowerCase();
      return paginate(
        metadata.logs.filter(
          (row) =>
            (!owner || row.operatorId === owner) &&
            (!filters.username || row.username.includes(filters.username)) &&
            (!filters.action || row.action.includes(filters.action)) &&
            (!filters.method || row.method === filters.method) &&
            (!filters.from || row.createdAt.slice(0, 10) >= filters.from) &&
            (!filters.to || row.createdAt.slice(0, 10) <= filters.to) &&
            (!keyword ||
              `${row.username} ${row.action} ${row.path}`.toLowerCase().includes(keyword)),
        ),
        page,
        filters.size || 20,
      );
    },
  };
}
