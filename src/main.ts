import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './style.css';
import { copy } from './config';
import { saveLead, testMode } from './backend';
import circle from './doodles/circle-2.svg?raw';
import heart from './doodles/heart-3.svg?raw';
import tick from './doodles/tick-2.svg?raw';
import fill1 from './doodles/fill-1.svg?raw';
import fill2 from './doodles/fill-2.svg?raw';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const DRAFT = 'curo-lead-draft';
/** Let a doodle stretch to the box it sits in (the ring hugs the text). */
const stretch = (svg: string) => svg.replace('<svg ', '<svg preserveAspectRatio="none" ');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="top">
    <a class="brand" href="/">${copy.brand}</a>
  </header>
  <main class="page">
    <section class="intro">
      <p class="kicker">${copy.kicker}</p>
      <h1>${copy.headline}</h1>
      <p class="lead">${copy.lead}</p>
    </section>

    <section class="sheet" aria-labelledby="form-title">
      <div class="tape" aria-hidden="true"></div>
      <div class="form-view">
        <h2 id="form-title">${copy.formTitle}</h2>
        <p class="form-intro">${copy.formIntro}</p>
        <form novalidate>
          <div class="field">
            <label for="name">${copy.nameLabel}</label>
            <input id="name" name="name" autocomplete="name" autocapitalize="words" maxlength="80" placeholder="${copy.namePlaceholder}" aria-describedby="name-error" />
            <p class="error" id="name-error" aria-live="polite"></p>
          </div>
          <div class="field">
            <label for="email">${copy.emailLabel}</label>
            <input id="email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="120" placeholder="${copy.emailPlaceholder}" aria-describedby="email-error" />
            <p class="error" id="email-error" aria-live="polite"></p>
          </div>
          <div class="hp" aria-hidden="true">
            <label for="website">Website</label>
            <input id="website" name="website" tabindex="-1" autocomplete="off" />
          </div>
          <div class="send">
            <button type="submit" class="btn"><span class="btn-label">${copy.submit}</span><span class="btn-line" aria-hidden="true"></span></button>
          </div>
          <p class="error network" role="alert"></p>
          <p class="privacy">${copy.privacy}</p>
        </form>
      </div>
      <div class="done-view" hidden tabindex="-1" role="status">
        <span class="done-tick" aria-hidden="true">${tick}</span>
        <h2 class="done-title"></h2>
        <p class="done-body"></p>
        <button type="button" class="text-btn again">${copy.done.again}</button>
      </div>
    </section>

    <aside class="preview" aria-label="${copy.preview.label}">
      <div class="mini">
        <p class="mini-section">${copy.preview.section}</p>
        <p class="mini-q">${copy.preview.question}</p>
        <div class="mini-answer"><span>${copy.preview.answer}</span></div>
        <div class="mini-swatches" aria-hidden="true">
          ${['#FF6FA8', '#4D9DFF', '#FFB020', '#2FCB9A', '#B08CFF'].map((c, i) => `<span style="color:${c}">${i % 2 ? fill2 : fill1}</span>`).join('')}
        </div>
        <p class="mini-stat">${copy.preview.stat}<span class="mini-ring" aria-hidden="true">${stretch(circle)}</span></p>
        <span class="mini-heart" aria-hidden="true">${heart}</span>
      </div>
    </aside>
  </main>
  <footer class="foot">${copy.footer.replace('{year}', String(new Date().getFullYear()))}</footer>
`;

const form = document.querySelector('form')!;
const nameIn = document.querySelector<HTMLInputElement>('#name')!;
const emailIn = document.querySelector<HTMLInputElement>('#email')!;
const hp = document.querySelector<HTMLInputElement>('#website')!;
const btn = form.querySelector<HTMLButtonElement>('.btn')!;
const label = btn.querySelector('.btn-label')!;
const netErr = form.querySelector<HTMLParagraphElement>('.network')!;
const formView = document.querySelector<HTMLDivElement>('.form-view')!;
const doneView = document.querySelector<HTMLDivElement>('.done-view')!;
const sheet = document.querySelector<HTMLElement>('.sheet')!;

// Keep what they typed if the page reloads or the signal drops.
try {
  const d = JSON.parse(localStorage.getItem(DRAFT) || '{}');
  nameIn.value = d.name || '';
  emailIn.value = d.email || '';
} catch {
  /* nothing saved */
}
const saveDraft = () => {
  try {
    localStorage.setItem(DRAFT, JSON.stringify({ name: nameIn.value, email: emailIn.value }));
  } catch {
    /* storage blocked */
  }
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function problem(input: HTMLInputElement): string {
  const v = input.value.trim();
  if (input === nameIn) return v ? '' : copy.errors.name;
  if (!v) return copy.errors.email;
  return EMAIL.test(v) ? '' : copy.errors.emailBad;
}
function show(input: HTMLInputElement, msg: string) {
  document.getElementById(`${input.id}-error`)!.textContent = msg;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  input.closest('.field')!.classList.toggle('bad', !!msg);
}

for (const input of [nameIn, emailIn]) {
  input.addEventListener('input', () => {
    saveDraft();
    if (input.getAttribute('aria-invalid') === 'true') show(input, problem(input)); // clear as soon as it's fixed
  });
  input.addEventListener('blur', () => input.value && show(input, problem(input)));
}

function nudge(el: HTMLElement) {
  if (reduced) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

let sending = false;
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (sending) return;
  netErr.textContent = '';
  const bad = [nameIn, emailIn].filter((i) => {
    const m = problem(i);
    show(i, m);
    return !!m;
  });
  if (bad.length) {
    nudge(btn);
    bad[0].focus();
    return;
  }
  const lead = { name: nameIn.value.trim().replace(/\s+/g, ' '), email: emailIn.value.trim().toLowerCase() };
  sending = true;
  btn.classList.add('busy');
  btn.setAttribute('aria-disabled', 'true');
  label.textContent = copy.sending;
  try {
    if (!hp.value) await saveLead(lead); // a filled honeypot is a bot: look successful, save nothing
    try {
      localStorage.removeItem(DRAFT);
    } catch {
      /* fine */
    }
    finish(lead);
  } catch (err) {
    console.warn('Sign-up failed', err);
    netErr.textContent = copy.errors.network;
    nudge(btn);
  } finally {
    sending = false;
    btn.classList.remove('busy');
    btn.removeAttribute('aria-disabled');
    label.textContent = copy.submit;
  }
});

function finish(lead: { name: string; email: string }) {
  const first = lead.name.split(' ')[0];
  doneView.querySelector('.done-title')!.innerHTML = esc(copy.done.title.replace('{first}', first));
  doneView.querySelector('.done-body')!.innerHTML =
    esc(copy.done.body).replace('{email}', `<strong>${esc(lead.email)}</strong>`) +
    (testMode ? '<br><span class="local">Test mode: the Google Sheet is not connected yet, so this was saved in this browser only.</span>' : '');
  formView.hidden = true;
  doneView.hidden = false;
  sheet.classList.add('filed');
  doneView.focus({ preventScroll: true });
  if (!reduced) sheet.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

doneView.querySelector('.again')!.addEventListener('click', () => {
  sheet.classList.remove('filed');
  doneView.hidden = true;
  formView.hidden = false;
  emailIn.value = '';
  emailIn.focus();
});
