// İşaret şablonları: site ve PNG üretimi aynı fonksiyonu kullanır
function catMarker(glyph, color, size = 32) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff" stroke-width="2.5"/><g transform="translate(6.4 6.4) scale(.8)" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
}
function lmMarker(id, art, color, w = 48) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w * 58 / 48}" viewBox="0 0 48 58"><path d="M24 57l-8-11h16z" fill="${color}"/><circle cx="24" cy="24" r="22" fill="#fff" stroke="${color}" stroke-width="3"/><clipPath id="c-${id}"><circle cx="24" cy="24" r="20"/></clipPath><g clip-path="url(#c-${id})"><rect x="0" y="0" width="48" height="48" fill="#EAF4FA"/><g transform="translate(4 4) scale(.625)">${art}</g></g></svg>`;
}
if (typeof module !== 'undefined') module.exports = { catMarker, lmMarker };
