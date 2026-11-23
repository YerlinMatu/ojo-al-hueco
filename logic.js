/** Lógica pura de Ojo al Hueco. Sin dependencias y compatible con Node y GitHub Pages. */
export const DUPLICATE_RADIUS_METERS = 50;
export const TYPES = ['Hueco', 'Hundimiento', 'Alcantarillado', 'Señalización', 'Otro'];
export const STATUSES = ['Recibido en la plataforma', 'Pendiente de radicación', 'Radicado oficialmente', 'En gestión', 'Resuelto'];

export function distanceMeters(a, b) {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every(Number.isFinite)) return Infinity;
  const toRad = n => n * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  )));
  return 6371000 * c;
}

export function findNearbyReports(reports, point, radius = DUPLICATE_RADIUS_METERS) {
  if (!point || !Array.isArray(reports)) return [];
  return reports.filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.status !== 'Resuelto')
    .map(r => ({ ...r, distance: Math.round(distanceMeters(point, r)) }))
    .filter(r => r.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

export function routeReport({ roadType, damageType } = {}) {
  // Reglas ilustrativas; NO constituyen determinación jurídica de competencia.
  if (damageType === 'Alcantarillado') return {
    entity: 'Empresa de Acueducto y Alcantarillado de Bogotá (EAAB)',
    reason: 'El daño seleccionado se relaciona con infraestructura de alcantarillado.',
    url: 'https://www.acueducto.com.co/'
  };
  if (roadType === 'Arterial') return {
    entity: 'Instituto de Desarrollo Urbano (IDU)',
    reason: 'La vía fue identificada por el usuario como arterial.',
    url: 'https://www.idu.gov.co/'
  };
  return {
    entity: 'Unidad de Mantenimiento Vial (UMV)',
    reason: 'La vía fue identificada como local o no clasificada.',
    url: 'https://www.umv.gov.co/'
  };
}

export function validateReport(report) {
  const errors = [];
  if (!report || typeof report !== 'object') return ['El reporte no tiene datos.'];
  if (!TYPES.includes(report.damageType)) errors.push('Selecciona un tipo de daño.');
  if (typeof report.description !== 'string' || report.description.trim().length < 10) errors.push('La descripción debe tener al menos 10 caracteres.');
  if (!Number.isFinite(report.lat) || report.lat < -90 || report.lat > 90 || !Number.isFinite(report.lng) || report.lng < -180 || report.lng > 180) errors.push('Selecciona una ubicación válida.');
  if (!['Local', 'Arterial', 'No sé'].includes(report.roadType)) errors.push('Selecciona el tipo de vía.');
  if (!report.photo || typeof report.photo !== 'string') errors.push('Adjunta una fotografía del daño.');
  return errors;
}

export function createTimelineEvent(status, source = 'Plataforma Ojo al Hueco', note = '', date = new Date()) {
  if (!STATUSES.includes(status)) throw new Error('Estado no válido');
  return { id: cryptoId(), status, source, note: String(note), at: new Date(date).toISOString() };
}

export function cryptoId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createReport(input, date = new Date()) {
  const errors = validateReport(input);
  if (errors.length) throw new Error(errors.join(' '));
  const createdAt = new Date(date).toISOString();
  return {
    id: `OAH-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    title: input.damageType === 'Otro' ? 'Daño vial reportado' : `${input.damageType} en la vía`,
    damageType: input.damageType, description: input.description.trim().slice(0, 600),
    roadType: input.roadType, lat: input.lat, lng: input.lng,
    photo: input.photo, createdAt, status: 'Pendiente de radicación',
    source: 'Reporte ciudadano (demostración)', officialReference: null,
    supports: 1, isDemo: false, timeline: [createTimelineEvent('Recibido en la plataforma', 'Plataforma Ojo al Hueco', 'Reporte creado; no equivale a un radicado oficial.', date), createTimelineEvent('Pendiente de radicación', 'Plataforma Ojo al Hueco', 'Consulta el canal sugerido para tramitarlo con la entidad.', date)]
  };
}

export function supportReport(report) {
  return { ...report, supports: Math.max(0, Number(report.supports) || 0) + 1 };
}

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}
