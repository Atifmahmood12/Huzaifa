// Small client script to populate pages and handle YouTube in-site embeds
// Site-specific configuration: fallback channel and profile image. Update as needed.
const SITE_CONFIG = {
  defaultChannelUrl: 'https://www.youtube.com/@GamingBricks-67',
  profileAvatar: '/assets/img/profile.jpg',
  channelHandle: '@GamingBricks-67'
};
// Optionally loaded from /assets/config.json (not committed); see assets/config.example.json
let YT_API_KEY = null;
let PROG_DATA = { sites: [], categories: [] };
let _CURRENT_CHANNEL_ITEM = null;

// Helper: safely append autoplay query param to an embed URL
function addAutoplayParam(url, autoplay){
  try{
    if(!url) return url;
    // if url already contains autoplay param, don't add
    if(/[?&]autoplay=/.test(url)) return url;
    return url + (url.indexOf('?') === -1 ? '?autoplay=' + (autoplay?1:0) : '&autoplay=' + (autoplay?1:0));
  }catch(e){ return url; }
}

async function loadData(){
  try{
    const res = await fetch('/categories.json', {cache: 'no-store'});
    const data = await res.json();
    PROG_DATA = data || {};
    renderSites(PROG_DATA.sites || []);
    renderCategoryDropdown(PROG_DATA.categories || []);
    // if a category is selected by URL hash, use it; otherwise pick first
    const initial = location.hash ? location.hash.replace('#','') : (PROG_DATA.categories && PROG_DATA.categories[0] && PROG_DATA.categories[0].id);
    if(initial) showCategory(initial);
    // attempt to load a channel embed (optional)
    // load optional config (contains api key) and then try load channel
    await loadOptionalConfig();
    tryLoadChannelEmbed();
  }catch(e){
    console.error('Failed to load categories.json', e);
    const catEl = document.getElementById('categories');
    if(catEl) catEl.innerText = 'Could not load categories.json.';
  }
}

async function loadOptionalConfig(){
  try{
    const res = await fetch('/assets/config.json', {cache:'no-store'});
    if(!res.ok) return;
    const cfg = await res.json();
    if(cfg && cfg.ytApiKey) YT_API_KEY = cfg.ytApiKey;
  }catch(e){ /* ignore - no config present */ }
}

// Given a channel url or handle, try to resolve channel info using YouTube Data API v3.
async function fetchChannelDataFromHandleOrUrl(handleOrUrl){
  if(!YT_API_KEY) return null;
  try{
    // extract a search query (handle like @name or channel/user id or url)
    const q = parseHandleQuery(handleOrUrl);
    if(!q) return null;
    // First, search for channel
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(q)}&key=${encodeURIComponent(YT_API_KEY)}`;
    const sr = await fetch(searchUrl);
    if(!sr.ok) return null;
    const sdata = await sr.json();
    if(!sdata.items || sdata.items.length === 0) return null;
    const ch = sdata.items[0];
    const channelId = ch.snippet && ch.id && ch.id.channelId ? ch.id.channelId : (ch.id && ch.id.videoId ? null : null);
    const title = ch.snippet.title;
    const description = ch.snippet.description || '';
    const avatarUrl = (ch.snippet.thumbnails && (ch.snippet.thumbnails.high||ch.snippet.thumbnails.default||ch.snippet.thumbnails.medium)) ? (ch.snippet.thumbnails.high || ch.snippet.thumbnails.medium || ch.snippet.thumbnails.default).url : null;

    // fetch contentDetails to get uploads playlist
    let uploadsPlaylist = null;
    if(channelId){
      const cUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(YT_API_KEY)}`;
      const cr = await fetch(cUrl);
      if(cr.ok){
        const cdata = await cr.json();
        if(cdata.items && cdata.items[0] && cdata.items[0].contentDetails && cdata.items[0].contentDetails.relatedPlaylists){
          uploadsPlaylist = cdata.items[0].contentDetails.relatedPlaylists.uploads;
        }
      }
    }

    return {
      type: 'channel',
      url: channelId ? ('https://www.youtube.com/channel/' + channelId) : (handleOrUrl || SITE_CONFIG.defaultChannelUrl),
      avatarUrl: avatarUrl || SITE_CONFIG.profileAvatar,
      title: title || SITE_CONFIG.channelHandle || 'Channel',
      description: description || 'Channel',
      uploadsPlaylistId: uploadsPlaylist || null
    };
  }catch(e){
    console.error('fetchChannelDataFromHandleOrUrl error', e);
    return null;
  }
}

function parseHandleQuery(handleOrUrl){
  if(!handleOrUrl) return null;
  try{
    // if it's a URL, try to parse path last segment or channel id
    const u = new URL(handleOrUrl);
    if(u.hostname.includes('youtube.com')){
      // /@handle or /channel/ID
      const p = u.pathname.replace(/^\//,'');
      if(p.startsWith('@')) return p; // @handle
      if(p.startsWith('channel/')) return p.split('/')[1];
      // fallback to search on the full title
      return u.pathname + ' ' + (u.search || '');
    }
    if(u.hostname === 'youtu.be') return u.pathname.slice(1);
  }catch(e){
    // not a url; if it starts with @, use directly
    if(handleOrUrl.startsWith('@')) return handleOrUrl;
    // otherwise return as search query
    return handleOrUrl;
  }
  return handleOrUrl;
}

function renderSites(sites){
  const ul = document.getElementById('sites-list');
  if(ul) ul.innerHTML = '';
  const nav = document.getElementById('site-nav');
  if(nav) nav.innerHTML = '';
  sites.forEach(s=>{
    if(ul){
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `${s.path}/index.html`;
      a.textContent = s.title || s.name;
      a.className = 'btn small';
      li.appendChild(a);
      if(s.description){
        const span = document.createElement('div');
        span.className = 'small';
        span.textContent = s.description;
        li.appendChild(span);
      }
      ul.appendChild(li);
    }
    if(nav){
      const navA = document.createElement('a');
      navA.href = `${s.path}/index.html`;
      navA.textContent = s.title || s.name;
      nav.appendChild(navA);
    }
  });
}

function renderCategoryDropdown(categories){
  const sel = document.getElementById('category-select');
  if(!sel) return; // nothing to do on pages without the dropdown
  sel.innerHTML = '';
  categories.forEach(cat=>{
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.title || cat.id;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', ()=>{
    const val = sel.value;
    if(val) {
      location.hash = '#' + val;
      showCategory(val);
    }
  });
  // reload button (if present)
  const reload = document.getElementById('reload-categories');
  if(reload) reload.addEventListener('click', async ()=>{
    reload.textContent = 'Reloading...';
    await loadData();
    reload.textContent = 'Reload';
  });
}

function getCurrentSiteName(){
  // detect site folder name from path like /sites/harisatif/
  const parts = location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('sites');
  if(idx >= 0 && parts.length > idx+1) return parts[idx+1];
  // fallback to hostname or root
  return null;
}

function showCategory(catId){
  const cat = (PROG_DATA.categories || []).find(c=>c.id === catId);
  const container = document.getElementById('categories');
  if(!container) return;
  container.innerHTML = '';
  if(!cat) {
    container.innerText = 'Category not found.';
    return;
  }
  // mark select value
  const sel = document.getElementById('category-select');
  if(sel) sel.value = catId;

  const currentSite = getCurrentSiteName();
  const items = cat.items || [];
  if(items.length === 0){
    const p = document.createElement('p');
    p.className = 'small';
    p.textContent = 'No items in this category yet.';
    container.appendChild(p);
    return;
  }

  // Render items as thumbnail cards that open the original URL in a new tab.
  items.forEach(item=>{
    if(item.site && currentSite && item.site !== currentSite) return;

    const card = document.createElement('div');
    card.className = 'category-card';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.gap = '0.75rem';
    card.style.padding = '0.5rem 0';

    // thumbnail image: prefer explicit thumbnail, then avatarUrl, then derive from YouTube id
    const thumb = document.createElement('img');
    thumb.style.width = '128px';
    thumb.style.height = '72px';
    thumb.style.objectFit = 'cover';
    thumb.style.borderRadius = '6px';
    thumb.alt = item.title || 'thumbnail';
    let thumbSrc = item.thumbnail || item.avatarUrl || null;
    if(!thumbSrc && item.url){
      const id = getYouTubeId(item.url);
      if(id) thumbSrc = getYouTubeThumbnail(id);
    }
    if(thumbSrc) thumb.src = thumbSrc;
    else {
      thumb.style.background = '#ddd';
      thumb.src = '';
    }

    const meta = document.createElement('div'); meta.style.flex = '1';
    const title = document.createElement('div'); title.textContent = item.title || item.url; title.style.fontWeight = '600';
    const subtype = document.createElement('div'); subtype.className = 'small'; subtype.style.color = '#666';
    subtype.textContent = (item.type === 'channel' ? 'Channel' : (item.url && item.url.includes('/shorts/') ? 'Short' : 'Video'));
    meta.appendChild(title); meta.appendChild(subtype);

    const link = document.createElement('a');
    link.href = item.url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.appendChild(thumb);

    // clicking title also opens link
    const titleLink = document.createElement('a');
    titleLink.href = item.url || '#';
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.textContent = item.title || item.url;

    // assemble
    card.appendChild(link);
    const right = document.createElement('div'); right.style.flex = '1'; right.appendChild(titleLink); right.appendChild(subtype);
    card.appendChild(right);
    container.appendChild(card);
  });
}

// Helper: extract YouTube id from common URL forms (watch?v=, youtu.be/, shorts/)
function getYouTubeId(url){
  try{
    const u = new URL(url);
    if(u.hostname.includes('youtube.com')){
      if(u.searchParams.get('v')) return u.searchParams.get('v');
      if(u.pathname.startsWith('/shorts/')) return u.pathname.split('/').pop();
      // channel or playlist cannot produce a single video id
      return null;
    }
    if(u.hostname === 'youtu.be'){
      return u.pathname.slice(1);
    }
    return null;
  }catch(e){ return null; }
}

function getYouTubeThumbnail(videoId){
  return 'https://img.youtube.com/vi/' + encodeURIComponent(videoId) + '/hqdefault.jpg';
}

function openYouTubeEmbed(ev){
  ev.preventDefault();
  // prefer dataset.url when present, otherwise href
  const el = ev.currentTarget;
  const url = (el && el.dataset && el.dataset.url) ? el.dataset.url : (el && el.getAttribute ? el.getAttribute('href') : null);
  const embed = toYouTubeEmbed(url);
  if(!embed){
    if(url) window.open(url, '_blank');
    return;
  }
  const modal = document.getElementById('yt-modal');
  const iframe = document.getElementById('yt-iframe');
  iframe.src = embed + '?autoplay=1';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
}

function toYouTubeEmbed(url){
  try{
    const u = new URL(url);
    if((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.searchParams.get('v')){
      return 'https://www.youtube.com/embed/' + u.searchParams.get('v');
    }
    if(u.hostname === 'youtu.be'){
      const id = u.pathname.slice(1);
      return 'https://www.youtube.com/embed/' + id;
    }
    return null;
  }catch(e){return null}
}

function closeModal(){
  const modal = document.getElementById('yt-modal');
  const iframe = document.getElementById('yt-iframe');
  if(iframe) iframe.src = '';
  if(modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  }
}

async function tryLoadChannelEmbed(){
  const container = document.getElementById('channel-embed-container');
  const bannerContainer = document.getElementById('channel-banner-container');
  if(!PROG_DATA || !PROG_DATA.categories) return;
  const currentSite = getCurrentSiteName();
  // find first channel item for this site across categories
  let channelItem = null;
  for(const cat of PROG_DATA.categories){
    for(const it of (cat.items||[])){
      if(it.type === 'channel' && (!it.site || !currentSite || it.site === currentSite)){
        channelItem = it;
        break;
      }
    }
    if(channelItem) break;
  }
  container.innerHTML = '';
  // If categories.json doesn't include a channel for this site, use SITE_CONFIG fallback
  if(!channelItem){
    // if API key present, try to resolve richer channel data from YouTube Data API
    if(YT_API_KEY){
      // try resolving by handle/url from SITE_CONFIG
      // note: this is best-effort and depends on API quotas and CORS
      // we await here to ensure banner can render with fetched avatar
      // (fetchChannelDataFromHandleOrUrl was added above)
      // eslint-disable-next-line no-await-in-loop
      const fetched = await fetchChannelDataFromHandleOrUrl(SITE_CONFIG.defaultChannelUrl || SITE_CONFIG.channelHandle);
      if(fetched) channelItem = fetched;
    }
    if(!channelItem && SITE_CONFIG && SITE_CONFIG.defaultChannelUrl){
      channelItem = {
        type: 'channel',
        url: SITE_CONFIG.defaultChannelUrl,
        avatarUrl: SITE_CONFIG.profileAvatar,
        title: SITE_CONFIG.channelHandle || 'Channel',
        description: 'Official channel'
      };
    }
    if(!channelItem){
      if(bannerContainer) bannerContainer.innerHTML = '';
      return;
    }
  }
  _CURRENT_CHANNEL_ITEM = channelItem;

    // Render banner (with play controls)
    if(bannerContainer) renderChannelBanner(channelItem);

    // We only render banner and links (no in-site player). The banner's actions open YouTube.
    return;
}

function renderChannelBanner(item){
  const bannerContainer = document.getElementById('channel-banner-container');
  if(!bannerContainer) return;
  bannerContainer.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'channel-banner';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  if(item.avatarUrl){
    const img = document.createElement('img');
    img.src = item.avatarUrl;
    img.alt = item.title || 'channel avatar';
    img.style.width='64px';
    img.style.height='64px';
    img.style.borderRadius='6px';
    avatar.innerHTML='';
    avatar.appendChild(img);
    // update header/profile image if present
    const headerImg = document.querySelector('.profile-pic img');
    if(headerImg) headerImg.src = item.avatarUrl;
    // add play overlay icon
    const overlay = document.createElement('span');
    overlay.className = 'play-overlay';
    overlay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7-11-7z" fill="currentColor"/></svg>';
    avatar.appendChild(overlay);
    // clicking avatar overlay triggers Play
    overlay.style.cursor = 'pointer';
    overlay.addEventListener('click', ()=>{ playChannelFromBanner(item); });
  } else {
    avatar.textContent = item.title ? item.title.charAt(0).toUpperCase() : 'C';
  }

  const meta = document.createElement('div'); meta.className = 'meta';
  const title = document.createElement('h3'); title.textContent = item.title || 'Channel';
  const desc = document.createElement('div'); desc.className = 'small'; desc.textContent = item.description || item.url || '';
  meta.appendChild(title); meta.appendChild(desc);

  const actions = document.createElement('div'); actions.className = 'actions';
    const playBtn = document.createElement('button'); playBtn.className = 'btn small'; playBtn.textContent = 'Open';
    // Open the channel on YouTube (no in-site player)
    playBtn.addEventListener('click', ()=>{ window.open(item.url, '_blank'); });


  const openBtn = document.createElement('a'); openBtn.className = 'btn small'; openBtn.textContent = 'Open on YouTube'; openBtn.href = item.url; openBtn.target = '_blank'; openBtn.rel='noopener noreferrer';

    actions.appendChild(playBtn); actions.appendChild(openBtn);

  wrap.appendChild(avatar); wrap.appendChild(meta); wrap.appendChild(actions);
  bannerContainer.appendChild(wrap);
}

function playChannelFromBanner(item){
  // Open channel page on YouTube (no in-site player)
  if(item && item.url) window.open(item.url, '_blank');
}

function showChannelFallback(container, item){
  const p = document.createElement('div');
  p.className = 'small';
  p.style.padding = '0.5rem';
  p.style.border = '1px solid #eee';
  p.style.background = '#fafafa';
  p.innerHTML = `<strong>${escapeHtml(item.title||'Channel')}</strong> — <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Open on YouTube</a>`;
  container.appendChild(p);
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  loadData();
  const modalClose = document.getElementById('modal-close');
  if(modalClose) modalClose.addEventListener('click', closeModal);
  const modal = document.getElementById('yt-modal');
  if(modal) modal.addEventListener('click', (e)=>{ if(e.target.id === 'yt-modal') closeModal(); });
  // support hash change to change category
  window.addEventListener('hashchange', ()=>{
    const id = location.hash.replace('#','');
    if(id) showCategory(id);
  });
});
