
(function () {
  "use strict";

  // =====================================
  // إعدادات مصادر القرآن الكريم
  // =====================================

  const API_SOURCES = [
    "https://api.alquran.cloud/v1",
    "https://alquran.api.alislam.ru/v1"
  ];

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  if (!surahList) return;

  // =====================================
  // القراء العشرة
  // =====================================

  const readers = {
    mishary: "ar.alafasy",
    husary: "ar.husary",
    abdulbasit: "ar.abdulbasit",
    sudais: "ar.sudais",
    minshawi: "ar.minshawi",
    shuraim: "ar.shuraim",
    ajamy: "ar.ajamy",
    jibreel: "ar.muhammadjibreel",
    ayoub: "ar.muhammadayoub",
    hudhaify: "ar.hudhaify"
  };

  // =====================================
  // إعدادات الصوت
  // =====================================

  const audio = new Audio();
  audio.preload = "none";

  let surahs = [];
  let currentAyahs = [];
  let currentAyahIndex = 0;
  let playRequest = 0;
  let textRequest = 0;
  let playbackStatus = null;

  // =====================================
  // تنسيق واجهة القرآن
  // =====================================

  const style = document.createElement("style");

  style.textContent = `
    .quran-surah-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .quran-surah-actions button,
    .quran-reader-tools button {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      font: inherit;
    }

    .quran-read-btn {
      background: #e8d7ad;
      color: #292216;
    }

    .quran-play-btn {
      background: #176b50;
      color: #fff;
    }

    .quran-reading-panel {
      margin-top: 12px;
      padding: 14px;
      border-radius: 12px;
      background: rgba(128,128,128,.09);
      line-height: 2.2;
    }

    .quran-reading-panel h4 {
      text-align: center;
      margin: 4px 0 14px;
    }

    .quran-ayah {
      display: inline;
      line-height: 2.25;
      font-size: 1.25rem;
    }

    .quran-ayah-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid currentColor;
      border-radius: 50%;
      width: 27px;
      height: 27px;
      font-size: .78rem;
      margin: 0 5px;
    }

    .quran-reader-tools {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 10px 0;
    }

    .quran-reader-status {
      font-size: .9rem;
      margin-top: 8px;
      min-height: 1.4em;
    }

    @media(max-width:480px) {
      .quran-surah-actions button,
      .quran-reader-tools button {
        flex: 1 1 100%;
      }

      .quran-ayah {
        font-size: 1.15rem;
      }
    }
  `;

  document.head.appendChild(style);

  // =====================================
  // طلب البيانات مع مصدر احتياطي
  // =====================================

  async function fetchQuran(path) {

    let lastError = null;

    for (const base of API_SOURCES) {

      try {

        const response = await fetch(base + path, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(
            "HTTP Error: " + response.status
          );
        }

        const result = await response.json();

        if (!result || result.code !== 200) {
          throw new Error("بيانات القرآن غير صالحة");
        }

        console.log(
          "Quran API connected:",
          base
        );

        return result;

      } catch (error) {

        lastError = error;

        console.warn(
          "Quran API failed:",
          base,
          error
        );

      }

    }

    throw lastError || new Error(
      "تعذر الاتصال بجميع مصادر القرآن"
    );
  }

  // =====================================
  // تحديد القارئ
  // =====================================

  function getEdition() {

    const selected = readerSelect
      ? readerSelect.value
      : "mishary";

    return readers[selected] || readers.mishary;
  }

  // =====================================
  // تحديث حالة الاستماع
  // =====================================

  function setStatus(message) {

    if (playbackStatus) {
      playbackStatus.textContent = message;
    }

  }

  // =====================================
  // إيقاف الصوت
  // =====================================

  function stopAudio() {

    playRequest++;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    currentAyahs = [];
    currentAyahIndex = 0;

    setStatus("تم إيقاف الاستماع.");

  }

  // =====================================
  // إنشاء لوحة القراءة
  // =====================================

  function createPanel(card) {

    let panel = card.querySelector(
      ".quran-reading-panel"
    );

    if (!panel) {

      panel = document.createElement("div");

      panel.className = "quran-reading-panel";

      card.appendChild(panel);

    }

    return panel;
  }

  // =====================================
  // تحميل السور الـ 114
  // =====================================

  async function loadSurahs() {

    surahList.innerHTML =
      "<p>جاري تحميل سور القرآن الكريم...</p>";

    try {

      const result = await fetchQuran("/surah");

      if (!Array.isArray(result.data)) {
        throw new Error("قائمة السور غير متاحة");
      }

      surahs = result.data;

      if (surahs.length !== 114) {
        throw new Error("قائمة السور غير مكتملة");
      }

      surahList.innerHTML = "";

      surahs.forEach(function (surah) {

        const card = document.createElement("div");

        card.className = "surah-item";

        const info = document.createElement("div");

        const name = document.createElement("strong");

        name.textContent =
          surah.number + ". " + surah.name;

        const details = document.createElement("small");

        details.textContent =
          " — " +
          (surah.revelationType === "Meccan"
            ? "مكية"
            : "مدنية") +
          " — " +
          surah.numberOfAyahs +
          " آية";

        info.appendChild(name);
        info.appendChild(details);

        const actions = document.createElement("div");

        actions.className = "quran-surah-actions";

        // زر القراءة

        const readButton = document.createElement("button");

        readButton.type = "button";
        readButton.className = "quran-read-btn";
        readButton.textContent = "📖 قراءة";

        readButton.addEventListener("click", function () {

          loadSurahText(
            surah.number,
            card,
            surah.name
          );

        });

        // زر الاستماع

        const playButton = document.createElement("button");

        playButton.type = "button";
        playButton.className = "quran-play-btn";
        playButton.textContent = "▶ استماع";

        playButton.addEventListener("click", function () {

          playSurah(surah.number, card);

        });

        actions.appendChild(readButton);
        actions.appendChild(playButton);

        card.appendChild(info);
        card.appendChild(actions);

        surahList.appendChild(card);

      });

      console.log(
        "تم تحميل جميع سور القرآن الكريم:",
        surahs.length
      );

    } catch (error) {

      console.error("Quran loading error:", error);

      surahList.innerHTML = `
        <div class="quran-reading-panel">
          <p>تعذر تحميل سور القرآن الكريم.</p>
          <p>تأكد من اتصال الإنترنت وحاول مرة أخرى.</p>
          <button
            type="button"
            class="quran-read-btn"
            id="retry-quran-loading"
          >
            🔄 إعادة المحاولة
          </button>
        </div>
      `;

      const retryButton = document.getElementById(
        "retry-quran-loading"
      );

      if (retryButton) {
        retryButton.addEventListener(
          "click",
          loadSurahs
        );
      }

    }

  }

  // =====================================
  // قراءة نص السورة
  // =====================================

  async function loadSurahText(
    surahNumber,
    card,
    surahName
  ) {

    stopAudio();

    const requestId = ++textRequest;

    const panel = createPanel(card);

    panel.textContent =
      "جاري تحميل آيات السورة...";

    try {

      const result = await fetchQuran(
        "/surah/" +
        surahNumber +
        "/quran-uthmani"
      );

      if (requestId !== textRequest) return;

      if (
        !result.data ||
        !Array.isArray(result.data.ayahs)
      ) {

        throw new Error(
          "نص السورة غير متاح"
        );

      }

      panel.innerHTML = "";

      const heading = document.createElement("h4");

      heading.textContent = "سورة " + surahName;

      panel.appendChild(heading);

      // البسملة

      if (surahNumber !== 1 && surahNumber !== 9) {

        const basmala = document.createElement("p");

        basmala.textContent =
          "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

        basmala.style.textAlign = "center";

        panel.appendChild(basmala);

      }

      // عرض الآيات

      result.data.ayahs.forEach(function (ayah) {

        const verse = document.createElement("span");

        verse.className = "quran-ayah";

        verse.textContent = ayah.text + " ";

        panel.appendChild(verse);

        const number = document.createElement("span");

        number.className = "quran-ayah-number";

        number.textContent = ayah.numberInSurah;

        panel.appendChild(number);

        panel.appendChild(
          document.createTextNode(" ")
        );

      });

      panel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });

    } catch (error) {

      if (requestId !== textRequest) return;

      console.error("Quran text error:", error);

      panel.textContent =
        "تعذر تحميل الآيات. تأكد من الإنترنت وحاول مرة أخرى.";

    }

  }

  // =====================================
  // تشغيل السورة
  // =====================================

  async function playSurah(surahNumber, card) {

    stopAudio();

    const requestId = playRequest;

    const edition = getEdition();

    const panel = createPanel(card);

    panel.innerHTML = "";

    const status = document.createElement("p");

    status.className = "quran-reader-status";

    status.textContent =
      "جاري تجهيز صوت القارئ...";

    panel.appendChild(status);

    playbackStatus = status;

    const tools = document.createElement("div");

    tools.className = "quran-reader-tools";

    const stopButton = document.createElement("button");

    stopButton.type = "button";

    stopButton.textContent =
      "■ إيقاف الاستماع";

    stopButton.addEventListener(
      "click",
      stopAudio
    );

    tools.appendChild(stopButton);

    panel.appendChild(tools);

    try {

      const result = await fetchQuran(
        "/surah/" +
        surahNumber +
        "/" +
        edition
      );

      if (requestId !== playRequest) return;

      if (
        !result.data ||
        !Array.isArray(result.data.ayahs)
      ) {

        throw new Error(
          "بيانات الصوت غير متاحة"
        );

      }

      currentAyahs = result.data.ayahs;

      currentAyahIndex = 0;

      if (
        !currentAyahs.length ||
        !currentAyahs[0].audio
      ) {

        throw new Error(
          "لا يوجد تسجيل صوتي لهذا القارئ"
        );

      }

      const readerName =
        readerSelect &&
        readerSelect.options[
          readerSelect.selectedIndex
        ]
          ? readerSelect.options[
              readerSelect.selectedIndex
            ].text
          : "القارئ";

      setStatus(
        "بدأ الاستماع — " + readerName
      );

      playCurrentAyah(requestId);

    } catch (error) {

      if (requestId !== playRequest) return;

      console.error(
        "Quran audio error:",
        error
      );

      setStatus(
        "تعذر تشغيل القارئ حاليًا. جرّب قارئًا آخر أو أعد المحاولة."
      );

    }

  }

  // =====================================
  // تشغيل الآيات بالتتابع
  // =====================================

  function playCurrentAyah(requestId) {

    if (requestId !== playRequest) return;

    if (
      currentAyahIndex >= currentAyahs.length
    ) {

      currentAyahs = [];

      setStatus(
        "انتهى تشغيل السورة."
      );

      return;

    }

    const ayah = currentAyahs[currentAyahIndex];

    if (!ayah || !ayah.audio) {

      currentAyahIndex++;

      playCurrentAyah(requestId);

      return;

    }

    audio.src = ayah.audio;

    audio.load();

    audio.play()
      .then(function () {

        if (requestId === playRequest) {

          setStatus(
            "جاري الاستماع — الآية " +
            (
              ayah.numberInSurah ||
              currentAyahIndex + 1
            )
          );

        }

      })
      .catch(function (error) {

        if (requestId !== playRequest) return;

        console.error(
          "Audio playback error:",
          error
        );

        setStatus(
          "لم يبدأ الصوت. اضغط استماع مرة أخرى أو جرّب قارئًا آخر."
        );

      });

  }

  // =====================================
  // الانتقال للآية التالية
  // =====================================

  audio.addEventListener("ended", function () {

    if (!currentAyahs.length) return;

    currentAyahIndex++;

    playCurrentAyah(playRequest);

  });

  // =====================================
  // أخطاء الصوت
  // =====================================

  audio.addEventListener("error", function () {

    if (currentAyahs.length) {

      setStatus(
        "حدث خطأ أثناء تحميل الصوت. جرّب قارئًا آخر."
      );

    }

  });

  // =====================================
  // تغيير القارئ
  // =====================================

  if (readerSelect) {

    readerSelect.addEventListener(
      "change",
      function () {

        if (currentAyahs.length) {

          stopAudio();

          setStatus(
            "تم تغيير القارئ. اختر السورة للاستماع بالقارئ الجديد."
          );

        }

      }
    );

  }

  // =====================================
  // بدء تشغيل قسم القرآن
  // =====================================

  loadSurahs();

})();
