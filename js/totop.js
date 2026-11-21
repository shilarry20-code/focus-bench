/* ---------- Feed: back to top ----------
   A round ↑ button that shows once you've scrolled about a screen down the Feed and takes you back to the top.
   Tapping Feed in the nav while you're already on the Feed does the same. Respects Settings → Look → Motion. */
function feedToTop(){ window.scrollTo({top: 0, behavior: motion() === 'off' ? 'auto' : 'smooth'}); }
function feedTopCheck(){
  const b = $('#fdTopBtn'); if (!b) return;
  const onFeed = document.body.dataset.page === 'feed' && !$('#page-feed').hidden;
  const modal = [...document.querySelectorAll('.modal')].some(m => !m.hidden);
  const show = onFeed && !modal && window.scrollY > Math.max(500, innerHeight * 0.9);
  b.classList.toggle('on', show); b.tabIndex = show ? 0 : -1; b.setAttribute('aria-hidden', show ? 'false' : 'true');
}
(function(){
  const b = document.createElement('button');
  b.id = 'fdTopBtn'; b.className = 'fd-top-btn'; b.type = 'button'; b.title = 'Back to top'; b.setAttribute('aria-label', 'Back to top'); b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  b.addEventListener('click', () => { feedToTop(); b.blur(); });
  document.body.appendChild(b);
  let raf = 0; const q = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; feedTopCheck(); }); };
  addEventListener('scroll', q, {passive: true}); addEventListener('resize', q);
  document.addEventListener('click', () => setTimeout(feedTopCheck, 0));    // page switches and pop-ups opening or closing
  new MutationObserver(q).observe(document.body, {attributes: true, attributeFilter: ['data-page']});
})();
