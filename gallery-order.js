(() => {
  'use strict';

  // Keep the curated opening photo, then spread repeated scenes across the
  // collection. Stable tie-breaking keeps pagination and lightbox order fixed.
  function arrange(photos) {
    if (photos.length < 3) return photos.slice();
    const remaining = photos.map((photo, index) => ({photo, index}));
    const result = [];
    const groupOf = photo => photo.layoutGroup || photo.id;
    const counts = new Map();
    for (const {photo} of remaining) {
      const group = groupOf(photo);
      counts.set(group, (counts.get(group) || 0) + 1);
    }
    function take(index) {
      const {photo} = remaining.splice(index, 1)[0];
      counts.set(groupOf(photo), counts.get(groupOf(photo)) - 1);
      result.push(photo);
    }
    take(0);
    const weights = [1, .95, .9, .85, .65, .5, .35, .2];
    while (remaining.length) {
      const recent = result.slice(-weights.length).reverse();
      const largestGroup = Math.max(...counts.values());
      let bestIndex = 0, bestScore = Infinity;
      remaining.forEach(({photo, index}, candidateIndex) => {
        let strongest = 0, total = 0;
        recent.forEach((previous, distance) => {
          const similarity = Math.max(photo.similar?.[previous.id] || 0, previous.similar?.[photo.id] || 0);
          const likeness = groupOf(photo) === groupOf(previous) ? 1 : Math.max(0, (similarity - 65) / 35);
          const penalty = likeness * weights[distance];
          strongest = Math.max(strongest, penalty + Math.max(0, (similarity - 87) / 13) * .6 * weights[distance]);
          total += penalty + Math.max(0, (similarity - 65) / 35) * .6 * weights[distance];
        });
        // Spend larger series throughout the album, instead of leaving all of
        // their remaining frames together at the end. Favor curated images.
        const balance = .55 * counts.get(groupOf(photo)) / largestGroup;
        const editorial = .75 / (1 + index / 8);
        const portrait = photo.height > photo.width;
        const repeatedFormat = recent.length >= 3 && recent.slice(0, 3).every(p => (p.height > p.width) === portrait);
        const repeatedLocation = recent.length >= 2 && recent.slice(0, 2).every(p => p.location === photo.location);
        const subjectRepeat = photo.layoutSubject
          ? recent.slice(0, 3).reduce((sum, p, i) => sum + (p.layoutSubject === photo.layoutSubject ? .8 - i * .2 : 0), 0) : 0;
        const score = strongest * 3 + total * .25 - balance - editorial
          + subjectRepeat + (repeatedFormat ? .12 : 0) + (repeatedLocation ? .1 : 0);
        if (score < bestScore) { bestScore = score; bestIndex = candidateIndex; }
      });
      take(bestIndex);
    }
    return result;
  }
  window.GalleryOrder = {arrange};
})();
