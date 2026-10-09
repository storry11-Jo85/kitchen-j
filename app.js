const icons = [
  { code:'A1', label:'조리' }, { code:'A2', label:'준비' },
  { code:'B1', label:'손질' }, { code:'B2', label:'양념' },
  { code:'C1', label:'세팅' }, { code:'C2', label:'세척' },
  { code:'D1', label:'냉장' }, { code:'D2', label:'입고' },
  { code:'E1', label:'청소' }, { code:'E2', label:'분리수거' },
  { code:'F1', label:'점검' }, { code:'F2', label:'이슈' }
];
const defaultDescriptions = { A1:'메인 메뉴 조리', A2:'재료 및 식기 준비', B1:'식재료 세척·손질', B2:'소스·양념 준비', C1:'테이블 세팅', C2:'조리도구 세척', D1:'냉장고 정리·확인', D2:'식자재 입고·정리', E1:'마감 청소', E2:'분리수거 및 폐기', F1:'마감 상태 점검', F2:'특이사항 및 이슈' };
const STORAGE_KEY = 'kitchen-log-v1';
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || { entries:{}, drafts:{}, descriptions:defaultDescriptions };
state.drafts = state.drafts || {};
let codeEditing = false;
let cursor = new Date(); cursor.setDate(1);
let selectedDate = new Date();
const dateKey = date => date.toISOString().slice(0,10);
let serverConnected = false;
const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); fetch('/api/state', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(state)}).then(()=>{serverConnected=true; updateConnectionChip();}).catch(()=>{}); };
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
function monthLabel() { return `${cursor.getFullYear()}년 ${cursor.getMonth()+1}월`; }
function selectedLabel() { return `${selectedDate.getFullYear()}년 ${selectedDate.getMonth()+1}월 ${selectedDate.getDate()}일`; }
function renderCalendar() {
  $('month-label').textContent = monthLabel();
  const grid = $('calendar-grid'); grid.innerHTML = '';
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const total = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0).getDate();
  for (let i=0; i<first; i++) grid.insertAdjacentHTML('beforeend','<div class="day empty"></div>');
  for (let n=1; n<=total; n++) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), n); const key = dateKey(date);
    const marks = state.entries[key] || []; const cls = ['day', date.getDay()===0?'sun':'', date.getDay()===6?'sat':'', key===dateKey(selectedDate)?'selected':'', key===dateKey(new Date())?'today':''].filter(Boolean).join(' ');
    const markHtml = marks.map(code => `<span class="mini-mark" title="${code}">${code}</span>`).join('');
    grid.insertAdjacentHTML('beforeend', `<button class="${cls}" data-date="${key}" type="button"><span class="day-number">${n}</span><span class="mini-marks">${markHtml}</span></button>`);
  }
  grid.querySelectorAll('[data-date]').forEach(btn => btn.addEventListener('click', () => { selectedDate = new Date(`${btn.dataset.date}T12:00:00`); renderAll(); }));
}
function renderIcons() {
  const key = dateKey(selectedDate); const marks = state.drafts[key] ?? state.entries[key] ?? [];
  $('selected-date-label').textContent = selectedLabel(); $('entry-count').textContent = `${marks.length}개 기록`;
  $('monthly-icon-grid').innerHTML = icons.map(item => `<button type="button" class="work-icon ${marks.includes(item.code)?'active':''}" data-code="${item.code}" aria-pressed="${marks.includes(item.code)}"><span class="code">${item.code}</span></button>`).join('');
  $('monthly-icon-grid').querySelectorAll('[data-code]').forEach(btn => btn.addEventListener('click', () => toggleEntry(btn.dataset.code)));
}
function toggleEntry(code) {
  const key = dateKey(selectedDate); const current = state.drafts[key] ?? [...(state.entries[key] || [])]; state.drafts[key] = current.includes(code) ? current.filter(x=>x!==code) : [...current, code]; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderIcons();
}
function saveRecord() { const key=dateKey(selectedDate); const draft=state.drafts[key]; if (draft === undefined) { showToast('변경된 내용이 없습니다'); return; } state.entries[key]=draft; delete state.drafts[key]; save(); renderAll(); showToast('선택한 날짜를 저장했어요'); }
function editRecord() { const key=dateKey(selectedDate); state.drafts[key]=[...(state.entries[key] || [])]; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderIcons(); showToast(state.entries[key]?.length ? '수정 모드로 불러왔어요' : '새 기록을 입력하세요'); }
function deleteRecord() { const key=dateKey(selectedDate); if (!(state.entries[key]?.length || state.drafts[key]?.length)) { showToast('삭제할 기록이 없습니다'); return; } if (!window.confirm(`${selectedLabel()} 기록을 삭제할까요?`)) return; delete state.entries[key]; delete state.drafts[key]; save(); renderAll(); showToast('기록을 삭제했어요'); }
function renderCodes() {
  $('code-list').innerHTML = icons.map(item => `<article class="code-card"><div class="code-badge"><strong>${item.code}</strong></div><div class="code-info"><textarea maxlength="50" ${codeEditing ? '' : 'readonly'} data-code-desc="${item.code}" aria-label="${item.code} 작업 설명">${state.descriptions[item.code] || ''}</textarea><span class="char-count" data-count-for="${item.code}"></span></div></article>`).join('');
  $('code-list').querySelectorAll('textarea').forEach(area => { const updateCount=()=>{ area.nextElementSibling.textContent=`${area.value.length}/50`; }; updateCount(); area.addEventListener('input',()=>{ state.descriptions[area.dataset.code]=area.value; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateCount(); }); });
}
function renderAll() { renderCalendar(); renderIcons(); renderCodes(); }
function showToast(message) { const t=$('toast'); t.textContent=message; t.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>t.classList.remove('show'),1600); }
function updateConnectionChip() { const chip=document.querySelector('.live-chip'); if (!chip) return; chip.innerHTML = `<span></span> ${serverConnected ? '공유 저장' : '기기 저장'}`; chip.style.background = serverConnected ? 'var(--mint)' : '#ffe4bf'; }
async function loadSharedState() { try { const response=await fetch('/api/state'); if (!response.ok) throw Error(); const remote=await response.json(); state={...remote, drafts:{}}; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); serverConnected=true; updateConnectionChip(); renderAll(); } catch { updateConnectionChip(); } }
function enterApp() { document.body.classList.add('authenticated'); $('login-screen').hidden=true; renderAll(); loadSharedState(); }
async function login(event) { event.preventDefault(); const input=$('login-password'); const error=$('login-error'); error.textContent=''; try { const response=await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:input.value})}); if (!response.ok) throw Error(); input.value=''; enterApp(); } catch { error.textContent='비밀번호가 맞지 않습니다.'; input.select(); } }
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===btn)); document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===btn.dataset.view)); window.scrollTo({top:0,behavior:'smooth'}); }));
$('prev-month').addEventListener('click',()=>{ cursor.setMonth(cursor.getMonth()-1); renderCalendar(); });
$('next-month').addEventListener('click',()=>{ cursor.setMonth(cursor.getMonth()+1); renderCalendar(); });
$('today-btn').addEventListener('click',()=>{ selectedDate=new Date(); cursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1); renderAll(); });
$('save-record').addEventListener('click', saveRecord);
$('edit-record').addEventListener('click', editRecord);
$('delete-record').addEventListener('click', deleteRecord);
$('edit-codes').addEventListener('click',()=>{ codeEditing=true; renderCodes(); $('code-list').querySelector('textarea')?.focus(); showToast('작업 코드 수정 모드'); });
$('save-codes').addEventListener('click',()=>{ save(); codeEditing=false; renderCodes(); showToast('작업 코드를 저장했어요'); });
$('login-form').addEventListener('submit', login);
fetch('/api/session').then(response=>{ if (response.ok) enterApp(); }).catch(()=>{});
setInterval(async()=>{ if (!document.body.classList.contains('authenticated') || document.visibilityState !== 'visible') return; try { const response=await fetch('/api/state'); if (!response.ok) return; const remote=await response.json(); if (JSON.stringify(remote)!==JSON.stringify({...state, drafts:undefined})) { state={...remote, drafts:{}}; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); serverConnected=true; updateConnectionChip(); renderAll(); } } catch {} }, 3000);
