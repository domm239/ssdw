const originalNotes = [
  { id: 'base-0', date: '11 nov 2026', body: 'Anoiteceu cedo. Deixei a lâmpada baixa e contei sete pontinhos de luz na janela. Três eram postes. Os outros eu decidi que eram estrelas.', image: '', photo: false, comments: [] },
  { id: 'base-1', date: '09 nov 2026', body: 'Queixo na mão, marca-texto laranja, capa vermelha. Não era pose. Era só o corpo lendo.', image: 'leitura', photo: true, comments: [] },
  { id: 'base-2', date: '06 nov 2026', body: 'A pauta sumiu debaixo da letra. Não era para ninguém ver — e mesmo assim o caderno ficou aberto.', image: 'tinta', photo: true, comments: [] },
  { id: 'base-3', date: '03 nov 2026', body: 'Flores prensadas na página 61. Guardar, às vezes, é achatar com cuidado.', image: 'flores', photo: true, comments: [] },
  { id: 'base-4', date: '28 out 2026', body: 'Abril de 1879, Taganrog. A máquina ainda responde. No visor, o dia 23.', image: 'máquina', photo: true, comments: [] },
  { id: 'base-5', date: '24 out 2026', body: 'Cada xícara é um dia que coube na prateleira. A amarela, a de listras, a coruja.', image: 'xícaras', photo: true, comments: [] },
  { id: 'base-6', date: '20 out 2026', body: 'O saquinho continua na xícara. Em volta, letra vermelha e uma tabela de doenças da infância. Estudo com cheiro de casa.', image: 'chá', photo: true, comments: [] },
  { id: 'base-7', date: '16 out 2026', body: 'A tela não venceu o papel. Os dois dividem a mesa, com a garrafa no meio como árbitro.', image: 'mesa', photo: true, comments: [] },
  { id: 'base-8', date: '12 out 2026', body: 'O mundo inteiro espetado. Cada alfinete é uma vontade ou uma volta.', image: 'mapa', photo: true, comments: [] },
  { id: 'base-9', date: '07 out 2026', body: 'Armário 350. Mochila, papéis, fotografias e um bilhete que insiste: you are amazing.', image: 'armário', photo: true, comments: [] },
  { id: 'base-10', date: '03 out 2026', body: 'Dostoiévski no bolso do macacão. Literatura que cabe no corpo, não no pedestal.', image: 'livro', photo: true, comments: [] },
  { id: 'base-11', date: '28 set 2026', body: 'Máscara no rosto, cabelo molhado, Daisy Jones aberto na cara. Ler também é um cuidado.', image: 'daisy', photo: true, comments: [] },
  { id: 'base-12', date: '22 set 2026', body: 'A caneca de lótus virou porta-lápis. A janela é verde-clara e a planta insiste na grade.', image: 'lótus', photo: true, comments: [] },
  { id: 'base-13', date: '18 set 2026', body: 'A torre quase some na névoa. Eu ficaria com a fachada: o ornamento, o tijolo, a janela de quem mora.', image: 'Paris', photo: true, comments: [] },
  { id: 'base-14', date: '12 set 2026', body: 'A caneca ainda está morna. O livro aberto na página que eu finjo reler.', image: 'caneca', photo: true, comments: [] },
  { id: 'base-15', date: '05 set 2026', body: 'Cadernos pretos, etiquetas que já não grudam. Memória empilhada até virar mobília.', image: 'cadernos', photo: true, comments: [] },
  { id: 'base-16', date: '01 set 2026', body: 'Não terminei o capítulo. A xícara esfriou, e isso também é um final.', image: 'leitura', photo: true, comments: [] }
];

let userNotes = readStorage('estrelario-notes', []);
let allNotes = [...userNotes, ...originalNotes];
let activeFilter = 'tudo';
let currentNote = null;
let privateProfile = readStorage('estrelario-profile', null);
let followRequests = readStorage('estrelario-follow-requests', []);
let hiddenNoteIds = readStorage('estrelario-hidden-notes', []);
let featuredIndex = 0;
let featuredPointerStart = null;
let pendingNoteImage = '';

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function persistNotes() { localStorage.setItem('estrelario-notes', JSON.stringify(userNotes)); }
function persistHiddenNotes() { localStorage.setItem('estrelario-hidden-notes', JSON.stringify(hiddenNoteIds)); }
function escapeText(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function shortTitle(note) { return note.title || note.body.split('. ')[0] + (note.body.includes('. ') ? '.' : ''); }
function setNoteImagePreview(dataUrl) {
  const preview = document.getElementById('noteImagePreview'); const image = document.getElementById('noteImagePreviewImage');
  preview.hidden = !dataUrl; image.src = dataUrl || '';
}
function optimizeNoteImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('image-failed'));
      image.onload = () => {
        const maxSize = 1400; const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .82));
      }; image.src = reader.result;
    }; reader.readAsDataURL(file);
  });
}

function renderNotes(filter = activeFilter) {
  activeFilter = filter;
  const list = document.getElementById('notesList');
  list.classList.remove('is-refreshing');
  const availableNotes = allNotes.filter(note => !hiddenNoteIds.includes(note.id));
  const shown = availableNotes.filter(note => filter === 'tudo' || (filter === 'foto' ? note.photo : !note.photo));
  document.getElementById('noteCount').textContent = availableNotes.length;
  list.innerHTML = '';
  if (!shown.length) { list.innerHTML = '<div class="empty-state">Nenhuma nota encontrou esse caminho. Talvez seja hora de escrever uma.</div>'; requestAnimationFrame(() => list.classList.add('is-refreshing')); return; }
  shown.forEach((note, index) => {
    const card = document.createElement('article');
    card.className = `note-card ${note.photo ? 'image-note' : 'text-note'}`;
    card.style.setProperty('--post-index', Math.min(index, 7));
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Abrir nota: ${shortTitle(note)}`);
    if (note.photo) {
      const image = document.createElement('div');
      image.className = 'note-image';
      if (note.imageData) { const uploadedImage = document.createElement('img'); uploadedImage.className = 'note-uploaded-image'; uploadedImage.src = note.imageData; uploadedImage.alt = note.image || 'Imagem adicionada ao post'; image.appendChild(uploadedImage); } else image.textContent = note.image || '✦';
      card.appendChild(image);
    }
    const copy = document.createElement('div');
    copy.className = 'note-copy';
    const comments = note.comments?.length ? `${note.comments.length} comentário${note.comments.length > 1 ? 's' : ''} · margem anotada` : 'margem em branco';
    copy.innerHTML = `<div class="note-meta">${escapeText(note.date)} · ${note.photo ? 'com imagem' : 'só texto'}</div><h3>${escapeText(shortTitle(note))}</h3><p>${escapeText(comments)}</p>`;
    card.appendChild(copy);
    const open = () => openNote(note.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    list.appendChild(card);
  });
  requestAnimationFrame(() => list.classList.add('is-refreshing'));
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === pageId));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === pageId));
  history.replaceState(null, '', `#${pageId}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openNote(noteId) {
  currentNote = allNotes.find(note => note.id === noteId);
  if (!currentNote || hiddenNoteIds.includes(noteId)) return;
  const availableNotes = allNotes.filter(note => !hiddenNoteIds.includes(note.id));
  const position = availableNotes.indexOf(currentNote) + 1;
  document.getElementById('modalMeta').textContent = `caderno · ${currentNote.date}`;
  document.getElementById('modalNumber').textContent = `${String(position).padStart(2, '0')} / ${String(availableNotes.length).padStart(2, '0')}`;
  document.getElementById('modalTitle').textContent = shortTitle(currentNote);
  document.getElementById('modalBody').textContent = currentNote.body;
  document.getElementById('modalImage').textContent = currentNote.image ? `imagem: ${currentNote.image}` : '';
  const modalUploadedImage = document.getElementById('modalUploadedImage'); modalUploadedImage.innerHTML = ''; modalUploadedImage.hidden = !currentNote.imageData;
  if (currentNote.imageData) { const image = document.createElement('img'); image.src = currentNote.imageData; image.alt = currentNote.image || 'Imagem adicionada ao post'; modalUploadedImage.appendChild(image); }
  document.getElementById('commentInput').value = '';
  renderComments();
  const modal = document.getElementById('noteModal');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('commentInput').focus(), 250);
}
function closeModal() {
  const modal = document.getElementById('noteModal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentNote = null;
}
function renderComments() {
  const comments = currentNote?.comments || [];
  document.getElementById('comments').innerHTML = comments.map(comment => `<div class="comment">${escapeText(comment)}</div>`).join('');
  document.getElementById('commentCount').textContent = `${comments.length} comentário${comments.length === 1 ? '' : 's'}`;
}
function addComment() {
  const input = document.getElementById('commentInput');
  const value = input.value.trim();
  if (!value || !currentNote) return;
  currentNote.comments = [...(currentNote.comments || []), value];
  if (currentNote.id.startsWith('user-')) {
    const userIndex = userNotes.findIndex(note => note.id === currentNote.id);
    if (userIndex >= 0) userNotes[userIndex] = currentNote;
    persistNotes();
  }
  input.value = '';
  renderComments();
  renderNotes();
  showToast('comentário guardado na margem');
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}
function profileInitials(profile) {
  return String(profile?.name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || '○';
}
function updateProfileAvatar() {
  const avatar = document.getElementById('profileAvatar');
  const smallAvatar = document.getElementById('profileAvatarSmall');
  const preview = document.getElementById('profilePhotoPreview');
  const initials = profileInitials(privateProfile);
  [avatar, smallAvatar, preview].forEach(element => { if (!element) return; element.textContent = privateProfile?.photo ? '' : initials; element.classList.toggle('has-initials', !privateProfile?.photo && initials !== '○'); element.classList.toggle('has-photo', Boolean(privateProfile?.photo)); element.style.backgroundImage = privateProfile?.photo ? `url("${privateProfile.photo}")` : ''; });
  document.querySelector('[data-photo-remove]')?.classList.toggle('visible', Boolean(privateProfile?.photo));
}
function syncProfileVisibilityCopy() {
  const isPrivate = document.getElementById('profileVisibility').checked;
  document.getElementById('profileVisibilityLabel').textContent = isPrivate ? 'Perfil privado' : 'Perfil público';
  document.getElementById('profileVisibilityHint').textContent = isPrivate ? 'Somente você pode ver suas informações.' : 'Seu perfil pode aparecer junto às suas notas.';
  document.getElementById('profileVisibilityBadge').innerHTML = `<span class="private-lock">${isPrivate ? '⌑' : '◌'}</span> perfil ${isPrivate ? 'privado' : 'público'}`;
  document.getElementById('profilePrivacyNote').innerHTML = isPrivate ? '<span>⌑</span><p><strong>Privado por padrão</strong><br />Seu perfil não é enviado para nenhum servidor.</p>' : '<span>◌</span><p><strong>Visibilidade pública</strong><br />Neste protótipo, a escolha fica salva localmente.</p>';
}
function persistFollowRequests() { localStorage.setItem('estrelario-follow-requests', JSON.stringify(followRequests)); }
function renderFollowRequests() {
  const list = document.getElementById('followRequestsList');
  const count = document.getElementById('followRequestCount');
  if (!list || !count) return;
  const pending = followRequests.filter(request => request.status === 'pending');
  count.textContent = pending.length;
  list.innerHTML = '';
  pending.forEach(request => {
    const item = document.createElement('div'); item.className = 'follow-request-item';
    const person = document.createElement('div'); person.className = 'follow-request-person'; person.textContent = request.name;
    const handle = document.createElement('small'); handle.textContent = request.handle || '@visitante'; person.appendChild(handle);
    const actions = document.createElement('div'); actions.className = 'follow-request-actions';
    const accept = document.createElement('button'); accept.className = 'request-action accept'; accept.type = 'button'; accept.dataset.followAction = 'accept'; accept.dataset.requestId = request.id; accept.textContent = 'aceitar';
    const decline = document.createElement('button'); decline.className = 'request-action'; decline.type = 'button'; decline.dataset.followAction = 'decline'; decline.dataset.requestId = request.id; decline.textContent = 'recusar';
    actions.append(accept, decline); item.append(person, actions); list.appendChild(item);
  });
}
function renderPostModeration() {
  const list = document.getElementById('moderationPostsList'); const count = document.getElementById('moderationPostCount');
  if (!list || !count) return;
  const availableNotes = allNotes.filter(note => !hiddenNoteIds.includes(note.id)); count.textContent = availableNotes.length; list.innerHTML = '';
  availableNotes.forEach(note => {
    const item = document.createElement('div'); item.className = 'moderation-post-item';
    const copy = document.createElement('div'); copy.className = 'moderation-post-copy'; copy.textContent = shortTitle(note);
    const meta = document.createElement('small'); meta.textContent = `${note.date} · ${note.photo ? 'com imagem' : 'só texto'}`; copy.appendChild(meta);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'moderation-remove'; remove.dataset.moderationRemove = note.id; remove.setAttribute('aria-label', `Remover post ${shortTitle(note)}`); remove.textContent = 'remover';
    item.append(copy, remove); list.appendChild(item);
  });
}
function removePostForSafety(noteId) {
  const note = allNotes.find(item => item.id === noteId); if (!note) return;
  if (!window.confirm(`Remover este post por segurança?\n\n“${shortTitle(note)}”`)) return;
  hiddenNoteIds = [...new Set([...hiddenNoteIds, noteId])]; persistHiddenNotes();
  if (noteId.startsWith('user-')) { userNotes = userNotes.filter(item => item.id !== noteId); persistNotes(); }
  allNotes = [...userNotes, ...originalNotes];
  if (currentNote?.id === noteId) closeModal();
  renderNotes(); renderPostModeration(); showToast('post removido por segurança neste navegador');
}
function getPreviewRequest() { return followRequests.find(request => request.id === 'preview-visitor'); }
function renderFollowRequestPreview() {
  const request = getPreviewRequest(); const button = document.getElementById('previewFollowButton'); const status = document.getElementById('followRequestStatus');
  if (!button || !status) return;
  button.disabled = request?.status === 'pending' || request?.status === 'accepted';
  button.textContent = request?.status === 'accepted' ? 'Você segue este perfil' : request?.status === 'pending' ? 'Solicitação enviada' : 'Solicitar para seguir';
  const symbol = document.createElement('span'); symbol.textContent = request?.status ? ' ✓' : ' ＋'; button.appendChild(symbol);
  status.textContent = request?.status === 'pending' ? 'Aguardando aprovação do dono do perfil.' : request?.status === 'accepted' ? 'Você foi aceito como seguidor.' : 'O dono decidirá quem pode acompanhar as notas.';
}
function requestToFollow() {
  const existing = getPreviewRequest();
  if (existing?.status === 'pending' || existing?.status === 'accepted') return;
  const request = { id: 'preview-visitor', name: 'Visitante da prévia', handle: '@visitante', status: 'pending', createdAt: Date.now() };
  followRequests = [...followRequests.filter(item => item.id !== request.id), request]; persistFollowRequests(); renderFollowRequestPreview(); renderFollowRequests(); showToast('solicitação enviada');
}
function resolveFollowRequest(id, status) { followRequests = followRequests.map(request => request.id === id ? { ...request, status } : request); persistFollowRequests(); renderFollowRequests(); renderFollowRequestPreview(); showToast(status === 'accepted' ? 'seguidor aceito' : 'solicitação recusada'); }
function openProfile() {
  const modal = document.getElementById('profileModal');
  if (privateProfile) {
    document.getElementById('profileName').value = privateProfile.name || '';
    document.getElementById('profileHandle').value = privateProfile.handle || '';
    document.getElementById('profileBio').value = privateProfile.bio || '';
    document.getElementById('profileVisibility').checked = privateProfile.visibility !== 'public';
    document.getElementById('profileInteraction').value = privateProfile.interaction || 'approved';
    document.getElementById('profileMessages').value = privateProfile.messages || 'nobody';
  }
  syncProfileVisibilityCopy();
  updateProfileAvatar();
  renderFollowRequests();
  renderPostModeration();
  modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeProfile() {
  const modal = document.getElementById('profileModal');
  modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
}
function profileDraft() {
  return { name: document.getElementById('profileName').value.trim() || 'Seu perfil', handle: document.getElementById('profileHandle').value.trim(), bio: document.getElementById('profileBio').value.trim(), photo: privateProfile?.photo || '', visibility: document.getElementById('profileVisibility').checked ? 'private' : 'public', interaction: document.getElementById('profileInteraction').value, messages: document.getElementById('profileMessages').value };
}
function renderProfilePreview() {
  const profile = profileDraft();
  const isPrivate = profile.visibility === 'private';
  const initials = profileInitials(profile);
  const avatar = document.getElementById('previewAvatar');
  avatar.textContent = profile.photo ? '' : initials; avatar.classList.toggle('has-initials', !profile.photo && initials !== '○'); avatar.classList.toggle('has-photo', Boolean(profile.photo)); avatar.style.backgroundImage = profile.photo ? `url("${profile.photo}")` : '';
  document.getElementById('profilePreviewTitle').textContent = profile.name;
  document.getElementById('previewHandle').textContent = profile.handle ? profile.handle : '';
  document.getElementById('previewBio').textContent = profile.bio;
  document.getElementById('previewVisibilityBadge').innerHTML = `<span class="private-lock">${isPrivate ? '⌑' : '◌'}</span> perfil ${isPrivate ? 'privado' : 'público'}`;
  document.getElementById('privatePreviewState').hidden = !isPrivate;
  document.getElementById('visitorActions').hidden = isPrivate;
  const interactionText = { nobody: 'interações desativadas', approved: 'interações somente para perfis aprovados', everyone: 'interações abertas para qualquer pessoa' }[profile.interaction];
  const messageText = { nobody: 'mensagens desativadas', approved: 'mensagens somente para perfis aprovados', everyone: 'mensagens abertas para qualquer pessoa' }[profile.messages];
  document.getElementById('previewPermissionNote').textContent = isPrivate ? 'A prévia respeita o estado privado escolhido.' : `${interactionText} · ${messageText}.`;
  document.getElementById('previewMessageButton').disabled = profile.messages === 'nobody';
  document.getElementById('previewInteractButton').disabled = profile.interaction === 'nobody';
  document.getElementById('visitorActions').classList.toggle('is-disabled', profile.messages === 'nobody' && profile.interaction === 'nobody');
  document.getElementById('followRequestArea').hidden = !isPrivate;
  renderFollowRequestPreview();
}
function openProfilePreview() {
  renderProfilePreview();
  const modal = document.getElementById('profilePreviewModal'); modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeProfilePreview() {
  const modal = document.getElementById('profilePreviewModal'); modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
}

function goToFeatured(index) {
  const slides = [...document.querySelectorAll('[data-featured-slide]')];
  const dots = [...document.querySelectorAll('.featured-dot')];
  if (!slides.length) return;
  featuredIndex = (index + slides.length) % slides.length;
  document.getElementById('featuredTrack').style.transform = `translateX(-${featuredIndex * 100}%)`;
  slides.forEach((slide, slideIndex) => { slide.setAttribute('aria-hidden', String(slideIndex !== featuredIndex)); slide.classList.remove('is-active'); });
  dots.forEach((dot, dotIndex) => { dot.classList.toggle('active', dotIndex === featuredIndex); dot.setAttribute('aria-selected', String(dotIndex === featuredIndex)); });
  document.getElementById('featuredCounter').textContent = `${String(featuredIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  requestAnimationFrame(() => slides[featuredIndex]?.classList.add('is-active'));
}
function setUpFeaturedCarousel() {
  const viewport = document.getElementById('featuredViewport');
  const slides = [...document.querySelectorAll('[data-featured-slide]')];
  const dots = document.getElementById('featuredDots');
  if (!viewport || !slides.length || !dots) return;
  slides.forEach((_, index) => { const dot = document.createElement('button'); dot.className = `featured-dot${index === 0 ? ' active' : ''}`; dot.type = 'button'; dot.role = 'tab'; dot.setAttribute('aria-label', `Ir para imagem ${index + 1}`); dot.setAttribute('aria-selected', String(index === 0)); dot.addEventListener('click', () => goToFeatured(index)); dots.appendChild(dot); });
  document.getElementById('featuredPrev').addEventListener('click', () => goToFeatured(featuredIndex - 1));
  document.getElementById('featuredNext').addEventListener('click', () => goToFeatured(featuredIndex + 1));
  viewport.addEventListener('pointerdown', event => { featuredPointerStart = event.clientX; viewport.setPointerCapture?.(event.pointerId); });
  viewport.addEventListener('pointerup', event => { if (featuredPointerStart === null) return; const distance = event.clientX - featuredPointerStart; if (Math.abs(distance) > 45) goToFeatured(featuredIndex + (distance < 0 ? 1 : -1)); featuredPointerStart = null; });
  viewport.addEventListener('pointercancel', () => { featuredPointerStart = null; });
  viewport.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') goToFeatured(featuredIndex - 1); if (event.key === 'ArrowRight') goToFeatured(featuredIndex + 1); });
  goToFeatured(0);
}

function createStars() {
  const sky = document.getElementById('sky');
  for (let index = 0; index < 105; index += 1) {
    const star = document.createElement('i');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.opacity = `${0.2 + Math.random() * .7}`;
    star.style.setProperty('--twinkle', `${2.5 + Math.random() * 4}s`);
    star.style.animationDelay = `${Math.random() * 5}s`;
    sky.appendChild(star);
  }
  for (let index = 0; index < 2; index += 1) {
    const meteor = document.createElement('i');
    meteor.className = 'meteor';
    meteor.style.left = `${58 + Math.random() * 28}%`;
    meteor.style.top = `${7 + Math.random() * 42}%`;
    meteor.style.animationDelay = `${index * 6}s`;
    sky.appendChild(meteor);
  }
}

function setUp() {
  setUpFeaturedCarousel();
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => showPage(link.dataset.page)));
  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.go)));
  document.querySelectorAll('.filter-chip').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    button.classList.add('active');
    renderNotes(button.dataset.filter);
  }));
  document.querySelectorAll('[data-filter-shortcut]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filterShortcut;
    document.querySelectorAll('[data-filter-shortcut]').forEach(tool => tool.classList.toggle('active', tool === button));
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.filter === filter));
    renderNotes(filter);
  }));
  document.querySelectorAll('[data-close-modal]').forEach(element => element.addEventListener('click', closeModal));
  document.querySelectorAll('[data-profile-open]').forEach(element => element.addEventListener('click', openProfile));
  document.querySelectorAll('[data-profile-close]').forEach(element => element.addEventListener('click', closeProfile));
  document.querySelectorAll('[data-profile-preview]').forEach(element => element.addEventListener('click', openProfilePreview));
  document.querySelectorAll('[data-profile-preview-close]').forEach(element => element.addEventListener('click', closeProfilePreview));
  document.getElementById('previewFollowButton').addEventListener('click', requestToFollow);
  document.getElementById('followRequestsList').addEventListener('click', event => { const action = event.target.closest('[data-follow-action]'); if (action) resolveFollowRequest(action.dataset.requestId, action.dataset.followAction === 'accept' ? 'accepted' : 'declined'); });
  document.getElementById('moderationPostsList').addEventListener('click', event => { const action = event.target.closest('[data-moderation-remove]'); if (action) removePostForSafety(action.dataset.moderationRemove); });
  document.getElementById('commentButton').addEventListener('click', addComment);
  document.getElementById('commentInput').addEventListener('keydown', event => { if (event.key === 'Enter') addComment(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.getElementById('noteModal').classList.contains('show')) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.getElementById('profileModal').classList.contains('show')) closeProfile(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.getElementById('profilePreviewModal').classList.contains('show')) closeProfilePreview(); });
  document.getElementById('profileForm').addEventListener('submit', event => {
    event.preventDefault();
    privateProfile = { ...privateProfile, name: document.getElementById('profileName').value.trim(), handle: document.getElementById('profileHandle').value.trim(), bio: document.getElementById('profileBio').value.trim(), visibility: document.getElementById('profileVisibility').checked ? 'private' : 'public', interaction: document.getElementById('profileInteraction').value, messages: document.getElementById('profileMessages').value };
    localStorage.setItem('estrelario-profile', JSON.stringify(privateProfile));
    updateProfileAvatar();
    document.getElementById('profileMessage').textContent = `perfil ${privateProfile.visibility === 'private' ? 'privado' : 'público'} guardado neste navegador`;
    showToast(`perfil ${privateProfile.visibility === 'private' ? 'privado' : 'público'} guardado`);
    window.setTimeout(closeProfile, 650);
  });
  document.getElementById('profileVisibility').addEventListener('change', syncProfileVisibilityCopy);
  document.querySelectorAll('[data-profile-tab]').forEach(tab => tab.addEventListener('click', () => {
    const target = tab.dataset.profileTab;
    document.querySelectorAll('[data-profile-tab]').forEach(item => { const active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
    document.querySelectorAll('[data-profile-panel]').forEach(panel => { panel.hidden = panel.dataset.profilePanel !== target; panel.classList.toggle('active', panel.dataset.profilePanel === target); });
  }));
  document.getElementById('profilePhoto').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) { event.target.value = ''; showToast('escolha uma imagem de até 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 320; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
        const context = canvas.getContext('2d'); const crop = Math.min(image.width, image.height); const x = (image.width - crop) / 2; const y = (image.height - crop) / 2;
        context.drawImage(image, x, y, crop, crop, 0, 0, size, size);
        privateProfile = { ...(privateProfile || {}), photo: canvas.toDataURL('image/jpeg', .82) };
        updateProfileAvatar();
      }; image.src = reader.result;
    }; reader.readAsDataURL(file);
  });
  document.querySelector('[data-photo-remove]').addEventListener('click', () => { privateProfile = { ...(privateProfile || {}), photo: '' }; document.getElementById('profilePhoto').value = ''; updateProfileAvatar(); });
  document.getElementById('bodyText').addEventListener('input', event => { document.getElementById('charCount').textContent = event.target.value.length; });
  document.getElementById('kind').addEventListener('change', event => { const showUpload = event.target.value === 'foto'; document.getElementById('imageUploadRow').hidden = !showUpload; if (!showUpload) { pendingNoteImage = ''; document.getElementById('imageFile').value = ''; setNoteImagePreview(''); } });
  document.getElementById('imageFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { event.target.value = ''; showToast('escolha um arquivo de imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { event.target.value = ''; showToast('escolha uma imagem de até 5 MB'); return; }
    try { pendingNoteImage = await optimizeNoteImage(file); setNoteImagePreview(pendingNoteImage); showToast('imagem pronta para o post'); } catch { event.target.value = ''; pendingNoteImage = ''; setNoteImagePreview(''); showToast('não foi possível carregar a imagem'); }
  });
  document.getElementById('removeNoteImage').addEventListener('click', () => { pendingNoteImage = ''; document.getElementById('imageFile').value = ''; setNoteImagePreview(''); });
  document.getElementById('noteForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') || '').trim();
    const body = String(form.get('bodyText') || '').trim();
    if (!title || !body) return;
    const dateValue = String(form.get('date') || '');
    let date = 'hoje';
    if (dateValue) date = new Date(`${dateValue}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
    const note = { id: `user-${Date.now()}`, title, date, body, image: String(form.get('imageDesc') || '').trim(), imageData: pendingNoteImage, photo: form.get('kind') === 'foto', comments: [] };
    userNotes.unshift(note); allNotes = [...userNotes, ...originalNotes]; persistNotes();
    event.currentTarget.reset(); pendingNoteImage = ''; document.getElementById('charCount').textContent = '0'; document.getElementById('imageUploadRow').hidden = true; setNoteImagePreview(''); renderNotes(); showPage('notas'); showToast('nota guardada no caderno');
  });
  const initialPage = window.location.hash.replace('#', '');
  if (['notas', 'estetica', 'escrever'].includes(initialPage)) showPage(initialPage);
  updateProfileAvatar(); renderNotes(); createStars();
}

document.addEventListener('DOMContentLoaded', setUp);
