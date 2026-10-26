// Збирає dist/index.html із src/template.html і текстів у levels/*.md.
// Запуск: node build.js  (без залежностей, потрібен лише Node.js)
//
// Формат файлу рівнів (levels/<номер>-<назва>.md):
//   # Назва розділу
//
//   ## Назва рівня {id}
//   Те-кст із ди-фі-са-ми між скла-да-ми.
//   Мож-на в кіль-ка ряд-ків.
//
// {id} — необов'язковий. За ним зберігаються зірки, тому не змінюйте його
// в уже пройдених рівнях. Без {id} використовується назва рівня.

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const VOWELS = /[аеєиіїоуюя]/gi;
const problems = [];

function parseChapter(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const chapter = { n: "", L: [] };
  let level = null;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const where = `${path.basename(file)}:${i + 1}`;
    if (!line) return;
    if (line.startsWith("## ")) {
      const m = line.slice(3).match(/^(.*?)\s*(?:\{([^}]+)\})?$/);
      level = { id: (m[2] || m[1]).trim(), t: m[1].trim(), s: "", where };
      chapter.L.push(level);
    } else if (line.startsWith("# ")) {
      chapter.n = line.slice(2).trim();
    } else if (level) {
      level.s += (level.s ? " " : "") + line;
    } else {
      problems.push(`${where}: текст поза рівнем (бракує рядка "## Назва")`);
    }
  });
  if (!chapter.n) problems.push(`${path.basename(file)}: бракує рядка "# Назва розділу"`);
  return chapter;
}

function check(level) {
  if (!level.s) problems.push(`${level.where}: рівень «${level.t}» без тексту`);
  for (const word of level.s.split(/\s+/)) {
    const clean = word.replace(/[.,!?:;"«»()…]/g, "");
    if (!clean) { problems.push(`${level.where}: окремий розділовий знак «${word}» — приліпіть його до слова`); continue; }
    if (/\d/.test(clean)) problems.push(`${level.where}: цифри в «${word}» — пишіть числа словами`);
    const parts = clean.split("-");
    const wordVowels = (clean.match(VOWELS) || []).length;
    if (wordVowels === 0) continue; // прийменники в, з, й
    parts.forEach(p => {
      const v = (p.match(VOWELS) || []).length;
      if (v !== 1) problems.push(`${level.where}: склад «${p}» у слові «${word}» має ${v} голосних`);
    });
  }
}

const files = fs.readdirSync(path.join(ROOT, "levels"))
  .filter(f => f.endsWith(".md"))
  .sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
const chapters = files.map(f => parseChapter(path.join(ROOT, "levels", f)));

const ids = new Map();
chapters.forEach(c => c.L.forEach(l => {
  check(l);
  if (ids.has(l.id)) problems.push(`${l.where}: id «${l.id}» вже є в ${ids.get(l.id)}`);
  ids.set(l.id, l.where);
}));

if (problems.length) {
  console.error("Знайдено проблеми:\n- " + problems.join("\n- "));
  process.exit(1);
}

const data = chapters.map(c => ({ n: c.n, L: c.L.map(({ id, t, s }) => ({ id, t, s })) }));
const tpl = fs.readFileSync(path.join(ROOT, "src", "template.html"), "utf8");
if (!tpl.includes("/*LEVELS*/")) { console.error("У шаблоні немає /*LEVELS*/"); process.exit(1); }
const html = tpl.replace("/*LEVELS*/", JSON.stringify(data, null, 1).replace(/</g, "\\u003c"));

fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist", "index.html"), html);
const n = data.reduce((a, c) => a + c.L.length, 0);
console.log(`Готово: ${data.length} розділів, ${n} рівнів → dist/index.html`);
