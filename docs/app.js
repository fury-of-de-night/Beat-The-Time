'use strict';

const paths = {
  timer:'<circle cx="12" cy="14" r="8"/><path d="M10 2h4m-2 4V2m6 5 2-2m-8 5v4l3 2"/>',
  home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  habit:'<path d="M20 7H6l3-3M4 17h14l-3 3M4 14v3m16-7V7"/>',
  tasks:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
  flask:'<path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8"/>',
  settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="m6 6 12 12M6 18 18 6"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  spark:'<path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const $ = selector => document.querySelector(selector);
const dateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return ['year','month','day'].map(type => parts.find(part => part.type === type).value).join('-');
};
const noon = key => new Date(key + 'T12:00:00');
const shift = (key, days) => {
  const date = noon(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
};
const weekStart = key => shift(key, -((noon(key).getDay() + 6) % 7));
const today = () => dateKey();
const shortDate = key => key ? noon(key).toLocaleDateString(undefined,{month:'short',day:'numeric'}) : 'No deadline';
const fullDate = () => new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
const key = 'beat-the-time-demo-v1';
function seed() {
  const date = today();
  return {
    mode:'gentle',
    goals:[
      {id:'g1',title:'Read 3 books this month',description:'Make a little time to read after dinner.',date:shift(date,18),created:shift(date,-6),status:'active'},
      {id:'g2',title:'Build a morning routine',description:'Start the day with a few small habits that feel good.',date:shift(date,12),created:shift(date,-6),status:'active'}
    ],
    habits:[
      {id:'h1',title:'Read for 20 minutes',frequency:'daily',created:shift(date,-3)},
      {id:'h2',title:'Take a walk',frequency:'daily',created:shift(date,-2)},
      {id:'h3',title:'Plan the week',frequency:'weekly',created:date}
    ],
    tasks:[
      {id:'t1',title:'Choose three books',goal:'g1',done:true},
      {id:'t2',title:'Finish the first book',goal:'g1',done:true},
      {id:'t3',title:'Finish the second book',goal:'g1',done:false},
      {id:'t4',title:'Finish the third book',goal:'g1',done:false},
      {id:'t5',title:'Set a consistent wake-up time',goal:'g2',done:true},
      {id:'t6',title:'Prepare a glass of water',goal:'g2',done:false},
      {id:'t7',title:'Try the routine for a week',goal:'g2',done:false}
    ],
    logs:[
      {id:'l1',item:'h1',date:shift(date,-3),status:'done',note:''},
      {id:'l2',item:'h1',date:shift(date,-2),status:'done',note:''},
      {id:'l3',item:'h1',date:shift(date,-1),status:'done',note:''},
      {id:'l4',item:'h2',date:shift(date,-1),status:'done',note:''}
    ]
  };
}
function read() {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed();
  } catch {
    return seed();
  }
}
let state = read();
let saveAction;
let toastTimer;
const routes = [
  ['today','Today','home','Overview'],
  ['check-in','Check-in','check','Check-in'],
  ['goals','Goals','target','Goals'],
  ['habits','Habits','habit','Habits'],
  ['tasks','To-dos','tasks','To-dos']
];
const statusNames = {done:'Done',partial:'Partial',missed:'Missed'};
const rewards = {done:10,partial:5,missed:0};
const id = () => crypto.randomUUID();
const findItem = item => [...state.habits,...state.goals].find(entry => entry.id === item);
const todayLog = item => state.logs.find(log => log.item === item && log.date === today());
const meta = habit => `${habit.frequency === 'weekly' ? 'Weekly' : 'Daily'} · ${streak(habit)} ${habit.frequency === 'weekly' ? 'week' : 'day'} streak`;

// Static preview adapter. Production calculations belong in Supabase.
function streak(habit) {
  const weekly = habit.frequency === 'weekly';
  const period = weekly ? weekStart : value => value;
  const step = weekly ? 7 : 1;
  const logs = state.logs.filter(log => log.item === habit.id);
  const done = new Set(logs.filter(log => log.status === 'done').map(log => period(log.date)));
  if (state.mode === 'gentle') return done.size;
  const first = period(habit.created);
  let cursor = period(today());
  if (!done.has(cursor) && !logs.some(log => log.status === 'missed' && period(log.date) === cursor)) cursor = shift(cursor,-step);
  let count = 0;
  while (cursor >= first && done.has(cursor)) {
    count++;
    cursor = shift(cursor,-step);
  }
  return count;
}
function stats() {
  const week = weekStart(today());
  const logs = state.logs.filter(log => log.date >= week && log.date <= today());
  const awards = state.goals.filter(goal => goal.status === 'completed' && goal.completed >= week);
  return [logs.reduce((sum,log) => sum + rewards[log.status],awards.length * 50),logs.filter(log => log.status === 'done').length,state.goals.filter(goal => goal.status === 'active').length];
}
function progress(goal) {
  const tasks = state.tasks.filter(task => task.goal === goal);
  const done = tasks.filter(task => task.done).length;
  return {done,total:tasks.length,percent:tasks.length ? Math.round(done / tasks.length * 100) : 0};
}
function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; },3400);
}
function save(next,message) {
  try {
    localStorage.setItem(key,JSON.stringify(next));
  } catch {
    throw new Error('Could not save in this browser. Check available storage and try again.');
  }
  state = next;
  render();
  notify(message);
}
const button = (label, action, style = 'secondary', symbol = '') => `<button type="button" class="${style}" data-action="${action}">${symbol ? icon(symbol) : ''}${label}</button>`;
const empty = text => `<p class="empty">${text}</p>`;
const heading = (title,subtitle,action = '',eyebrow = '') => `<div class="page-head"><div>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h1>${title}</h1><p class="sub">${subtitle}</p><small class="mobile-demo">Demo · Changes stay in this browser.</small></div>${action}</div>`;
const panel = (title, rows, link = '') => `<section class="panel"><div class="panel-head"><h2>${title}</h2>${link}</div>${rows}</section>`;
function entryRow(item) {
  const log = todayLog(item.id);
  const habit = Boolean(item.frequency);
  return `<div class="row"><span class="badge ${habit ? '' : 'green'}">${icon(habit ? 'habit' : 'target')}</span><div class="row-body"><h3>${esc(item.title)}</h3><small>${habit ? meta(item) : 'Goal · ' + shortDate(item.date)}</small></div>${log ? `<span class="done">${statusNames[log.status]}</span>` : button('Check in','log:'+item.id)}</div>`;
}
function goalRow(goal) {
  const value = progress(goal.id);
  return `<div class="goal"><div class="goal-label"><h3><a href="#goals/${goal.id}">${esc(goal.title)}</a></h3><span>${value.percent}%</span></div><progress max="100" value="${value.percent}" aria-label="${esc(goal.title)} progress"></progress><small>${value.done} of ${value.total} to-dos · ${goal.status === 'completed' ? 'Completed' : shortDate(goal.date)}</small></div>`;
}
const taskRow = task => `<div class="row"><label class="task-label"><input type="checkbox" data-task="${task.id}" ${task.done ? 'checked' : ''}><span>${esc(task.title)}</span></label></div>`;
const logRow = log => `<div class="row"><span class="badge green">${icon('check')}</span><div class="row-body"><h3>${esc(findItem(log.item)?.title)}</h3><small>${shortDate(log.date)} · ${statusNames[log.status]}${rewards[log.status] ? ' · +' + rewards[log.status] + ' points' : ''}</small>${log.note ? `<small class="note">${esc(log.note)}</small>` : ''}</div></div>`;
const activeGoals = () => state.goals.filter(goal => goal.status === 'active');
const checkItems = () => [...state.habits.filter(habit => habit.frequency === 'daily' || todayLog(habit.id) || !state.logs.some(log => log.item === habit.id && log.date >= weekStart(today()))),...activeGoals()];
function dashboard() {
  const values = stats();
  const cards = [['Weekly points','bolt',''],['Check-ins this week','check','green'],['Goals in progress','target','peach']];
  return heading('Your daily overview','Track your habits and see how your goals are progressing.',button('New goal','goal','primary','plus'),fullDate())
    + `<section class="hero"><div class="orbit" aria-hidden="true"><span>${icon('timer')}</span></div><p class="kicker">${icon('spark')} ${state.mode === 'gentle' ? 'GENTLE MODE' : 'STRICT MODE'}</p><h2>Progress at your pace.</h2><p>${state.mode === 'gentle' ? 'Miss a day? Your streak can wait. Check in whenever you’re ready.' : 'Stay on track with your daily and weekly check-ins.'}</p><a class="hero-button" href="#check-in">Daily check-in ${icon('arrow')}</a></section>`
    + `<div class="stats">${cards.map(([label,name,color],index) => `<div class="stat"><span class="badge ${color}">${icon(name)}</span><div><strong>${values[index]}</strong><small>${label}</small></div></div>`).join('')}</div>`
    + `<div class="grid">${panel('Ready to check in',checkItems().slice(0,3).map(entryRow).join('') || empty('Add a habit or goal to get started.'),'<a href="#check-in">View all →</a>')}${panel('Goal progress',activeGoals().slice(0,3).map(goalRow).join('') || empty('Your active goals will appear here.'),'<a href="#goals">View goals →</a>')}</div>`;
}
function view(route, detail) {
  if (route === 'check-in') return heading('Daily check-in','Reflect on your habits and goals for today.')
    + panel('Today',checkItems().map(entryRow).join('') || empty('Add a habit or goal to start checking in.'))
    + `<div class="section"></div>` + panel('Recent check-ins',[...state.logs].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10).map(logRow).join('') || empty('Your check-ins will appear here.'));
  if (route === 'goals' && detail) {
    const goal = state.goals.find(entry => entry.id === detail);
    if (goal) return heading(esc(goal.title),shortDate(goal.date),button('Edit goal','goal:'+goal.id))
      + `<section class="panel details"><p class="sub">${esc(goal.description)}</p>${goalRow(goal)}${goal.status === 'active' ? button('Complete goal','complete:'+goal.id) : ''}</section>`
      + `<div class="grid">${panel('Linked to-dos',state.tasks.filter(task => task.goal === goal.id).map(taskRow).join('') + button('Add to-do','task:'+goal.id,'secondary','plus'))}${panel('Check-in history',state.logs.filter(log => log.item === goal.id).slice().reverse().map(logRow).join('') || empty('No check-ins yet.'))}</div>`;
  }
  if (route === 'goals') return heading('Goals','Set a deadline and break your goal into smaller steps.',button('New goal','goal','primary','plus'))
    + panel('Your goals',state.goals.map(goalRow).join('') || empty('Create a goal to get started.'));
  if (route === 'habits') return heading('Habits','Track recurring actions and build your streak.',button('New habit','habit','primary','plus'))
    + panel('Your habits',state.habits.map(habit => `<div class="row"><span class="badge">${icon('habit')}</span><div class="row-body"><h3>${esc(habit.title)}</h3><small>${meta(habit)}</small></div>${button('Edit','habit:'+habit.id)}</div>`).join('') || empty('Create a habit to get started.'));
  if (route === 'tasks') return heading('To-dos','Finish standalone tasks or link them to a goal.',button('New to-do','task','primary','plus'))
    + panel('Open to-dos',state.tasks.filter(task => !task.done).map(taskRow).join('') || empty('You’re all caught up.'))
    + '<div class="section"></div>' + panel('Completed',state.tasks.filter(task => task.done).map(taskRow).join('') || empty('Completed tasks will appear here.'));
  return dashboard();
}
function render() {
  const [requested,detail] = location.hash.slice(1).split('/');
  const current = routes.find(route => route[0] === requested) || routes[0];
  $('#top-label').textContent = current[3];
  $('#nav').innerHTML = routes.map(([name,label,symbol]) => `<a class="nav-link" href="#${name}" ${current[0] === name ? 'aria-current="page"' : ''}>${icon(symbol)}${label}</a>`).join('');
  $('#content').innerHTML = view(current[0],detail);
}
function openEditor(title,label,fields,action) {
  $('#form-title').textContent = title;
  $('#submit').textContent = label;
  $('#fields').innerHTML = fields;
  $('#error').textContent = '';
  saveAction = action;
  if (!$('#editor').open) $('#editor').showModal();
  $('#fields').querySelector('input, select, textarea')?.focus();
}
const options = (items,selected) => items.map(([value,label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const titleInput = value => `<label>Title<input name="title" required maxlength="100" value="${esc(value)}"></label>`;
function action(name) {
  const [type,entryId] = name.split(':');
  if (type === 'goal') {
    const goal = state.goals.find(entry => entry.id === entryId);
    openEditor(goal ? 'Edit goal' : 'New goal','Save goal',titleInput(goal?.title) +
      `<label>Description<textarea name="description" maxlength="500" rows="3">${esc(goal?.description)}</textarea></label><label>Target date<input name="date" type="date" value="${esc(goal?.date || shift(today(),7))}" required></label>`,data => {
      const updated = {...(goal || {id:id(),created:today(),status:'active'}),...data};
      save({...state,goals:goal ? state.goals.map(item => item.id === goal.id ? updated : item) : [...state.goals,updated]},'Goal saved.');
    });
  } else if (type === 'habit') {
    const habit = state.habits.find(entry => entry.id === entryId);
    openEditor(habit ? 'Edit habit' : 'New habit','Save habit',titleInput(habit?.title) +
      `<label>Frequency<select name="frequency">${options([['daily','Daily'],['weekly','Weekly']],habit?.frequency)}</select></label>`,data => {
      const updated = {...(habit || {id:id(),created:today()}),...data};
      save({...state,habits:habit ? state.habits.map(item => item.id === habit.id ? updated : item) : [...state.habits,updated]},'Habit saved.');
    });
  } else if (type === 'task') {
    openEditor('New to-do','Save to-do',titleInput('') +
      `<label>Linked goal<select name="goal">${options([['','No linked goal'],...activeGoals().map(goal => [goal.id,goal.title])],entryId)}</select></label>`,
      data => save({...state,tasks:[...state.tasks,{id:id(),done:false,...data}]},'To-do saved.'));
  } else if (type === 'log') {
    const item = findItem(entryId);
    if (!item || todayLog(entryId)) return;
    openEditor('Check in','Save check-in',`<p class="sub">${esc(item.title)}</p><label>Status<select name="status">${options(Object.entries(statusNames),'done')}</select></label><label>Note (optional)<textarea name="note" maxlength="500" rows="3"></textarea></label>`,data => {
      const latest = read();
      if (latest.logs.some(log => log.item === entryId && log.date === today())) throw new Error('A check-in already exists for today.');
      save({...latest,logs:[...latest.logs,{id:id(),item:entryId,date:today(),...data}]},rewards[data.status] ? `Check-in saved. +${rewards[data.status]} points.` : 'Check-in saved.');
    });
  } else if (type === 'complete') {
    openEditor('Complete goal','Complete goal','<p class="sub">Complete this goal and earn 50 points?</p>',() => {
      const latest = read();
      save({...latest,goals:latest.goals.map(goal => goal.id === entryId && goal.status === 'active' ? {...goal,status:'completed',completed:today()} : goal)},'Goal completed.');
    });
  } else if (type === 'settings') {
    openEditor('Demo settings','Save settings',`<label>Motivation style<select name="mode">${options([['gentle','Gentle'],['strict','Strict']],state.mode)}</select></label><p class="sub">Gentle keeps your streak after a missed period. Strict resets it. Dates use this device’s timezone.</p><div class="dialog-actions">${button('Reset demo','reset','secondary danger')}</div>`,data => save({...state,...data},'Settings saved.'));
  } else if (type === 'reset') {
    openEditor('Reset demo?','Reset demo','<p class="sub">This removes your changes in this browser and restores the sample goals, habits and check-ins.</p>',() => save(seed(),'Sample data restored.'));
  }
}
document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
document.addEventListener('click',event => {
  const control = event.target.closest('[data-action]');
  if (control) action(control.dataset.action);
});
document.addEventListener('change',event => {
  const input = event.target.closest('[data-task]');
  if (!input) return;
  try {
    save({...state,tasks:state.tasks.map(task => task.id === input.dataset.task ? {...task,done:input.checked} : task)},input.checked ? 'To-do completed.' : 'To-do reopened.');
    document.querySelector(`[data-task="${input.dataset.task}"]`)?.focus();
  } catch (error) {
    input.checked = !input.checked;
    notify(error.message);
  }
});
$('#form').addEventListener('submit',event => {
  event.preventDefault();
  const data = Object.fromEntries([...new FormData(event.currentTarget)].map(([name,value]) => [name,value.trim()]));
  try {
    if ('title' in data && !data.title) throw new Error('Enter a title.');
    saveAction(data);
    $('#editor').close();
  } catch (error) {
    $('#error').textContent = error.message;
  }
});
for (const selector of ['#close','#cancel']) $(selector).onclick = () => $('#editor').close();
for (const selector of ['#settings','#mobile-settings']) $(selector).onclick = () => action('settings');
$('#translate').onclick = () => notify('Translations coming soon.');
const languages = [['en','Translation'],['es','Traducción'],['zh-Hans','翻译'],['pt','Tradução'],['nl','Vertaling'],['fr','Traduction']];
let language = 0;
$('#language').classList.add('translation-label');
setInterval(() => {
  const label = $('#language');
  language = (language + 1) % languages.length;
  const update = () => {
    const [code,text] = languages[language];
    label.lang = code;
    label.textContent = text;
    label.style.opacity = '1';
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) update();
  else {
    label.style.opacity = '0';
    setTimeout(update,160);
  }
},5000);
window.addEventListener('hashchange',() => { render(); window.scrollTo(0,0); });
window.addEventListener('storage',event => {
  if (event.key === key || event.key === null) {
    state = read();
    render();
  }
});
render();
