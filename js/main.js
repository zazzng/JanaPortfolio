/* ============================================================
   JANA PORTFOLIO — Main JavaScript
   ============================================================ */

/* ---- Scroll progress bar ---- */
const progressBar = document.getElementById('scroll-progress');

function updateProgress() {
  if (!progressBar) return;
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0%';
}

/* ---- Nav: transparent → frosted on scroll ---- */
const nav = document.getElementById('nav');

function updateNav() {
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 24);
}

/* ---- Mobile menu ---- */
const menuBtn  = document.getElementById('menu-btn');
const mobileMn = document.getElementById('mobile-menu');

if (menuBtn && mobileMn) {
  menuBtn.addEventListener('click', () => {
    const open = mobileMn.classList.toggle('open');
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  mobileMn.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMn.classList.remove('open');
      menuBtn.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* ---- Scroll reveal (Intersection Observer) ---- */
const revealEls = document.querySelectorAll('[data-reveal]');

if (revealEls.length) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('revealed')) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
  );

  revealEls.forEach(el => observer.observe(el));
}

/* ---- Project filter ---- */
const filterBtns   = document.querySelectorAll('.filter-btn');
const projectItems = document.querySelectorAll('.project-item');

if (filterBtns.length && projectItems.length) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      projectItems.forEach(item => {
        const tags = item.dataset.tags || '';
        item.classList.toggle('hidden', filter !== 'all' && !tags.includes(filter));
      });
    });
  });
}

/* ---- Scroll listener (passive for perf) ---- */
window.addEventListener('scroll', () => {
  updateProgress();
  updateNav();
}, { passive: true });

/* ---- Init ---- */
updateProgress();
updateNav();
