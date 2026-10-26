// Поділ українських слів на склади за шкільними правилами.
//
// 1. Скільки голосних — стільки складів.
// 2. Голосні поруч розділяються: о-ке-ан.
// 3. Одна приголосна між голосними відходить до наступного складу: ма-ма.
// 4. Подвоєна приголосна розділяється: ба-гат-тя, на-сін-ня.
// 5. Збіг приголосних — два стилі (обидва шкільна граматика допускає):
//    "reading" (типово): розрив після першої приголосної — яб-лу-ка, швид-ко, ди-вить-ся;
//    "phonetic": після сонорної (й, в, л, м, н, р) так само — паль-ма, мор-ква,
//    а інші збіги цілком ідуть у наступний склад — я-блу-ка, шви-дко.
// 7. Префікси під-, від-, роз-, без-, над- перед приголосною не розриваються: під-ло-га.
// «ь» і апостроф лишаються зі своєю приголосною, «дж» і «дз» — один звук.
//
// Шкільна граматика допускає кілька варіантів поділу, тож результат інколи
// відрізняється від підручника, але завжди має одну голосну на склад.
// Щоб задати поділ вручну, напишіть слово з дефісами в levels/*.md.

const VOWELS = "аеєиіїоуюя";
const SONORANT = "йвлмнр";
const PREFIXES = ["під", "від", "роз", "без", "над"];
const APOS = "'’ʼ`";

const isVowel = ch => VOWELS.includes(ch.toLowerCase());
const isLetter = ch => /[а-щьюяґєії]/i.test(ch);

// Розбиває слово на звукові одиниці: голосна, або приголосна з «ь»/апострофом, або «дж»/«дз».
function units(word) {
  const out = [];
  for (let i = 0; i < word.length; i++) {
    let u = word[i];
    const low = word.slice(i, i + 2).toLowerCase();
    if (!isVowel(u) && (low === "дж" || low === "дз")) { u = word.slice(i, i + 2); i++; }
    while (i + 1 < word.length && !isVowel(word[i + 1]) && (word[i + 1].toLowerCase() === "ь" || APOS.includes(word[i + 1]))) {
      u += word[++i];
    }
    out.push(u);
  }
  return out;
}

const base = u => u[0].toLowerCase();

function syllabifyWord(word, style = "reading") {
  if (word.includes("-")) return word;            // ручний поділ має пріоритет
  const us = units(word);
  const vIdx = us.map((u, i) => (isVowel(u[0]) ? i : -1)).filter(i => i >= 0);
  if (vIdx.length < 2) return word;
  const cuts = new Set();                           // індекс одиниці, з якої починається новий склад
  const lower = word.toLowerCase();
  // префікс береться до уваги, лише якщо після нього йде приголосна (під-лога, але пі-дій-ти не буває)
  const pre = PREFIXES.find(p => lower.startsWith(p) && us.slice(0, p.length).join("").toLowerCase() === p
    && us[p.length] && !isVowel(us[p.length][0]));
  const P = pre ? pre.length : -1;
  for (let k = 0; k + 1 < vIdx.length; k++) {
    const a = vIdx[k], b = vIdx[k + 1];
    const cluster = b - a - 1;
    let cut;
    if (P > a && P < b) cut = P;                        // межа префікса всередині збігу
    else if (cluster <= 1) cut = a + 1;
    else if (base(us[a + 1]) === base(us[a + 2])) cut = a + 2;
    else if (style === "reading" || SONORANT.includes(base(us[a + 1]))) cut = a + 2;
    else cut = a + 1;
    cuts.add(cut);
  }
  let res = "";
  us.forEach((u, i) => { if (cuts.has(i)) res += "-"; res += u; });
  return res;
}

// Ділить на склади весь текст, не чіпаючи розділові знаки.
function syllabifyText(text, style) {
  return text.replace(/[а-щьюяґєії'’ʼ`\-]+/gi, w => {
    const lead = w.match(/^['’ʼ`\-]*/)[0], tail = w.match(/['’ʼ`\-]*$/)[0];
    const core = w.slice(lead.length, w.length - tail.length);
    return core ? lead + syllabifyWord(core, style) + tail : w;
  });
}

module.exports = { syllabifyWord, syllabifyText };
