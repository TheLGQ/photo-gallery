(() => {
  'use strict';
  const videos = window.GALLERY_VIDEOS || [];
  const $ = id => document.getElementById(id);
  const section = $('chapter-videos'), grid = $('video-grid');
  const dialog = $('video-dialog'), player = $('chapter-video');
  let topicId = null, clips = [], visible = 4, current = 0, revision = 0;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const time = duration => `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;

  function render() {
    section.hidden = !clips.length;
    $('chapter-photos-title').hidden = !clips.length;
    $('video-count').textContent = `${clips.length} 段视频 · 共 ${time(clips.reduce((sum, clip) => sum + clip.duration, 0))}`;
    const fragment = document.createDocumentFragment();
    clips.slice(0, visible).forEach((clip, index) => {
      const card = element('article', 'video-card');
      const button = element('button', 'video-button');
      button.setAttribute('aria-label', `播放视频：${clip.title}`);
      const image = element('img');
      image.src = clip.poster; image.alt = ''; image.loading = 'lazy';
      image.width = clip.width; image.height = clip.height;
      const play = element('span', 'video-play-icon', '▶'); play.setAttribute('aria-hidden', 'true');
      const duration = element('span', 'video-duration', time(clip.duration)); duration.setAttribute('aria-hidden', 'true');
      button.append(image, play, duration);
      button.addEventListener('click', () => openVideo(index));
      card.append(button, element('h4', '', clip.title), element('p', '', clip.caption));
      fragment.append(card);
    });
    grid.replaceChildren(fragment);
    $('more-videos').hidden = visible >= clips.length;
    $('more-videos').textContent = `再看 ${Math.max(0, clips.length - visible)} 段视频 ↓`;
  }

  function selectTopic(id, reset = false) {
    if (topicId === id && !reset) return;
    if (dialog.open) dialog.close();
    topicId = id;
    clips = videos.filter(video => video.topic === id);
    visible = 4;
    render();
  }
  async function play() {
    const attempt = revision;
    try { await player.play(); }
    catch (error) {
      if (attempt !== revision || error.name === 'AbortError') return;
      $('video-status').textContent = error.name === 'NotAllowedError' ? '点击视频上的播放键即可开始。' : '视频暂时无法播放，请重试。';
      $('video-message').hidden = false;
    }
  }
  function loadVideo() {
    revision++;
    const clip = clips[current];
    player.pause();
    player.src = clip.src; player.poster = clip.poster;
    player.width = clip.width; player.height = clip.height;
    $('video-title').textContent = clip.title;
    $('video-caption').textContent = clip.caption;
    $('video-position').textContent = `校园片段 / ${String(current + 1).padStart(2, '0')} · ${clips.length}`;
    $('prev-video').disabled = $('next-video').disabled = clips.length < 2;
    $('video-message').hidden = true;
    void play();
  }
  function openVideo(index) {
    current = index;
    window.dispatchEvent(new CustomEvent('gallery:videochange', {detail: {open: true}}));
    dialog.showModal();
    document.body.classList.add('dialog-open');
    loadVideo();
  }
  function move(delta) { current = (current + delta + clips.length) % clips.length; loadVideo(); }
  $('prev-video').addEventListener('click', () => move(-1));
  $('next-video').addEventListener('click', () => move(1));
  $('retry-video').addEventListener('click', loadVideo);
  $('close-video').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    revision++;
    player.pause(); player.removeAttribute('src'); player.load();
    window.dispatchEvent(new CustomEvent('gallery:videochange', {detail: {open: false}}));
  });
  player.addEventListener('error', () => {
    if (!player.getAttribute('src')) return;
    $('video-status').textContent = '视频暂时无法加载，请稍后重试。';
    $('video-message').hidden = false;
  });
  $('more-videos').addEventListener('click', () => {
    const previous = visible; visible = clips.length; render();
    grid.children[previous]?.querySelector('button').focus({preventScroll: true});
  });
  window.addEventListener('gallery:topicchange', event => selectTopic(event.detail.id, event.detail.promptMusic));
  window.addEventListener('pagehide', () => player.pause());
  selectTopic(document.body.dataset.activeTopic);
})();
