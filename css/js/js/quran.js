(function () {
  "use strict";

  // ==========================================
  // يقين - القرآن الكريم والتخزين دون إنترنت
  // ==========================================

  const API = "https://mp3quran.net/api/v3";
  const TEXT_API = "https://quran-json.risanb.com/text/uthmani/chapters";

  const DB_NAME = "yaqeen-quran-offline";
  const DB_VERSION = 1;
  const TEXT_STORE = "texts";
  const AUDIO_STORE = "audio";
  const META_STORE = "meta";

  const surahNames = [
    "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
    "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
    "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
    "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
    "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
    "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
    "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
    "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
    "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
    "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
    "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
    "المسد","الإخلاص","الفلق","الناس"
  ];

  const readers = {
    mishary: ["مشاري راشد العفاسي","مشاري العفاسي","Mishary Rashid Alafasy"],
    husary: ["محمود خليل الحصري","الحصري","Mahmoud Khalil Al-Hussary"],
    abdulbasit: ["عبدالباسط عبدالصمد","عبد الباسط عبد الصمد","Abdul Basit Abdul Samad"],
    sudais: ["عبدالرحمن السديس","عبد الرحمن السديس","Abdurrahman As-Sudais"],
    minshawi: ["محمد صديق المنشاوي","محمد صديق المنشاوى","Mohamed Siddiq El-Minshawi"],
    shuraim: ["سعود الشريم","Saud Al-Shuraim"],
    ajamy: ["أحمد بن علي العجمي","احمد العجمي","Ahmed Al-Ajmi"],
    jibreel: ["محمد جبريل","Mohamed Jebreel"],
    ayoub: ["محمد أيوب","محمد ايوب","Mohammad Ayyub"],
    hudhaify: ["علي الحذيفي","علي بن عبدالرحمن الحذيفي","Ali Al-Hudhaify"],
    abdulrahman_mossad: ["عبدالرحمن مسعد","عبد الرحمن مسعد","Abdulrahman Mossad"]
  };

  const mossadSurahs = {
    32: "https://download.tvquran.com/download/recitations/372/303/032.mp3",
    73: "https://download.tvquran.com/download/recitations/372/303/073.mp3",
    78: "https://download.tvquran.com/download/recitations/372/303/078.mp3",
    87: "https://download.tvquran.com/download/recitations/372/303/087.mp3",
    88: "https://download.tvquran.com/download/recitations/372/303/088.mp3",
    100: "https://download.tvquran.com/download/recitations/372/303/100.mp3",
    107: "https://download.tvquran.com/download/recitations/372/303/107.mp3"
  };

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  if (!surahList || !readerSelect) {
    console.error("يقين: عناصر قسم القرآن غير موجودة");
    return;
  }

  let status = document.getElementById("quran-status");
  let audio = document.getElementById("quran-audio");
  let reader = document.getElementById("quran-text");

  if (!status) {
    status = document.createElement("p");
    status.id = "quran-status";
    surahList.before(status);
  }

  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "quran-audio";
    audio.controls = true;
    audio.preload = "metadata";
    surahList.after(audio);
  }

  if (!reader) {
    reader = document.createElement("div");
    reader.id = "quran-text";
    audio.after(reader);
  }

  status.style.cssText =
    "text-align:center;padding:10px;line-height:1.8;";

  audio.style.cssText =
    "display:block;width:100%;margin:15px auto;";

  reader.style.cssText =
    "direction:rtl;text-align:justify;line-height:2.5;font-size:22px;padding:15px;";

  let dbPromise = null;
  let reciters = [];
  let currentAudioUrl = null;
  let currentSession = 0;
  let currentSurah = 0;
  let currentSurahName = "";

  const surahs = surahNames.map((name, index) => ({
    number: index + 1,
    name
  }));

  function setStatus(message) {
    status.textContent = message;
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/\u0640/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^a-z0-9\u0600-\u06FF]/g, "");
  }

  function selectedReaderKey() {
    const value = readerSelect.value;

    if (readers[value]) return value;

    const option =
      readerSelect.options[readerSelect.selectedIndex];

    const label = normalize(option ? option.textContent : value);

    for (const key of Object.keys(readers)) {
      if (readers[key].some(name => normalize(name) === label)) {
        return key;
      }
    }

    return value || "unknown";
  }

  function isMossad() {
    return selectedReaderKey() === "abdulrahman_mossad";
  }

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("التخزين المحلي غير مدعوم"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(TEXT_STORE)) {
          db.createObjectStore(TEXT_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  async function dbGet(store, id) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readonly")
        .objectStore(store).get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbPut(store, value) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);

      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function dbAllKeys(store) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readonly")
        .objectStore(store).getAllKeys();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function textId(number) {
    return "surah:" + number;
  }

  function audioId(key, number) {
    return key + ":" + String(number).padStart(3, "0");
  }

  function stopAudio() {
    currentSession++;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
  }

  function createButton(label, callback) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText =
      "margin:5px;padding:9px 12px;border-radius:9px;cursor:pointer;";

    button.addEventListener("click", callback);
    return button;
  }

  async function loadReciters() {
    const cached = await dbGet(META_STORE, "reciters");

    if (cached && Array.isArray(cached.value)) {
      reciters = cached.value;
    }

    if (!navigator.onLine) return reciters.length > 0;

    try {
      const response = await fetch(API + "/reciters?language=ar");

      if (!response.ok) throw new Error("تعذر تحميل القراء");

      const result = await response.json();

      if (Array.isArray(result.reciters) && result.reciters.length) {
        reciters = result.reciters;

        await dbPut(META_STORE, {
          id: "reciters",
          value: reciters
        });
      }

      return reciters.length > 0;
    } catch (error) {
      console.warn("Quran reciters:", error);
      return reciters.length > 0;
    }
  }

  function findReader() {
    const key = selectedReaderKey();
    const aliases = readers[key] || [];

    return reciters.find(reciter => {
      const name = normalize(reciter.name);

      return aliases.some(alias => {
        const normalized = normalize(alias);
        return name === normalized ||
          (normalized.length >= 6 && name.includes(normalized)) ||
          (name.length >= 6 && normalized.includes(name));
      });
    }) || null;
  }

  function getAvailableSurahs(moshaf) {
    return String(moshaf.surah_list || "")
      .split(",")
      .map(Number)
      .filter(number => number >= 1 && number <= 114);
  }

  async function getAudioUrl(number) {
    if (isMossad()) {
      if (!mossadSurahs[number]) {
        throw new Error("هذه السورة غير متاحة لهذا القارئ");
      }

      return mossadSurahs[number];
    }

    if (!reciters.length) {
      await loadReciters();
    }

    const reciter = findReader();

    if (!reciter) {
      throw new Error("تعذر العثور على القارئ. اتصل بالإنترنت وحاول مجدداً.");
    }

    const moshaf = (reciter.moshaf || []).find(item =>
      getAvailableSurahs(item).includes(Number(number))
    );

    if (!moshaf || !moshaf.server) {
      throw new Error("السورة غير متاحة لهذا القارئ");
    }

    const server = moshaf.server.endsWith("/")
      ? moshaf.server
      : moshaf.server + "/";

    return server + String(number).padStart(3, "0") + ".mp3";
  }

  async function getSurahText(number) {
    const cached = await dbGet(TEXT_STORE, textId(number));

    if (cached && Array.isArray(cached.verses) && cached.verses.length) {
      return cached;
    }

    if (!navigator.onLine) {
      throw new Error("نص السورة غير محفوظ. اتصل بالإنترنت لتنزيله أولاً.");
    }

    const response = await fetch(TEXT_API + "/" + number + ".json");

    if (!response.ok) throw new Error("تعذر تحميل نص السورة");

    const data = await response.json();

    if (!Array.isArray(data.verses) || !data.verses.length) {
      throw new Error("بيانات السورة غير مكتملة");
    }

    await dbPut(TEXT_STORE, {
      id: textId(number),
      number,
      verses: data.verses,
      notice: data.notice || ""
    });

    return data;
  }
    async function saveLastPosition(surah, ayah) {
    await dbPut(META_STORE, {
      id: "last-position",
      surah,
      ayah,
      updatedAt: Date.now()
    });
  }

 async function downloadSurahAudio(number) {
  if (!navigator.onLine) {
    throw new Error("اتصل بالإنترنت لتنزيل التلاوة أولاً");
  }

  const key = selectedReaderKey();
  const id = audioId(key, number);

  const saved = await dbGet(AUDIO_STORE, id);

  if (saved && saved.blob && saved.blob.size > 0) {
    setStatus("التلاوة محفوظة بالفعل على الجهاز");
    return;
  }

  const url = await getAudioUrl(number);

  setStatus("جاري تنزيل سورة " + surahNames[number - 1]);

  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      "الخادم منع تنزيل الصوت داخل التطبيق بسبب CORS. " +
      "يمكنك الاستماع أونلاين، لكن لم يتم حفظ الملف دون إنترنت."
    );
  }

  if (!response.ok) {
    throw new Error("تعذر تنزيل الصوت من الخادم");
  }

  const blob = await response.blob();

  if (!blob.size) {
    throw new Error("ملف الصوت فارغ");
  }

  await dbPut(AUDIO_STORE, {
    id,
    readerKey: key,
    surah: number,
    blob,
    size: blob.size,
    savedAt: Date.now()
  });

  setStatus("تم تنزيل التلاوة وحفظها على الجهاز");

  await renderSurahs();
}
  async function readSurah(number, verseToRestore) {
    stopAudio();

    const session = currentSession;

    currentSurah = number;
    currentSurahName = surahNames[number - 1];

    reader.innerHTML = "";

    setStatus("جاري تجهيز سورة " + currentSurahName);

    try {
      const data = await getSurahText(number);

      if (session !== currentSession) return;

      const heading = document.createElement("h2");
      heading.textContent = currentSurahName;
      heading.style.cssText =
        "text-align:center;color:var(--gold);";

      reader.appendChild(heading);

      const container = document.createElement("div");
      container.style.cssText =
        "direction:rtl;text-align:justify;line-height:2.6;font-size:23px;";

      data.verses.forEach((ayah, index) => {
        const span = document.createElement("span");

        span.id = "quran-ayah-" + number + "-" + (index + 1);
        span.textContent = ayah.text + " ﴿" + (ayah.id || index + 1) + "﴾ ";
        span.style.cursor = "pointer";
        span.title = "اضغط لحفظ موضع القراءة";

        span.addEventListener("click", async () => {
          try {
            await saveLastPosition(number, index + 1);
            setStatus(
              "تم حفظ موضع القراءة: " +
              currentSurahName + " - الآية " + (index + 1)
            );
          } catch (error) {
            setStatus("تعذر حفظ موضع القراءة");
          }
        });

        container.appendChild(span);
      });

      reader.appendChild(container);
      addSourceNotice(data);

      const ayahNumber = Math.max(
        1,
        Math.min(Number(verseToRestore) || 1, data.verses.length)
      );

      await saveLastPosition(number, ayahNumber);

      if (session !== currentSession) return;

      setStatus(
        "تم فتح سورة " + currentSurahName +
        (navigator.onLine ? "" : " - دون إنترنت")
      );

      if (ayahNumber > 1) {
        const target = document.getElementById(
          "quran-ayah-" + number + "-" + ayahNumber
        );

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
      } else {
        reader.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    } catch (error) {
      if (session !== currentSession) return;

      console.error("Quran text:", error);
      setStatus(error.message || "تعذر فتح السورة");
    }
  }

  async function resumeLastPosition() {
    try {
      const last = await dbGet(META_STORE, "last-position");

      if (!last || !last.surah) {
        setStatus("لا يوجد موضع قراءة محفوظ حتى الآن");
        return;
      }

      await readSurah(last.surah, last.ayah || 1);
    } catch (error) {
      setStatus("تعذر استعادة آخر موضع قراءة");
    }
  }

  async function downloadAllTexts() {
    if (!navigator.onLine) {
      setStatus("اتصل بالإنترنت لتنزيل القرآن أول مرة");
      return;
    }

    const button = document.getElementById("quran-download-texts");
    if (button) button.disabled = true;

    try {
      for (let number = 1; number <= 114; number++) {
        const cached = await dbGet(TEXT_STORE, textId(number));

        if (!cached) {
          const response = await fetch(TEXT_API + "/" + number + ".json");

          if (!response.ok) {
            throw new Error("تعذر تنزيل سورة " + surahNames[number - 1]);
          }

          const data = await response.json();

          if (!Array.isArray(data.verses) || !data.verses.length) {
            throw new Error("بيانات السورة غير مكتملة");
          }

          await dbPut(TEXT_STORE, {
            id: textId(number),
            number,
            verses: data.verses,
            notice: data.notice || ""
          });
        }

        setStatus(
          "حفظ نص القرآن: " + number + " من 114 سورة"
        );
      }

      setStatus("تم حفظ نص القرآن الكريم كاملاً على الجهاز");
      await renderSurahs();
    } catch (error) {
      setStatus(
        (error.message || "تعذر تنزيل النصوص") +
        " — يمكنك إعادة المحاولة لاستكمال التنزيل"
      );
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function downloadSurahAudio(number) {
    if (!navigator.onLine) {
      throw new Error("اتصل بالإنترنت لتنزيل التلاوة أول مرة");
    }

    const key = selectedReaderKey();
    const id = audioId(key, number);

    const saved = await dbGet(AUDIO_STORE, id);

    if (saved && saved.blob) {
      setStatus("التلاوة محفوظة بالفعل على الجهاز");
      return;
    }

    const url = await getAudioUrl(number);

    setStatus("جاري تنزيل سورة " + surahNames[number - 1]);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("تعذر تنزيل الصوت من الخادم");
    }

    const blob = await response.blob();

    if (!blob.size) {
      throw new Error("ملف الصوت فارغ");
    }

    await dbPut(AUDIO_STORE, {
      id,
      readerKey: key,
      surah: number,
      blob,
      size: blob.size,
      savedAt: Date.now()
    });

    setStatus("تم تنزيل وحفظ التلاوة على الجهاز");
    await renderSurahs();
  }

  async function playSurah(number) {
    stopAudio();

    const session = currentSession;

    currentSurah = number;
    currentSurahName = surahNames[number - 1];

    try {
      const key = selectedReaderKey();

      const saved = await dbGet(
        AUDIO_STORE,
        audioId(key, number)
      );

      if (session !== currentSession) return;

      if (saved && saved.blob) {
        currentAudioUrl = URL.createObjectURL(saved.blob);
        audio.src = currentAudioUrl;

        setStatus("تشغيل التلاوة المحفوظة دون إنترنت");
      } else {
        if (!navigator.onLine) {
          throw new Error("التلاوة غير محفوظة. نزّلها أولاً أثناء الاتصال.");
        }

        audio.src = await getAudioUrl(number);

        if (session !== currentSession) return;

        setStatus("جاري تشغيل سورة " + currentSurahName);
      }

      audio.load();
      await audio.play();

      if (session !== currentSession) {
        audio.pause();
      }
    } catch (error) {
      if (session === currentSession) {
        setStatus(error.message || "تعذر تشغيل التلاوة");
      }
    }
  }

  async function renderSurahs() {
    surahList.innerHTML = "";

    const toolbar = document.createElement("div");
    toolbar.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;";

    const downloadTexts = createButton(
      "⬇️ تنزيل نص القرآن كاملاً",
      downloadAllTexts
    );

    downloadTexts.id = "quran-download-texts";

    toolbar.appendChild(downloadTexts);

    toolbar.appendChild(
      createButton("↩️ متابعة آخر قراءة", resumeLastPosition)
    );

    surahList.appendChild(toolbar);

    const key = selectedReaderKey();

    const savedAudio = new Set(
      (await dbAllKeys(AUDIO_STORE)).map(String)
    );

    const savedTexts = new Set(
      (await dbAllKeys(TEXT_STORE)).map(String)
    );

    const info = document.createElement("p");

    info.textContent =
      "النصوص المحفوظة: " + savedTexts.size +
      " / 114 سورة";

    info.style.cssText =
      "text-align:center;color:var(--gold);padding:10px;";

    surahList.appendChild(info);

    const available = isMossad()
      ? surahs.filter(s => mossadSurahs[s.number])
      : surahs;

    if (isMossad()) {
      const message = document.createElement("p");
      message.textContent =
        "التلاوات المتاحة لعبدالرحمن مسعد: 7 سور";
      message.style.textAlign = "center";
      surahList.appendChild(message);
    }

    available.forEach(surah => {
      const card = document.createElement("div");

      card.style.cssText =
        "padding:12px;margin:8px 0;border:1px solid rgba(190,165,95,.35);border-radius:12px;";

      const heading = document.createElement("h3");
      heading.textContent =
        surah.number + ". سورة " + surah.name;

      const actions = document.createElement("div");
      actions.style.cssText =
        "display:flex;flex-wrap:wrap;gap:5px;";

      actions.appendChild(
        createButton("📖 قراءة", () => readSurah(surah.number, 1))
      );

      actions.appendChild(
        createButton("🎧 استماع", () => playSurah(surah.number))
      );

      const id = audioId(key, surah.number);
      const isSaved = savedAudio.has(id);

      const download = createButton(
        isSaved ? "✓ محفوظة على الجهاز" : "⬇️ تنزيل الصوت",
        async () => {
          download.disabled = true;

          try {
            await downloadSurahAudio(surah.number);
          } catch (error) {
            setStatus(
              error.message || "تعذر تنزيل التلاوة"
            );
          } finally {
            download.disabled = false;
          }
        }
      );

      download.disabled = isSaved;

      actions.appendChild(download);

      card.appendChild(heading);
      card.appendChild(actions);

      surahList.appendChild(card);
    });
  }

  audio.addEventListener("ended", () => {
    setStatus("انتهى الاستماع لسورة " + currentSurahName);
  });

  audio.addEventListener("error", () => {
    if (audio.src) {
      setStatus("تعذر تشغيل الصوت. تحقق من الاتصال أو جرّب قارئاً آخر.");
    }
  });

  readerSelect.addEventListener("change", () => {
    stopAudio();
    reader.innerHTML = "";

    renderSurahs().catch(error => {
      setStatus(error.message);
    });
  });

  window.addEventListener("online", () => {
    setStatus("عاد الاتصال بالإنترنت");
  });

  window.addEventListener("offline", () => {
    setStatus("أنت الآن دون اتصال — المحتوى المحفوظ متاح");
  });

  window.addEventListener("beforeunload", () => {
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
    }
  });

  async function init() {
    try {
      setStatus("جاري تجهيز مكتبة القرآن الكريم...");

      await openDB();
      await loadReciters();
      await renderSurahs();

      setStatus(
        navigator.onLine
          ? "اختر سورة للقراءة أو الاستماع أو التنزيل"
          : "وضع عدم الاتصال: المحتوى المحفوظ متاح"
      );
    } catch (error) {
      console.error("Quran initialization:", error);
      setStatus("تعذر تشغيل مكتبة القرآن. حاول إعادة فتح التطبيق.");
    }
  }

  init();

})();
