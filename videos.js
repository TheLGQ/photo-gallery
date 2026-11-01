(() => {
  'use strict';
  const videos = window.GALLERY_VIDEOS || [];
  const $ = id => document.getElementById(id);
  const section = $('chapter-videos'), grid = $('video-grid');
  const dialog = $('video-dialog'), player = $('chapter-video');
  let topicId = null, clips = [], visible = 4, current = 0, revision = 0;
  let location = 'all', query = '';
  const copy = {
    travel: {title: '旅途片段', intro: '走过山间石阶，也看过一座城的灯火。'},
    campus: {title: '校园片段', intro: '让那些熟悉的身影，再走过一次青春。'}
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const time = duration => `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;

  function render() {
    const text = copy[topicId] || {title: '光影片段', intro: ''};
    $('chapter-videos-title').textContent = text.title;
    $('video-intro').textContent = text.intro;
    section.hidden = !clips.length;
    $('chapter-photos-title').hidden = !videos.some(video => video.topic === topicId);
    $('video-count').textContent = `${clips.length} 段视频 · 共 ${time(clips.reduce((sum, clip) => sum + clip.duration, 0))}`;
    const fragment = document.createDocumentFragment();
    const grouped = topicId === 'travel';
    grid.classList.toggle('video-place-groups', grouped);
    const groups = new Map();
    (grouped ? clips : clips.slice(0, visible)).forEach((clip, index) => {
      let destination = fragment;
      if (grouped) {
        const label = [clip.location, clip.place].filter(Boolean).join(' · ');
        if (!groups.has(label)) {
          const group = element('section', 'video-place-group');
          group.setAttribute('aria-label', label);
          group.append(element('h4', 'video-place-title', label));
          const groupGrid = element('div', 'video-grid');
          group.append(groupGrid); fragment.append(group); groups.set(label, groupGrid);
        }
        destination = groups.get(label);
      }
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
      card.append(button, element(grouped ? 'h5' : 'h4', 'video-card-title', clip.title), element('p', '', clip.caption));
      destination.append(card);
    });
    grid.replaceChildren(fragment);
    $('more-videos').hidden = grouped || visible >= clips.length;
    $('more-videos').textContent = `再看 ${Math.max(0, clips.length - visible)} 段视频 ↓`;
  }

  function selectTopic(id, reset = false) {
    if (topicId === id && !reset) return;
    if (dialog.open) dialog.close();
    topicId = id;
    location = 'all'; query = '';
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
    $('video-caption').textContent = [clip.location, clip.place, clip.caption].filter(Boolean).join(' · ');
    $('video-position').textContent = `${copy[topicId]?.title || '光影片段'} / ${String(current + 1).padStart(2, '0')} · ${clips.length}`;
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
  window.addEventListener('gallery:filterchange', event => {
    const filter = event.detail;
    selectTopic(filter.id);
    if (location === filter.location && query === filter.query) return;
    if (dialog.open) dialog.close();
    location = filter.location; query = filter.query; visible = 4;
    clips = videos.filter(video => video.topic === topicId
      && (location === 'all' || video.location === location)
      && `${video.title} ${video.caption} ${video.location || ''} ${video.place || ''}`.toLocaleLowerCase().includes(query));
    render();
  });
  window.addEventListener('pagehide', () => player.pause());
  selectTopic(document.body.dataset.activeTopic);
})();
