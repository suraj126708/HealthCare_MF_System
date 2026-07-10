function formatAppointmentReference(mongoId) {
  const id = String(mongoId || "");
  if (!id) return "";
  return `APT-${id.slice(-8).toUpperCase()}`;
}

module.exports = { formatAppointmentReference };
