import { findNearbyReports, routeReport, validateReport, createReport, supportReport, escapeHtml, formatDate, distanceMeters } from './logic.js';
import { demoReports } from './data.js';

const STORAGE_KEY = 'ojo-al-hueco.demo.v1';
const SUPPORTED_KEY = 'ojo-al-hueco.supported.v1';
const CENTER = [4.5525, -74.1460];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let reports = loadReports();
let supportedIds = loadSupported();
let map = null, markers = null, formMap = null, formMarker = null;
let photoDataUrl = null;
let activeDetailId = null;
let toastTimeout;

function loadReports() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value : structuredClone(demoReports);
  } catch { return structuredClone(demoReports); }
}
function loadSupported() {
  try { const value = JSON.parse(localStorage.getItem(SUPPORTED_KEY)); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); localStorage.setItem(SUPPORTED_KEY,JSON.stringify(supportedIds)); return true; }
  catch { toast('Almacenamiento lleno. Prueba con una foto más pequeña o libera espacio.'); return false; }
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.hidden = false;
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { el.hidden = true; }, 4700);
}
function setStats() {
  const total = reports.length, active = reports.filter(r=>r.status !== 'Resuelto').length;
  const supports = reports.reduce((n,r)=>n + (Number(r.supports)||0),0);
  $('#statReports').textContent = total; $('#statOpen').textContent=active; $('#statSupports').textContent=supports;
  $('#communityCases').textContent=total;$('#communityActive').textContent=active;$('#communitySupport').textContent=supports;
}
const typeIcon = type => ({'Hueco':'◉','Hundimiento':'⌄','Alcantarillado':'≋','Señalización':'⚑','Otro':'!'}[type]||'!');
function statusLabel(status) { return status === 'Resuelto' ? 'Resuelto · demo' : status; }
function filteredReports() {
  const status = $('#filterStatus').value, type = $('#filterType').value;
  return reports.filter(r => (status==='all'|| (status==='active' ? r.status!=='Resuelto':r.status===status)) && (type==='all'||type===r.damageType))
    .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
}
function renderList() {
  const list=filteredReports(); $('#countLabel').textContent=`${list.length} de ${reports.length} casos · datos de ejemplo`;
  $('#reportList').innerHTML=list.length?list.map(r=>`<article class="report-item">
    <div class="report-row"><span class="report-code">${escapeHtml(r.id)}</span><span class="status-badge ${r.status==='Resuelto'?'done':''}">${escapeHtml(statusLabel(r.status))}</span></div>
    <h4>${typeIcon(r.damageType)} ${escapeHtml(r.title)}</h4><p>${escapeHtml(r.description.slice(0,110))}${r.description.length>110?'…':''}</p>
    <div class="report-bottom"><span>♡ ${r.supports||0} apoyos · ${formatDate(r.createdAt)}</span><button class="link-button" data-detail="${escapeHtml(r.id)}">Ver caso ↗</button></div>
  </article>`).join(''):'<div class="empty-state">No hay casos con estos filtros.</div>';
  $$('#reportList [data-detail]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.detail)));
}
function makePin(r) {
  return window.L.divIcon({className:'',html:`<div class="pin-marker ${r.status==='Resuelto'?'closed':''}">${typeIcon(r.damageType)}</div>`,iconSize:[32,32],iconAnchor:[16,16]});
}
function renderMarkers() {
  if (!map || !markers || !window.L) return;
  markers.clearLayers();
  for (const r of filteredReports()) {
    if (!Number.isFinite(r.lat)||!Number.isFinite(r.lng)) continue;
    const marker=window.L.marker([r.lat,r.lng],{icon:makePin(r)}).addTo(markers);
    marker.bindPopup(`<strong>${escapeHtml(r.title)}</strong><br><small>${escapeHtml(r.id)} · ${escapeHtml(statusLabel(r.status))}</small><br><button type="button" class="map-popup-detail" data-id="${escapeHtml(r.id)}">Ver detalle</button>`);
    marker.on('popupopen',()=>{
      const btn=document.querySelector('.map-popup-detail');if(btn)btn.addEventListener('click',()=>openDetail(btn.dataset.id));
    });
  }
}
function refresh() {setStats();renderList();renderMarkers();}
function initMap() {
  if (!window.L) {$('#map').hidden=true;$('#mapFallback').hidden=false;return;}
  map=window.L.map('map',{scrollWheelZoom:false}).setView(CENTER,14);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap contributors',maxZoom:19
  }).addTo(map);
  markers=window.L.layerGroup().addTo(map);
  renderMarkers();
  $('#centerMap').addEventListener('click',()=>map.setView(CENTER,14));
}
function initFormMap() {
  if (!window.L || formMap) return;
  formMap=window.L.map('reportMap',{scrollWheelZoom:false}).setView(CENTER,14);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(formMap);
  formMarker=window.L.marker(CENTER,{draggable:true}).addTo(formMap);
  formMarker.on('dragend',()=>{const p=formMarker.getLatLng();setCoords(p.lat,p.lng,false);});
  formMap.on('click',e=>setCoords(e.latlng.lat,e.latlng.lng,true));
}
function setCoords(lat,lng,moveMarker=true) {
  if (!Number.isFinite(lat)||!Number.isFinite(lng)) return;
  $('#latField').value=Number(lat).toFixed(6);$('#lngField').value=Number(lng).toFixed(6);
  if (moveMarker&&formMarker)formMarker.setLatLng([lat,lng]);
  checkNearby();
}
function checkNearby() {
  const point={lat:Number($('#latField').value),lng:Number($('#lngField').value)};
  if (!Number.isFinite(point.lat)||!Number.isFinite(point.lng)) return;
  const near=findNearbyReports(reports,point);
  const box=$('#nearbyBox');
  box.hidden=!near.length;
  if(near.length){const r=near[0];box.innerHTML=`<b>¡Atención! Ya hay un reporte cercano.</b><br>${escapeHtml(r.title)} · aproximadamente ${r.distance} metros. Para evitar duplicados, puedes apoyar el caso existente.<button type="button" id="supportNearby">Apoyar ${escapeHtml(r.id)} en su lugar</button>`;$('#supportNearby').addEventListener('click',()=>{closeReport();openDetail(r.id);});}
}
function updateRoute() {
  const damageType=$('#reportForm').elements.damageType.value;
  const roadType=$('#reportForm').elements.roadType.value;
  const box=$('#routeBox');
  box.hidden=!damageType;
  if(!damageType)return;
  const route=routeReport({roadType,damageType});
  box.innerHTML=`<b>Canal orientativo:</b> ${escapeHtml(route.entity)}<br>${escapeHtml(route.reason)} <a href="${route.url}" target="_blank" rel="noopener noreferrer">Consultar sitio oficial ↗</a><br><small>La recomendación requiere verificación y no genera un radicado.</small>`;
}
function openReport() {
  $('#reportModal').hidden=false;document.body.style.overflow='hidden';
  $('#formError').hidden=true;
  if(window.L){initFormMap();setTimeout(()=>formMap?.invalidateSize(),80);}
  else $('#reportMap').innerHTML='<p style="padding:15px;font-size:12px">Mapa no disponible sin conexión. Puedes escribir las coordenadas manualmente.</p>';
  setCoords(Number($('#latField').value)||CENTER[0],Number($('#lngField').value)||CENTER[1]);
}
function closeReport(){ $('#reportModal').hidden=true;document.body.style.overflow=''; }
function openDetail(id) {
  const r=reports.find(x=>x.id===id);if(!r)return;
  activeDetailId=id;$('#detailModal').hidden=false;document.body.style.overflow='hidden';
  $('#detailId').textContent=`CASO ${r.id} · ${r.isDemo?'EJEMPLO FICTICIO':'GUARDADO EN ESTE NAVEGADOR'}`;
  $('#detailTitle').textContent=r.title;
  const route=routeReport(r);
  const items=(r.timeline||[]).slice().reverse();
  $('#detailBody').innerHTML=`
    ${r.photo?.startsWith('data:image/')?`<img class="detail-photo" src="${r.photo}" alt="Foto proporcionada al reportar">`:'<div class="detail-photo-placeholder">◎ &nbsp; Foto no disponible · caso de ejemplo</div>'}
    <div class="detail-summary"><span>⌖ ${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)}</span><span>◷ ${formatDate(r.createdAt)}</span><span>♡ ${r.supports||0} apoyos</span></div>
    <p class="detail-description">${escapeHtml(r.description)}</p>
    <span class="status-badge ${r.status==='Resuelto'?'done':''}">${escapeHtml(statusLabel(r.status))}</span>
    <h3 style="margin:25px 0 16px">Historia del caso</h3>
    <ul class="timeline">${items.map(e=>`<li><strong>${escapeHtml(e.status)}</strong><small>${formatDate(e.at)} · ${escapeHtml(e.source)}</small><span>${escapeHtml(e.note||'Sin observaciones')}</span></li>`).join('')}</ul>
    <div class="route-box"><b>Entidad sugerida (orientativa):</b><br>${escapeHtml(route.entity)}<br>${escapeHtml(route.reason)}<br><a href="${route.url}" target="_blank" rel="noopener noreferrer">Abrir canal institucional ↗</a></div>
    <div class="detail-actions"><button class="btn btn-dark" id="supportDetail" ${supportedIds.includes(id)||r.status==='Resuelto'?'disabled':''}>${supportedIds.includes(id)?'✓ Ya apoyaste':'♡ Apoyar este caso'}</button><button class="btn btn-ghost" id="copyDetail">Copiar resumen</button></div>
    <p class="disclaimer">${r.isDemo?'Los datos, fechas y estados de este caso son completamente ficticios.':'Este caso se conserva solo en el almacenamiento local del navegador.'} Un estado de la plataforma no equivale a una radicación o confirmación oficial. Para radicar, consulta la entidad.</p>`;
  $('#supportDetail').addEventListener('click',()=>{
    if(supportedIds.includes(id)||r.status==='Resuelto')return;
    reports=reports.map(x=>x.id===id?supportReport(x):x);supportedIds.push(id);persist();refresh();openDetail(id);toast('Tu apoyo quedó guardado en este navegador.');
  });
  $('#copyDetail').addEventListener('click',async()=>{
    const text=`${r.id}: ${r.title}\n${r.description}\nUbicación: ${r.lat}, ${r.lng}\nEstado: ${r.status}\nEste registro no constituye radicado oficial.`;
    try{await navigator.clipboard.writeText(text);toast('Resumen copiado.');}catch{toast('No se pudo copiar automáticamente.');}
  });
}
function closeDetail(){ $('#detailModal').hidden=true;document.body.style.overflow='';activeDetailId=null; }
async function reducePhoto(file) {
  if(!file||!file.type.startsWith('image/'))throw new Error('Selecciona una imagen válida.');
  if(file.size>15*1024*1024)throw new Error('El archivo supera los 15 MB permitidos antes de comprimir.');
  const url=URL.createObjectURL(file);
  try {
    const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('No se pudo leer la imagen.'));image.src=url;});
    const scale=Math.min(1,1100/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
    if(!canvas.width||!canvas.height)throw new Error('Imagen vacía.');
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    let quality=.70,result=canvas.toDataURL('image/jpeg',quality);
    while(result.length>680000 && quality>.25){quality-=.12;result=canvas.toDataURL('image/jpeg',quality);}
    if(result.length>680000)throw new Error('No se pudo comprimir la imagen lo suficiente.');
    return result;
  } finally {URL.revokeObjectURL(url);}
}
function resetForm() {
  $('#reportForm').reset();photoDataUrl=null;$('#photoLabel').textContent='Selecciona una imagen JPG, PNG o WEBP';
  $('#routeBox').hidden=true;$('#nearbyBox').hidden=true;setCoords(...CENTER);
}
function exportCsv() {
  const fields=['id','title','damageType','description','status','supports','lat','lng','createdAt','isDemo'];
  const quote=value=>`"${String(value??'').replace(/"/g,'""').replace(/^[=+\-@\t\r]/,'\u0027$&')}\u0022`;
  const lines=[fields.join(','),...reports.map(r=>fields.map(f=>quote(r[f])).join(','))];
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ojo-al-hueco-casos-demo.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast('Resumen descargado. No contiene datos personales.');
}
function bindEvents() {
  $$('[data-open-report]').forEach(b=>b.addEventListener('click',openReport));
  $('#closeReport').addEventListener('click',closeReport);$('#cancelReport').addEventListener('click',closeReport);
  $('#closeDetail').addEventListener('click',closeDetail);
  $$('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',e=>{if(e.target===backdrop){closeReport();closeDetail();}}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeReport();closeDetail();}});
  $('#filterStatus').addEventListener('change',refresh);$('#filterType').addEventListener('change',refresh);
  $('#navToggle').addEventListener('click',()=>{const open=$('#siteNav').classList.toggle('open');$('#navToggle').setAttribute('aria-expanded',String(open));});
  $$('#siteNav a,#siteNav button').forEach(n=>n.addEventListener('click',()=>{$('#siteNav').classList.remove('open');$('#navToggle').setAttribute('aria-expanded','false');}));
  $('#resetDemo').addEventListener('click',()=>{if(!window.confirm('¿Restablecer los casos ficticios y borrar reportes locales de esta demo?'))return;reports=structuredClone(demoReports);supportedIds=[];persist();refresh();toast('Se restablecieron los datos ficticios.');});
  $('#exportCsv').addEventListener('click',exportCsv);
  const form=$('#reportForm');
  form.elements.damageType.addEventListener('change',updateRoute);form.elements.roadType.addEventListener('change',updateRoute);
  $('#latField').addEventListener('change',()=>setCoords(Number($('#latField').value),Number($('#lngField').value)));
  $('#lngField').addEventListener('change',()=>setCoords(Number($('#latField').value),Number($('#lngField').value)));
  $('#useLocation').addEventListener('click',()=>{
    if(!navigator.geolocation){toast('Tu navegador no admite geolocalización.');return;}
    navigator.geolocation.getCurrentPosition(p=>{const {latitude,longitude}=p.coords;setCoords(latitude,longitude);formMap?.setView([latitude,longitude],16);toast('Ubicación obtenida; verifica que el punto sea correcto.');},()=>toast('No fue posible obtener tu ubicación. Puedes indicar el punto manualmente.'),{timeout:11000,enableHighAccuracy:true});
  });
  $('#photoInput').addEventListener('change',async e=>{
    photoDataUrl=null;const file=e.target.files?.[0];if(!file)return;
    $('#photoLabel').textContent='Procesando imagen...';
    try{photoDataUrl=await reducePhoto(file);$('#photoLabel').textContent=`✓ ${file.name} · fotografía preparada para guardar localmente`;}catch(err){$('#photoLabel').textContent=err.message;e.target.value='';}
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();const data=new FormData(form);
    const draft={damageType:data.get('damageType'),roadType:data.get('roadType'),description:data.get('description')||'',lat:Number(data.get('lat')),lng:Number(data.get('lng')),photo:photoDataUrl};
    const errors=validateReport(draft);const box=$('#formError');
    if(errors.length){box.textContent=errors.join(' ');box.hidden=false;return;}
    const near=findNearbyReports(reports,draft);
    if(near.length&&!window.confirm(`Existe un caso a ${near[0].distance} metros (${near[0].id}). ¿Crear otro reporte de todas maneras?`))return;
    try{
      const created=createReport(draft);reports.unshift(created);
      if(!persist()){reports.shift();return;}
      box.hidden=true;resetForm();closeReport();refresh();map?.setView([created.lat,created.lng],16);openDetail(created.id);toast('Reporte guardado en este navegador. NO se ha enviado a ninguna entidad.');
    }catch(err){box.textContent=err.message;box.hidden=false;}
  });
}
initMap();bindEvents();refresh();
