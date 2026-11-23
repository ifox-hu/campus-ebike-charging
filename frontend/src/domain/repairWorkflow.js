export function eligibleAssignees(accounts = [], operatorId) {
  const known = new Set();
  return accounts.filter((account) => {
    if (
      !account.username ||
      known.has(account.username) ||
      account.enabled === false ||
      !['ADMIN', 'OPERATOR_ADMIN', 'OPERATOR'].includes(account.role)
    )
      return false;
    if (
      operatorId != null &&
      account.operatorId != null &&
      String(account.operatorId) !== String(operatorId)
    )
      return false;
    known.add(account.username);
    return true;
  });
}
export function repairAge(ticket, now = Date.now()) {
  const raw = String(ticket.createdAt || '').replace(' ', 'T');
  const date = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?$/.test(raw) ? raw + '+08:00' : raw;
  const elapsed = now - Date.parse(date),
    valid = Number.isFinite(elapsed) && elapsed >= 0;
  const open = !['RESOLVED', 'resolved', 'closed'].includes(ticket.status);
  const hours = valid ? Math.floor(elapsed / 3600000) : null;
  return {
    hours,
    overdue: open && valid && elapsed >= 24 * 3600000,
    label: !valid
      ? '—'
      : !open
        ? '已完成'
        : hours >= 24
          ? `已等待${Math.floor(hours / 24)}天${hours % 24}小时`
          : `已等待${hours}小时`,
  };
}
