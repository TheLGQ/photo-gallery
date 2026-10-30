(() => {
  'use strict';
  const tracks = (window.GALLERY_MUSIC || {}).tracks || {};
  const topics = (window.GALLERY_DATA || {}).topics || [];
  const $ = id => document.getElementById(id);
  const player = $('music-player'), audio = $('background-music'), toggle = $('music-toggle');
  const local = location.protocol === 'file:' || ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
  const temporaryTracks = new Map();
  let activeTopic = null, revision = 0, blocked = false;
  let playlist = [], trackIndex = 0, repeatPlaylist = true;
  const status = text => { $('music-status').textContent = text; };
  const settings = open => {
    $('music-settings').hidden = !open;
    $('music-expand').setAttribute('aria-expanded', String(open));
    $('music-expand').setAttribute('aria-label', open ? '收起音乐设置' : '展开音乐设置');
  };
  function sync() {
    const playing = !audio.paused;
    toggle.textContent = playing ? 'Ⅱ' : '▶';
    toggle.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
    player.classList.toggle('is-playing', playing);
  }
  async function play() {
    if (!audio.getAttribute('src')) return;
    const attempt = revision;
    try {
      await audio.play();
      if (attempt !== revision) return;
      blocked = false; status('正在播放'); settings(false);
    } catch (error) {
      if (attempt !== revision || error.name === 'AbortError') return;
      blocked = error.name === 'NotAllowedError';
      status(blocked ? '浏览器暂未允许自动播放。点击播放，或点击专题入口即可开始。' : '音频暂时无法播放，请重试或选择其他音频。');
      settings(true);
    } finally {
      if (attempt === revision) sync();
    }
  }
  function selectTrack(id, force = false) {
    if (id === activeTopic && !force) {
      // An explicit click can unlock playback, without restarting an active song.
      if (blocked) void play();
      return;
    }
    activeTopic = id;
    const configured = temporaryTracks.get(id) || tracks[id] || [];
    playlist = (Array.isArray(configured) ? configured : [configured]).filter(track => track.src);
    trackIndex = 0;
    loadTrack();
  }
  function loadTrack() {
    revision++; blocked = false;
    audio.pause(); audio.removeAttribute('src'); audio.load();
    // Native single-track looping suppresses ended; advance the playlist ourselves.
    audio.loop = false;
    const track = playlist[trackIndex] || {};
    const topic = topics.find(t => t.id === activeTopic);
    // Keep chapter music in the background without an on-page player.
    player.hidden = true;
    $('music-title').textContent = track.src ? track.title || '背景音乐' : '本专题暂无配乐';
    $('music-artist').textContent = topic?.name || '';
    toggle.disabled = !track.src;
    settings(false); sync();
    if (track.src) {
      audio.src = track.src;
      status('正在准备专题音乐…');
      void play();
    } else {
      status('这个专题尚未添加背景音乐。切回已配乐的专题即可播放。');
    }
  }
  audio.volume = 0.3;
  try {
    const saved = localStorage.getItem('gallery-music-volume');
    if (saved !== null && Number.isFinite(Number(saved))) audio.volume = Math.max(0, Math.min(1, Number(saved)));
  } catch (_) {}
  $('music-volume').value = Math.round(audio.volume * 100);
  $('music-file-label').hidden = !local;
  $('music-expand').addEventListener('click', () => settings($('music-settings').hidden));
  toggle.addEventListener('click', () => {
    if (audio.paused) void play();
    else { audio.pause(); blocked = false; status('已暂停'); sync(); }
  });
  audio.addEventListener('playing', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', () => {
    // Ignore an event left over from a track stopped by a chapter change.
    if (!audio.ended || !playlist.length) return;
    if (trackIndex + 1 < playlist.length) trackIndex++;
    else if (repeatPlaylist) trackIndex = 0;
    else { sync(); status('播放列表已结束'); return; }
    loadTrack();
  });
  audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return;
    sync(); status('音频无法加载，请检查文件或选择其他音频。'); settings(true);
  });
  $('music-volume').addEventListener('input', event => {
    audio.volume = Number(event.target.value) / 100;
    try { localStorage.setItem('gallery-music-volume', String(audio.volume)); } catch (_) {}
  });
  $('music-loop').addEventListener('change', event => { repeatPlaylist = event.target.checked; });
  $('music-file').addEventListener('change', event => {
    const file = event.target.files[0]; if (!file) return;
    if (/\.(kgm|kgma|kgg)$/i.test(file.name)) { status('此格式无法直接播放，请选择 MP3 等常规音频文件。'); return; }
    const old = temporaryTracks.get(activeTopic);
    const track = {title: file.name.replace(/\.[^.]+$/, ''), src: URL.createObjectURL(file)};
    temporaryTracks.set(activeTopic, track);
    selectTrack(activeTopic, true);
    if (old) URL.revokeObjectURL(old.src);
    event.target.value = '';
  });
  window.addEventListener('gallery:topicchange', event => selectTrack(event.detail.id));
  window.addEventListener('pagehide', () => audio.pause());
  selectTrack(document.body.dataset.activeTopic || topics[0]?.id);
})();
