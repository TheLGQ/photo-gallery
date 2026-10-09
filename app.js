(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const photos = window.GALLERY_DATA?.photos || [];
  const grid = $('#photo-grid');
  if (!photos.length) {
    $('#result-count').textContent = '相册尚未准备好，请先生成图片数据。';
    $('#hero-photo').disabled = true;
    return;
  }
  const travel = new Set(['青甘环线', '川西', '九寨沟', '哈尔滨', '张家界', '毕业旅行']);
  const people = new Set(['毕业时光', '人像记录']);
  const groupFor = (photo) => travel.has(photo.category) ? 'travel' : people.has(photo.category) ? 'people' : 'daily';
  let group = 'all';
  let filtered = photos.slice();
  let viewing = [];
  let current = 0;
  const categories = [...new Set(photos.map(photo => photo.category))];
  $('#total-count').textContent = photos.length;
  $('#tab-count').textContent = photos.length;
  $('#category-count').textContent = categories.length.toString().padStart(2, '0');
  $('#heading-count').textContent = `(${photos.length})`;
  const hero = photos.find(photo => photo.name === '川西-12.JPG') || photos[0];
  $('#hero-image').src = hero.src;
  $('#hero-image').alt = hero.title;
  $('.hero-photo-caption small').textContent = `山野来信 · ${hero.category}`;
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = `${category} (${photos.filter(photo => photo.category === category).length})`;
    $('#album-select').append(option);
  });

  function render() {
    const query = $('#search').value.trim().toLocaleLowerCase();
    const album = $('#album-select').value;
    filtered = photos.filter(photo => (group === 'all' || groupFor(photo) === group)
      && (album === 'all' || photo.category === album)
      && `${photo.name} ${photo.category}`.toLocaleLowerCase().includes(query));
    const fragment = document.createDocumentFragment();
    filtered.forEach((photo, index) => {
      const card = document.createElement('article');
      card.className = 'photo-card';
      const button = document.createElement('button');
      button.className = 'photo-button';
      button.setAttribute('aria-label', `放大 ${photo.title}`);
      const image = document.createElement('img');
      image.src = photo.thumb;
      image.alt = photo.title;
      image.width = photo.width;
      image.height = photo.height;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => { image.classList.add('broken'); image.alt = `图片暂时无法加载：${photo.title}`; });
      const icon = document.createElement('span');
      icon.className = 'photo-open';
      icon.textContent = '↗';
      icon.setAttribute('aria-hidden', 'true');
      button.append(image, icon);
      button.addEventListener('click', () => openPhoto(index, filtered));
      const meta = document.createElement('div');
      meta.className = 'photo-meta';
      const title = document.createElement('h3');
      title.textContent = photo.title;
      title.title = photo.name;
      const tag = document.createElement('span');
      tag.textContent = photo.category;
      meta.append(title, tag);
      const detail = document.createElement('p');
      detail.className = 'photo-subtitle';
      detail.textContent = `${photo.width} × ${photo.height} / ${photo.name.split('.').pop().toUpperCase()}`;
      card.append(button, meta, detail);
      fragment.append(card);
    });
    grid.replaceChildren(fragment);
    $('#result-count').textContent = `共 ${photos.length} 张照片 · 正在展示 ${filtered.length} 张`;
    $('#empty-state').hidden = filtered.length > 0;
    $('#end-note').textContent = filtered.length ? '每个平凡的瞬间，都有自己的光。' : '下一段记忆，就在别处。';
  }
  function updatePhoto() {
    const photo = viewing[current];
    const image = $('#lightbox-image');
    image.src = photo.src;
    image.alt = photo.title;
    $('#lightbox-title').textContent = photo.title;
    $('#lightbox-details').textContent = `${photo.category} · 原图 ${photo.width} × ${photo.height}`;
    $('#lightbox-counter').textContent = `${String(current + 1).padStart(2, '0')} / ${viewing.length}`;
    $('#download-photo').href = photo.src;
    $('#download-photo').download = `${photo.title}.webp`;
    $('#download-photo').title = '保存网页优化版图片（最长边 2400 像素）';
  }
  function openPhoto(index, list) {
    viewing = list.slice();
    current = index;
    updatePhoto();
    $('#lightbox').showModal();
    document.body.classList.add('dialog-open');
  }
  function movePhoto(delta) {
    current = (current + delta + viewing.length) % viewing.length;
    updatePhoto();
  }
  $('#hero-photo').addEventListener('click', () => openPhoto(photos.indexOf(hero), photos));
  $('#prev-photo').addEventListener('click', () => movePhoto(-1));
  $('#next-photo').addEventListener('click', () => movePhoto(1));
  $('#close-lightbox').addEventListener('click', () => $('#lightbox').close());
  $('#lightbox').addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      movePhoto(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  let touchStart = null;
  $('#lightbox-image').addEventListener('touchstart', event => { touchStart = {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY}; }, {passive: true});
  $('#lightbox-image').addEventListener('touchend', event => {
    if (!touchStart) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) movePhoto(deltaX < 0 ? 1 : -1);
    touchStart = null;
  }, {passive: true});
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    group = tab.dataset.group;
    $('#album-select').value = 'all';
    document.querySelectorAll('.tab').forEach(item => {
      item.classList.toggle('active', item === tab);
      item.setAttribute('aria-pressed', String(item === tab));
    });
    [...$('#album-select').options].forEach(option => {
      option.hidden = option.value !== 'all' && group !== 'all' && !photos.some(photo => photo.category === option.value && groupFor(photo) === group);
    });
    render();
  }));
  $('#search').addEventListener('input', render);
  $('#album-select').addEventListener('change', render);
  $('#reset-filters').addEventListener('click', () => {
    $('#search').value = '';
    $('[data-group="all"]').click();
  });
  for (const mode of ['comfort', 'compact']) {
    $(`#grid-${mode}`).addEventListener('click', () => {
      grid.classList.toggle('compact', mode === 'compact');
      for (const other of ['comfort', 'compact']) {
        $(`#grid-${other}`).classList.toggle('active', other === mode);
        $(`#grid-${other}`).setAttribute('aria-pressed', String(other === mode));
      }
    });
  }
  $('#about-button').addEventListener('click', () => { $('#about-dialog').showModal(); document.body.classList.add('dialog-open'); });
  $('#close-about').addEventListener('click', () => $('#about-dialog').close());
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => document.body.classList.remove('dialog-open')));
  render();
})();
