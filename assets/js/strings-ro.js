/* What the agent says, in Romanian. Keys, function signatures and array shapes match strings.js (en). */
window.IG_STRINGS = window.IG_STRINGS || {};
window.IG_STRINGS.ro = (() => {
  // Romanian plurals: 1 lucru / 2-19 lucruri / 20 de lucruri / 100 de lucruri / 101 lucruri
  const cnt = (n, one, few) => n === 1 ? `1 ${one}` : `${n}${n !== 0 && (n % 100 === 0 || n % 100 >= 20) ? " de" : ""} ${few}`;
  const detMasked = (n) => cnt(n, "detaliu mascat", "detalii mascate");
  const detPersonalMasked = (n) => cnt(n, "detaliu personal mascat", "detalii personale mascate");
  const things = (k) => cnt(k, "lucru", "lucruri");

  // Intent regexes. \b does not work next to non-ASCII letters, so the Romanian alternatives use
  // (^|non-letter) + the u flag, and match as prefixes (Romanian inflects). Diacritics are optional
  // and the cedilla forms (ş ţ) are accepted too, so "tine minte", "ține minte" and "ţine minte" all match.
  const dia = (s) => s.replace(/[ăâîșț]/g, (c) => ({ "ă": "[ăa]", "â": "[âîa]", "î": "[îâi]", "ș": "[șşs]", "ț": "[țţt]" }[c]));
  const intent = (en, ro) => new RegExp(`\\b(?:${en})\\b|(?:^|[^\\p{L}])(?:${dia(ro)})`, "iu");

  return {
  pages: { home: "index-ro.html", security: "security-ro.html", proof: "proof-ro.html", investors: "investors-ro.html" },
  placeholder: "Întreabă despre inteligentia sau scrie orice…",
  namePlaceholder: "Prenumele tău",
  trickPlaceholder: "Scrie ceva cu un nume sau un număr în el…",
  brainLabel: (b) => `prin ${b}`,
  homeLabel: "pe cutie",

  boot: [["memorie", "local"], ["agent", "treaz"], ["filtru", "armat"], ["expunere", "0 B"]],

  hello: "Salut. Sunt agentul *tău*.",
  disclaimer: "O precizare mai întâi: aceasta este o **previzualizare interactivă**, neconectată la un dispozitiv inteligentia real. Cunosc câteva subiecte. Poți scrie și orice altceva, iar eu îți arăt încotro l-aș trimite.",
  askName: "Cum să-ți spun? Dacă nu vrei să-mi spui, e un răspuns la fel de bun.",
  rather: "Prefer să nu spun",
  ratherReply: "Perfect. Nu notez nimic. Vei vedea că lucrez la fel de bine și fără asta.",
  nameSaved: (n) => `Mă bucur să te cunosc, ${n}. Am notat asta în **Memorie**, care stă în acest browser, nu pe un server. O poți șterge oricând vrei.`,
  start: "Cu ce începem?",
  welcomeBack: (n) => n ? `Bine ai revenit, *${n}*.` : "Bine ai revenit.",
  welcomeBack2: (k) => `Încă țin minte ${things(k)} din data trecută. N-au ieșit niciodată din acest browser.`,

  chips: {
    remember: "Ține minte o preferință",
    find: "Găsește ceva în fișierele mele",
    continue: "Schimbă modelul în mijlocul conversației",
    telegram: "Cum vorbesc cu tine?",
    import: "Pot aduce istoricul meu din ChatGPT?",
    trick: "Ce vede cloud-ul?",
    diff: "Cu ce ești diferit de ChatGPT?",
    hardware: "Ce ajunge la ușa mea?",
    reserve: "Rezervă unul",
    memory: "Ce ții minte?",
  },
  topicNames: { remember: "memorie", find: "fișierele tale", continue: "schimbarea modelelor", telegram: "Telegram", import: "importul conversațiilor", trick: "filtrul", diff: "agenții din cloud", hardware: "cutia", reserve: "rezervarea" },

  // Same ids, same order as en. English keywords are matched too.
  intents: [
    ["memoryq", intent("what do you (?:remember|know)|my memory|forget me", "ce (?:îți )?amintești|ce ții minte|ce știi despre mine|ce reții|ce ai (?:reținut|notat)|memoria mea|uită-?mă|uită tot|uită de mine")],
    ["remember", new RegExp(`^(?:(?:remember|note|don't forget)\\b|(?:${dia("ține minte|ține-?ți minte|reține|nu uita|notează|memorează")})(?![\\p{L}]))`, "iu")],
    ["import", intent("import|history|export|migrate|move my|old chats|bring", "import(?!an)|istori|export|migr|conversații vechi|chat-?uri vechi|adu(?:c|ci|ce|cem)?(?![\\p{L}])|mută(?:-mi)? (?:istoricul|conversațiile)")],
    ["find", intent("lease|document|documents|file|files|pdf|find|search|contract", "contract|chiri|preaviz|document|fișier|pdf|căut|găsește|găsesc|găsești|găsi(?![\\p{L}])")],
    ["continue", intent("switch|provider|codex|openrouter|change model|which model", "schimb|furnizor|alt model|alt creier|ce model|care model")],
    ["diff", intent("chatgpt|gpt|claude|grok|gemini|dots|muse|different|difference|vs|versus", "difer|deosebi|față de|agenții (?:din )?cloud|concuren")],
    ["telegram", intent("telegram|talk to you|phone|mobile|app|whatsapp|message", "telegram|whatsapp|telefon|mobil|aplicați|mesaj|cum vorbesc|cum te contactez|vorbesc cu tine|cum îți scriu")],
    ["trick", intent("privacy|private|filter|redact|mask|confidential|secure|cloud see", "privat|confiden|filtr|masc|ascunz|securi|siguranț|intimitate|date personale|truc|ce vede|cloud-ul vede|vede cloud|ce (?:ajunge|pleacă|trimiți)(?: în| la)? cloud")],
    ["reserve", intent("reserve|buy|order|want one|pre-?order|sign me up|waitlist", "rezerv|cumpăr|comand|precomand|vreau (?:unul|una)|îl vreau|listă de așteptare|înscrie")],
    ["hardware", intent("price|cost|how much|box|hardware|jetson|orin|spec|specs|storage|tb|ship|arrive|deliver", "€|cost|preț(?:ul|uri|urile)?(?![\\p{L}])|cât (?:face|e|este)(?![\\p{L}])|scump|ieftin|bani(?![\\p{L}])|lei(?![\\p{L}])|euro|eur(?![\\p{L}])|cuti[ae]|hardware|jetson|orin|specificați|stocare|tb(?![\\p{L}])|livr|expedi|transport|ușa|ajunge la mine|ce primesc|ce vine|dimensiun|carcas|procesor")],
  ],
  rememberStrip: new RegExp(`^(?:${dia("(?:ține-?ți minte|ține minte|reține|nu uita|notează|memorează)(?: că)?")}|remember(?: that)?|note(?: that)?|don't forget(?: that)?)[:,]?\\s*`, "i"),
  remembered: "Salvat pe acest dispozitiv. Îl găsești în Memorie.",

  // moment 1: remembering a preference
  m1q1: "Ține minte: facturez în euro, cu plata la 30 de zile, și nu accept apeluri înainte de 10 dimineața.",
  m1a1: "Am notat. Salvat pe acest dispozitiv.",
  m1mem: [["Facturi", "EUR, plata la 30 de zile"], ["Apeluri", "Nimic înainte de 10:00"]],
  m1gap: "Trei săptămâni mai târziu",
  m1q2: "Pune-mi un call de kickoff cu Dan săptămâna viitoare și pregătește-i factura.",
  m1a2: "Iată un plan: kickoff-ul marți la 11:00, pentru că nu accepți apeluri înainte de 10, iar factura i-am pregătit-o în euro, cu plata la 30 de zile. Vrei să-i scriu lui Dan?",
  m1tag: "2 amintiri folosite · răspuns pe cutie · 0 B trimiși",

  // moment 2: finding something in your documents
  m2q: "Când expiră contractul cu Acme și cât preaviz trebuie să dau?",
  m2a: "Se încheie pe **31 august 2027**. Trebuie să dai un preaviz scris de 60 de zile, deci cel târziu până pe 2 iulie 2027.",
  m2file: "Contract_Consultanta_Acme_2024.pdf · pagina 3, §7",
  m2quote: "„Prezentul contract încetează la 31.08.2027. Oricare dintre părți îl poate denunța cu un preaviz scris de 60 de zile.”",
  m2tag: "găsit în fișierele tale · 0 B trimiși",
  m2after: "Fișierele tale sunt indexate chiar pe cutie. Nimic n-a fost încărcat ca să găsesc asta.",

  // moment 3: continuing after switching models
  m3q1: "Ce am hotărât despre lansarea Northwind?",
  m3a1: "Săptămâna de lansare e 12–19 iulie. Designerul e confirmat, întâlnirea de review cu Dan e pe 15, iar bugetul l-ai plafonat la 2.400 €.",
  m3switch: (a, b) => `Creier schimbat: ${a} → ${b}`,
  m3q2: "Și cât din buget a mai rămas?",
  m3a2: "750 €. Din plafonul de 2.400 €, 1.650 € sunt deja alocați: 1.100 € pentru designer și 550 € pentru reclame.",
  m3tag: "aceeași memorie · alt creier · nimic reînvățat",
  m3try: "Încearcă chiar tu:",
  switchLabel: "Schimbi creierul, păstrezi mintea",
  brainOnLoan: "Creier împrumutat",
  q: "Ce am hotărât despre lansarea Northwind?",
  brains: { codex: "OpenAI Codex", openrouter: "OpenRouter", next: "Cel mai bun de anul viitor" },
  brainSub: { codex: "prin contul tău OpenAI", openrouter: "sute de modele, o singură cheie", next: "oricare câștigă runda următoare" },
  answers: {
    codex: "Ai ales 12–19 iulie pentru săptămâna de lansare. Designerul e confirmat, întâlnirea de review cu Dan e pe 15, iar bugetul l-ai plafonat la 2.400 €.",
    openrouter: "Rămâne lansarea pe 12–19 iulie, cu designerul confirmat. Nu uita de întâlnirea de review cu Dan, pe 15, și de plafonul de 2.400 € pe care l-ai fixat.",
    next: "Lansare Northwind, 12–19 iulie. Designer: confirmat. Review cu Dan: pe 15. Buget: maximum 2.400 €. Vrei să încep lista de lansare?",
  },

  telegram1: "Pe Telegram.",
  telegram2: "Fără aplicații noi de învățat. Sunt un contact în Telegramul pe care îl folosești deja, pe telefon și pe laptop. Mesajele tale ajung la cutia de pe biroul tău și acolo gândesc, țin minte și păstrez conversațiile noastre.",

  import1: "Da. Adu-ți trecutul cu tine.",
  import2: "Exportă-ți istoricul din ChatGPT sau Claude (ambele îți permit să-l descarci), dă-mi fișierul și citesc fiecare conversație. Ani de context, mutați de pe serverele lor pe cutie. Importul conversațiilor este în dezvoltare și vine odată cu primele unități.",
  importLabel: "Mutare la tine",
  importRows: [["OpenAI", "conversațiile ChatGPT"], ["Anthropic", "conversațiile Claude"], ["Și alții", "mai multe exporturi, pe măsură ce apar"]],

  trick1: "Cel mai des răspund chiar pe cutie, cu modelul meu de pe dispozitiv și cu fișierele tale. Când ceva cere un model de top, întreb cloud-ul, dar mai întâi **maschez tot ce nu are nevoie să știe**: nume, numere, adrese.",
  trick2: "Încearcă: scrie o cerere cu un nume, un număr de telefon sau un IBAN în ea. Bara de deasupra câmpului arată, live, ce ar vedea cloud-ul.",
  trickExample: "Folosește un exemplu",
  trickExampleText: "Scrie un răspuns politicos către Radu Ionescu despre factura RO49 AAAA 1B31 0075 9384 0000. Spune-i că pot plăti pe 15 martie. Numărul meu e +40 722 123 456.",
  trickOut: (n, b, p) => `Asta cere un creier mai mare, așa că în realitate ar merge la ${p}: doar ${b}, cu ${detPersonalMasked(n)}. Valorile reale rămân pe cutie și sunt puse la loc în răspuns tot acolo.`,
  trickOutClean: (p) => `Asta ar merge la ${p} exact cum ai scris-o. N-am găsit nimic personal de mascat.`,
  trickHome: "Aș răspunde la asta pe cutie, din fișierele tale. Nimic nu ar ieși.",
  staysHome: "Rămâne pe cutie",
  trickAfter: "Nu e 100% privat și nu pretind altceva. Expunere minimă, prin design. (În această previzualizare, nimic din ce scrii nu iese din browserul tău.)",
  previewCloud: (p) => `${p} ar vedea:`,
  previewHome: "Rămâne pe cutie",
  atHome: "pe cutie · 0 B trimiși",
  filtered: (n) => cnt(n, "mascat", "mascate"),
  cloudSees: (b) => `Ce ar vedea cloud-ul · ${b} (simulat)`,

  diff1: "Ei îți închiriază un creier. Eu sunt al tău.",
  diff2: "Toamna aceasta, fiecare mare laborator a lansat un agent mereu activ. Produse impresionante, cu un lucru în comun:",
  rcptTitle: "Inteligență închiriată",
  rcptSub: "Agenți mereu activi, lansați în 2026",
  rcptHead: ["Agent", "Unde trăiește memoria lui despre tine", "Creier", "Îl iei cu tine"],
  rcptRows: [
    { c: ["OpenAI dots", "Cloud-ul producătorului", "Doar al producătorului", "Nedocumentat"] },
    { c: ["xAI Grok Bot", "Cloud-ul producătorului", "Doar al producătorului", "Nedocumentat"] },
    { c: ["Anthropic Claude Duet", "Cloud-ul producătorului", "Doar al producătorului", "Nedocumentat"] },
    { c: ["Meta Muse", "Cloud-ul producătorului", "Doar al producătorului", "Nedocumentat"] },
    { c: ["inteligentia", "Biroul tău", "Alegerea ta", "E al tău. Poți aduce și creierele lor."], us: true },
  ],
  rcptNote: "Din paginile publice ale fiecărui producător, la 1 noiembrie 2026. „Nedocumentat” înseamnă că nu am găsit nicio metodă publicată de a exporta memoria agentului sau de a o muta pe alt model.",
  sources: "Surse",
  diff3: "Pot folosi totuși creierele lor, când o întrebare are nevoie de unul. Diferența: memoria despre tine rămâne la tine, iar tu alegi creierul cui îl împrumut.",

  hardware1: "Un computer mic pentru biroul tău, cam cât o palmă.",
  hardwareCta: "Hardware și preț",
  reserve1: "Tot ce ai nevoie ca să te decizi e într-un singur loc: cutia, prețul, ce include și condițiile.",
  reserveCta: "Mergi la rezervare",

  memory1: (k) => k ? `Țin minte ${things(k)}. Toate sunt în panoul Memorie: stocarea acestui browser, pe dispozitivul tău.` : "Încă nimic. Începe un mesaj cu „ține minte” și îl păstrez.",
  memory2: "Vrei să uit? Un singur buton și s-a dus.",
  memEmpty: "Încă nimic. Ce îmi spui ajunge aici.",
  memK: { name: "Nume", fact: "Mi-ai spus" },
  forgot: "Gata. Am uitat tot. Asta înseamnă să fie al tău.",

  unknownCloud: (n, p) => `Pe o cutie reală aș răspunde la asta cu ajutor de la ${p}. Aici sunt o previzualizare, așa că ți-am arătat ce ar fi plecat, cu ${detMasked(n)}.`,
  unknownCloudClean: (p) => `Pe o cutie reală aș răspunde la asta cu ajutor de la ${p}. Aici sunt o previzualizare: mai sus este ce ar fi plecat.`,
  unknownHome: "Pe o cutie reală aș răspunde la asta chiar pe ea, din fișierele tale și din conversațiile noastre de până acum. Această previzualizare cunoaște doar câteva subiecte. Încearcă unul dintre cele de mai jos.",
  };
})();
