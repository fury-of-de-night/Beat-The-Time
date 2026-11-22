'use strict';

const audienceOptions = [
  ['public','Public'], ['private','Private (only me)'],
  ['friends','Friends'], ['selected','Specific friends']
];
const socialButton = (text, action, style) => button(text,'social:'+action,style);
const sampleAccounts = [
  {id:'demo', name:'demo'},
  {id:'maya', name:'maya'},
  {id:'jordan', name:'jordan'},
  {id:'admin', name:'coach', admin:true}
];
function socialData() {
  return state.social ?? {
    viewer:'demo',
    profiles:{},
    friendships:[
      {from:'demo',to:'maya',status:'accepted'},
      {from:'jordan',to:'demo',status:'pending'}
    ],
    groups:[{id:'focus',title:'Sunday study group',owner:'maya',audience:'public',selected:[],url:''}],
    messages:[{group:'focus',author:'maya',text:'What are you working on this week?'}],
    quotes:[{id:'first',author:'admin',text:'When a goal feels too big, give yourself ten minutes to start.',status:'approved',published:''}],
    reports:[]
  };
}
const person = account => sampleAccounts.find(user => user.id === account);
const viewer = () => person(socialData().viewer);
const pair = (relation, a, b) => (relation.from === a && relation.to === b) || (relation.from === b && relation.to === a);
const relationship = (a, b) => socialData().friendships.find(relation => pair(relation,a,b));
const friendsWith = (a, b) => relationship(a,b)?.status === 'accepted';
function canSee(owner, audience, selected = []) {
  const who = viewer().id;
  return who === owner || audience === 'public' ||
    (friendsWith(owner,who) && (audience === 'friends' || (audience === 'selected' && selected.includes(who))));
}
const saveSocial = (changes, message) => save({...state, social:{...socialData(),...changes}},message);
const audienceName = value => audienceOptions.find(([id]) => id === value)?.[1];
function sharingFields(record = {audience:'private',selected:[]}) {
  const list = sampleAccounts.filter(user => friendsWith(viewer().id,user.id));
  return `<label>Who can see this?<select name="audience">${options(audienceOptions,record.audience)}</select></label>
    <label>Specific friends<select name="selected" multiple size="3">${list.map(user => `<option value="${user.id}" ${record.selected.includes(user.id) ? 'selected' : ''}>${esc(user.name)}</option>`).join('')}</select></label>
    <p class="sub">Use the list only with Specific friends.</p>`;
}
function sharing(data) {
  const selected = data.audience === 'selected'
    ? data.selected.filter(account => friendsWith(viewer().id,account))
    : [];
  if (data.audience === 'selected' && selected.length === 0) throw Error('Choose at least one friend.');
  return {audience:data.audience,selected};
}
function whatsappUrl(value) {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw Error('Enter a valid WhatsApp group invite link.'); }
  if (url.origin !== 'https://chat.whatsapp.com' || url.username || url.password || !/^\/[a-zA-Z0-9]+\/?$/.test(url.pathname)) {
    throw Error('Use a group invite link from https://chat.whatsapp.com/.');
  }
  return url.origin + url.pathname;
}
function profileRow(user) {
  const me = viewer();
  const relation = relationship(me.id,user.id);
  const profile = socialData().profiles[user.id];
  const phone = profile?.phone && canSee(user.id,profile.audience,profile.selected)
    ? `<small>Phone · ${esc(profile.phone)}</small>` : '';
  let request = socialButton('Add friend','friend:'+user.id);
  if (relation?.status === 'accepted') request = '<small>Friends</small>';
  else if (relation?.from === me.id) request = '<small>Request sent</small>';
  else if (relation) request = socialButton('Accept','accept:'+user.id) + socialButton('Decline','decline:'+user.id);
  return `<div class="row social-row" data-person="${user.id}"><div class="row-body"><h3>${esc(user.name)}${user.admin ? ' (admin)' : ''}</h3>${phone}</div><div class="social-actions">${request}${socialButton('Report','report:user:'+user.id)}</div></div>`;
}
function groupsView(detail) {
  const data = socialData();
  const groups = data.groups.filter(group => canSee(group.owner,group.audience,group.selected));
  if (!detail) {
    return heading('Groups','Start a chat here or share a WhatsApp group invite.',socialButton('Create group','group','primary'))
      + panel('Groups you can see',groups.map(group => `<div class="row"><div class="row-body"><h3><a href="#groups/${group.id}">${esc(group.title)}</a></h3><small>${audienceName(group.audience)} · ${group.url ? 'WhatsApp' : 'Site chat'}</small></div></div>`).join('') || empty('No groups to show.'));
  }
  const group = groups.find(item => item.id === detail);
  if (!group) return heading('Group unavailable','This group is missing or outside your audience.') + '<a href="#groups">Back to groups</a>';
  const messages = data.messages.filter(message => message.group === group.id);
  const body = group.url
    ? `<p class="sub"><a class="secondary" href="${esc(group.url)}" target="_blank" rel="noopener noreferrer">Open in WhatsApp ↗</a></p>`
    : panel('Group chat',messages.map(message => `<div class="row"><div class="row-body"><h3>${esc(person(message.author)?.name)}</h3><p class="note">${esc(message.text)}</p></div></div>`).join('') || empty('Start the conversation.'),socialButton('Write message','message:'+group.id,'primary'));
  return '<a href="#groups">← Groups</a>'
    + heading(esc(group.title),audienceName(group.audience))
    + `<div class="social-actions group-actions">${socialButton('Copy group link','share:'+group.id)}${group.owner === viewer().id ? socialButton('Edit group','group:'+group.id) : ''}${socialButton('Report group','report:group:'+group.id)}</div>`
    + body;
}
function quoteRow(quote, controls) {
  const author = person(quote.author);
  return `<div class="row social-row"><div class="row-body"><blockquote>${esc(quote.text)}</blockquote><small>~ ${esc(author.name)}${author.admin ? '(admin)' : ''}</small></div><div class="social-actions">${controls}</div></div>`;
}
function motivationView() {
  const {quotes,reports} = socialData();
  const me = viewer();
  const approved = quotes.filter(quote => quote.status === 'approved' && quote.published <= today())
    .sort((a,b) => b.published.localeCompare(a.published));
  const featured = approved.shift();
  const pending = quotes.filter(quote => quote.status === 'pending' && (me.admin || quote.author === me.id));
  return heading('Daily motivation',me.admin ? 'Publish a quote or review member submissions.' : 'Send in a quote for an admin to review.',socialButton(me.admin ? 'Publish quote' : 'Submit quote','quote','primary'))
    + panel('Today’s quote',featured ? quoteRow(featured,socialButton('Report','report:quote:'+featured.id)) : empty('No quote has been published yet.'))
    + (approved.length ? panel('Previous quotes',approved.map(quote => quoteRow(quote,socialButton('Report','report:quote:'+quote.id))).join('')) : '')
    + panel(me.admin ? 'Awaiting approval' : 'Your pending quotes',pending.map(quote => quoteRow(quote,me.admin ? socialButton('Approve','approve:'+quote.id) + socialButton('Decline','reject:'+quote.id) : '')).join('') || empty('No quotes waiting.'))
    + (me.admin ? panel('Reports',reports.map(report => {
      const title = report.kind === 'user' ? person(report.target)?.name
        : report.kind === 'group' ? socialData().groups.find(group => group.id === report.target)?.title
        : quotes.find(quote => quote.id === report.target)?.text;
      return `<div class="row"><div class="row-body"><h3>${esc(report.kind)} · ${esc(title)}</h3><small>${esc(report.reason)} · from ${esc(person(report.author)?.name)}</small></div>${report.reviewed ? '<small>Reviewed</small>' : socialButton('Mark reviewed','review:'+report.id)}</div>`;
    }).join('') || empty('No reports yet.')) : '');
}
function socialView(route,detail) {
  const tools = `<div class="social-demo">Social demo · Use sample details only. ${socialButton('Switch sample account','switch')}</div>`;
  if (route === 'groups') return tools + groupsView(detail);
  if (route === 'motivation') return tools + motivationView();
  const users = sampleAccounts.filter(user => user.id !== viewer().id);
  return tools + heading('Friends','Find people by username and manage requests.',socialButton('Account and privacy','account'))
    + '<p class="friend-notice" role="note">Only accept requests from people you know. Check the username before sharing your phone number or a private group.</p>'
    + panel('Friend requests', users.filter(user => {
      const relation = relationship(user.id,viewer().id);
      return relation?.status === 'pending' && relation.to === viewer().id;
    }).map(profileRow).join('') || empty('No incoming requests.'))
    + panel('Find people',`<label class="friend-search">Search by username<input type="search" id="friend-search" autocomplete="off"></label><p class="empty" id="no-friends" hidden>No matching usernames.</p><div id="people">${users.map(profileRow).join('')}</div>`);
}
function socialAction(name) {
  const [,action,target,subject] = name.split(':');
  const data = socialData();
  const me = viewer();
  if (action === 'switch') {
    openEditor('Switch sample account','Switch account',`<label>Sample account<select name="viewer">${options(sampleAccounts.map(user => [user.id,user.name + (user.admin ? ' (admin)' : '')]),me.id)}</select></label>`,
      form => saveSocial({viewer:form.viewer},'Sample account switched.'));
    return;
  }
  if (action === 'account') {
    const profile = data.profiles[me.id];
    openEditor('Account and privacy','Save privacy settings',
      `<label>Sample phone number (optional)<input type="tel" name="phone" maxlength="25" value="${esc(profile?.phone)}"></label>${sharingFields(profile)}`, form => {
        if (form.phone && !/^\+?[\d ()-]{7,25}$/.test(form.phone)) throw Error('Enter a sample phone number.');
        saveSocial({profiles:{...data.profiles,[me.id]:{phone:form.phone,...sharing(form)}}},'Privacy settings saved.');
      });
    return;
  }
  if (['friend','accept','decline'].includes(action)) {
    const relation = relationship(me.id,target);
    if (!person(target) || target === me.id) return;
    if (action === 'friend' && !relation) {
      saveSocial({friendships:[...data.friendships,{from:me.id,to:target,status:'pending'}]},'Friend request sent.');
    } else if (relation?.status === 'pending' && relation.to === me.id) {
      const remaining = data.friendships.filter(item => !pair(item,me.id,target));
      if (action === 'accept') remaining.push({...relation,status:'accepted'});
      if (action !== 'friend') saveSocial({friendships:remaining},action === 'accept' ? 'Friend request accepted.' : 'Friend request declined.');
    }
    return;
  }
  const group = data.groups.find(item => item.id === target);
  if (action === 'group') {
    if (target && group?.owner !== me.id) return;
    openEditor(group ? 'Edit group' : 'Create group','Save group',titleInput(group?.title) +
      `<label>WhatsApp group invite (optional)<input type="url" name="url" value="${esc(group?.url)}"></label><p class="sub">Leave blank for a chat on this site. WhatsApp invite links can be forwarded by anyone you share them with.</p>${sharingFields(group)}`, form => {
        const updated = {id:group?.id || id(),owner:me.id,title:form.title,url:whatsappUrl(form.url),...sharing(form)};
        saveSocial({groups:group ? data.groups.map(item => item.id === group.id ? updated : item) : [...data.groups,updated]},'Group saved.');
        location.hash = 'groups/'+updated.id;
      });
    return;
  }
  if (action === 'message' || action === 'share') {
    if (!group || !canSee(group.owner,group.audience,group.selected)) return;
    if (action === 'share') {
      const url = new URL(location.href);
      url.hash = 'groups/'+group.id;
      const fallback = () => openEditor('Group link','Done',`<label>Copy this link<input readonly value="${esc(url.href)}"></label><p class="sub">Demo group links work in this browser.</p>`,() => {});
      if (navigator.clipboard) navigator.clipboard.writeText(url.href).then(() => notify('Demo group link copied.'),fallback);
      else fallback();
    } else if (!group.url) {
      openEditor('Write message','Send message','<label>Message<textarea name="text" maxlength="500" required></textarea></label>',form => {
        if (!form.text) throw Error('Enter a message.');
        saveSocial({messages:[...data.messages,{group:group.id,author:me.id,text:form.text}]},'Message sent in this demo.');
      });
    }
    return;
  }
  if (action === 'quote') {
    openEditor(me.admin ? 'Publish quote' : 'Submit quote',me.admin ? 'Publish' : 'Send for approval',
      '<label>Quote<textarea name="text" maxlength="350" required></textarea></label>' +
      (me.admin ? `<label>Publish date<input type="date" name="published" value="${today()}" required></label>` : ''), form => {
        if (!form.text) throw Error('Enter a quote.');
        const quote = {id:id(),author:me.id,text:form.text,status:me.admin ? 'approved' : 'pending',published:form.published || ''};
        saveSocial({quotes:[quote,...data.quotes]},me.admin ? 'Quote saved for publication.' : 'Quote submitted for review.');
      });
    return;
  }
  if (me.admin && ['approve','reject'].includes(action)) {
    const quote = data.quotes.find(item => item.id === target && item.status === 'pending');
    if (!quote) return;
    const approved = action === 'approve';
    openEditor(approved ? 'Approve quote' : 'Decline quote',approved ? 'Approve' : 'Decline',
      approved ? `<label>Publish date<input type="date" name="published" value="${today()}" required></label>`
        : '<p class="sub">This quote will be removed from the review queue.</p>', form => {
        const updated = {...quote,status:approved ? 'approved' : 'rejected',published:form.published || ''};
        saveSocial({quotes:[updated,...data.quotes.filter(item => item.id !== target)]},approved ? 'Quote approved.' : 'Quote declined.');
      });
    return;
  }
  if (action === 'report') {
    const reportedGroup = data.groups.find(item => item.id === subject);
    const allowed = {
      user: Boolean(person(subject) && subject !== me.id),
      group: reportedGroup && canSee(reportedGroup.owner,reportedGroup.audience,reportedGroup.selected),
      quote: data.quotes.some(item => item.id === subject && item.status === 'approved' && item.published <= today())
    };
    if (!allowed[target]) return;
    openEditor('Report '+target,'Send report','<label>What happened?<textarea name="reason" maxlength="350" required></textarea></label>',form => {
      if (!form.reason) throw Error('Enter a reason.');
      saveSocial({reports:[...data.reports,{id:id(),kind:target,target:subject,author:me.id,reason:form.reason}]},'Report sent to the demo review queue.');
    });
    return;
  }
  if (action === 'review' && me.admin) {
    saveSocial({reports:data.reports.map(report => report.id === target ? {...report,reviewed:true} : report)},'Report marked reviewed.');
  }
}

document.addEventListener('input',event => {
  if (event.target.id !== 'friend-search') return;
  const query = event.target.value.trim().toLowerCase();
  const rows = [...document.querySelectorAll('#people [data-person]')];
  for (const row of rows) row.hidden = !person(row.dataset.person).name.toLowerCase().includes(query);
  document.querySelector('#no-friends').hidden = rows.some(row => !row.hidden);
});
