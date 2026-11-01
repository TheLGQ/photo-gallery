(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const {photos = [], topics = []} = window.GALLERY_DATA || {};
  const videos = window.GALLERY_VIDEOS || [];
  const grid = $('#photo-grid');
  if (!topics.length) { $('#result-count').textContent = '相册数据暂时无法加载，请刷新重试。'; $('#hero-photo').disabled = true; return; }
  const byId = new Map(photos.map(p => [p.id, p]));
  const topicById = new Map(topics.map(t => [t.id, t]));
  let topicId = topics[0].id, location = 'all', filtered = [], visible = 36, viewing = [], current = 0;
  let lastFilterKey = '';
  const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const locationText = p => [p.location, p.caption].filter(Boolean).join(' · ');
  $('#total-count').textContent = photos.length + videos.length;
  $('#topic-count').textContent = String(topics.length).padStart(2, '0');
  const hero = byId.get(topics[0].cover) || photos[0];
  if (hero) {
    $('#hero-image').src = hero.src; $('#hero-image').alt = hero.title;
    $('#hero-image').width = hero.width; $('#hero-image').height = hero.height;
    $('#hero-name').textContent = hero.title; $('#hero-location').textContent = locationText(hero);
    $('#hero-photo').setAttribute('aria-label', `放大 ${hero.title}`);
  } else { $('#hero-photo').hidden = true; }

  topics.forEach((topic, index) => {
    const card = element('a', 'topic-card' + (!topic.count ? ' coming-soon' : ''));
    card.href = '#collection'; card.dataset.topic = topic.id;
    const cover = element('div', 'topic-cover');
    const photo = byId.get(topic.cover);
    if (photo) { const img = element('img'); img.src = photo.thumb; img.alt = `${topic.name}：${photo.title}`; img.width = photo.width; img.height = photo.height; img.loading = 'lazy'; cover.append(img); }
    else { cover.append(element('span', 'blank-frame', '留白'), element('small', 'blank-note', '好的故事，值得等一等。')); }
    cover.append(element('span', 'chapter-number', String(index + 1).padStart(2, '0')));
    const videoCount = videos.filter(video => video.topic === topic.id).length;
    const countText = videoCount ? `${topic.count} 张 · ${videoCount} 段视频` : `${topic.count} 张`;
    const heading = element('div', 'topic-heading'); heading.append(element('h3', '', topic.name), element('span', '', topic.count || videoCount ? `${countText} ↗` : '待续 ↗'));
    card.append(cover, heading, element('p', 'topic-note', topic.note));
    card.addEventListener('click', event => {
      event.preventDefault();
      if (window.location.hash !== '#collection') history.pushState(null, '', '#collection');
      $('#collection').scrollIntoView({behavior: 'instant', block: 'start'});
      selectTopic(topic.id, true);
    });
    $('#topic-cards').append(card);
    const tab = element('button', 'topic-tab', topic.name); tab.dataset.topic = topic.id;
    tab.append(element('small', '', videoCount ? countText : topic.count || '待续'));
    tab.addEventListener('click', () => selectTopic(topic.id, true)); $('#topic-tabs').append(tab);
  });

  function selectTopic(id, promptMusic = false) {
    topicId = id; location = 'all'; visible = 36;
    $('#search').value = ''; $('#orientation').value = 'all';
    const topic = topicById.get(id);
    $('#collection-title').textContent = topic.name; $('#collection-intro').textContent = topic.intro;
    document.querySelectorAll('.topic-tab').forEach(tab => { const active = tab.dataset.topic === id; tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', String(active)); });
    $('#filter-bar').hidden = !topic.count;
    $('#search').disabled = !topic.count;
    $('#search').placeholder = topic.count ? '搜索照片、视频或地点…' : '这一章，待续…';
    const locations = [...new Set([...photos, ...videos].filter(p => p.topic === id && p.location).map(p => p.location))];
    $('#location-filters').replaceChildren();
    ['all', ...locations].forEach(value => {
      const button = element('button', 'location-filter', value === 'all' ? '全部' : value);
      button.dataset.location = value;
      button.addEventListener('click', () => { location = value; visible = 36; render(); });
      $('#location-filters').append(button);
    });
    render();
    document.body.dataset.activeTopic = id;
    window.dispatchEvent(new CustomEvent('gallery:topicchange', {detail: {id, promptMusic}}));
  }

  function layout() {
    for (const card of grid.children) {
      const height = card.firstElementChild.getBoundingClientRect().height + card.lastElementChild.getBoundingClientRect().height + 30;
      card.style.gridRowEnd = `span ${Math.ceil(height / 8)}`;
    }
  }
  let lastWidth = 0;
  const observer = new ResizeObserver(entries => { const width = entries[0].contentRect.width; if (width !== lastWidth) { lastWidth = width; requestAnimationFrame(layout); } });
  observer.observe(grid);

  function render() {
    const query = $('#search').value.trim().toLocaleLowerCase();
    const orientation = $('#orientation').value;
    const filterKey = JSON.stringify([topicId, location, orientation, query]);
    if (filterKey !== lastFilterKey) {
      const matches = photos.filter(p => p.topic === topicId && (location === 'all' || p.location === location)
        && (orientation === 'all' || (orientation === 'portrait' ? p.height > p.width : p.width >= p.height))
        && `${p.title} ${p.location} ${p.caption} ${topicById.get(p.topic).name}`.toLocaleLowerCase().includes(query));
      filtered = window.GalleryOrder.arrange(matches);
      lastFilterKey = filterKey;
    }
    document.querySelectorAll('.location-filter').forEach(button => { const active = button.dataset.location === location; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    const fragment = document.createDocumentFragment();
    filtered.slice(0, visible).forEach((photo, index) => {
      const card = element('article', 'photo-card');
      const button = element('button', 'photo-button'); button.setAttribute('aria-label', `放大 ${photo.title}`);
      const image = element('img'); image.src = photo.thumb; image.alt = photo.title; image.width = photo.width; image.height = photo.height; image.loading = 'lazy'; image.decoding = 'async';
      image.addEventListener('error', () => { image.classList.add('broken'); image.alt = `${photo.title} · 图片暂时无法加载`; });
      const arrow = element('span', 'photo-open', '↗'); arrow.setAttribute('aria-hidden', 'true');
      button.append(image, arrow); button.addEventListener('click', () => openPhoto(index, filtered));
      const meta = element('div', 'photo-meta'); meta.append(element('h3', '', photo.title), element('p', '', locationText(photo)));
      card.append(button, meta); fragment.append(card);
    });
    grid.replaceChildren(fragment); layout();
    const topic = topicById.get(topicId);
    $('#result-count').textContent = topic.count ? `${filtered.length} / ${topic.count} 张照片` : '留待下一段故事';
    $('#empty-state').hidden = !!filtered.length;
    const waiting = !topic.count;
    $('.empty-number').hidden = !waiting;
    $('.empty-number').textContent = String(topics.findIndex(t => t.id === topicId) + 1).padStart(2, '0');
    $('#empty-eyebrow').textContent = waiting ? 'TO BE CONTINUED' : 'A LITTLE FURTHER';
    $('#empty-title').textContent = waiting ? '这一章，留给未来的回忆。' : '还没找到这段光影';
    $('#empty-description').textContent = waiting ? '不急着填满，值得收藏的瞬间会慢慢到来。' : '换个关键词，或重新选择地点与画幅。';
    $('#reset-filters').hidden = waiting;
    $('#load-more-wrap').hidden = !filtered.length;
    $('#load-more').hidden = visible >= filtered.length;
    $('#loaded-count').textContent = visible >= filtered.length ? `已展开全部 ${filtered.length} 张照片` : `已展开 ${visible} 张，共 ${filtered.length} 张`;
    window.dispatchEvent(new CustomEvent('gallery:filterchange', {detail: {id: topicId, location, query}}));
  }
  $('#search').addEventListener('input', () => { visible = 36; render(); });
  $('#orientation').addEventListener('change', () => { visible = 36; render(); });
  $('#reset-filters').addEventListener('click', () => selectTopic(topicId));
  $('#load-more').addEventListener('click', () => { const oldVisible = visible; visible += 36; render(); grid.children[oldVisible]?.querySelector('button').focus({preventScroll: true}); });
  for (const mode of ['comfort', 'compact']) {
    $(`#grid-${mode}`).addEventListener('click', () => {
      grid.classList.toggle('compact', mode === 'compact');
      for (const other of ['comfort', 'compact']) { $(`#grid-${other}`).classList.toggle('active', mode === other); $(`#grid-${other}`).setAttribute('aria-pressed', String(mode === other)); }
      layout();
    });
  }
  function updatePhoto() {
    const photo = viewing[current];
    $('#lightbox-image').src = photo.src; $('#lightbox-image').alt = photo.title;
    $('#lightbox-title').textContent = photo.title;
    $('#lightbox-details').textContent = `${topicById.get(photo.topic).name} / ${locationText(photo)}`;
    $('#lightbox-counter').textContent = `${String(current + 1).padStart(2, '0')} / ${viewing.length}`;
    $('#download-photo').href = photo.src; $('#download-photo').download = `${photo.title}.webp`;
    $('#prev-photo').disabled = $('#next-photo').disabled = viewing.length < 2;
  }
  function openPhoto(index, list) { viewing = list.slice(); current = index; updatePhoto(); $('#lightbox').showModal(); document.body.classList.add('dialog-open'); }
  function move(delta) { current = (current + delta + viewing.length) % viewing.length; updatePhoto(); }
  $('#hero-photo').addEventListener('click', () => { const list = window.GalleryOrder.arrange(photos.filter(p => p.topic === hero.topic)); openPhoto(list.indexOf(hero), list); });
  $('#prev-photo').addEventListener('click', () => move(-1)); $('#next-photo').addEventListener('click', () => move(1));
  $('#close-lightbox').addEventListener('click', () => $('#lightbox').close());
  $('#lightbox').addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } });
  let touch = null;
  $('#lightbox-image').addEventListener('touchstart', event => { touch = event.changedTouches[0]; }, {passive: true});
  $('#lightbox-image').addEventListener('touchend', event => { if (!touch) return; const dx = event.changedTouches[0].clientX - touch.clientX, dy = event.changedTouches[0].clientY - touch.clientY; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1); touch = null; }, {passive: true});
  $('#about-button').addEventListener('click', () => { $('#about-dialog').showModal(); document.body.classList.add('dialog-open'); });
  $('#close-about').addEventListener('click', () => $('#about-dialog').close());
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => document.body.classList.toggle('dialog-open', !!document.querySelector('dialog[open]'))));
  selectTopic(topicId);
})();
