
(function () {
  "use strict";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");
  if (!surahList) return;

  // القراء العشرة
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

  const audio = new Audio();
  audio.preload = "none";

  let surahs = [];
  let currentAyahs = [];
  let currentAyahIndex = 0;
  let playRequest = 0;
  let playbackStatus = null;

  const style = document.createElement("style");
  style.textContent = `
    .quran-surah-actions {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top:10px
    }
    .quran-surah-actions button,
    .quran-reader-tools button {
      border:0;
      border-radius:10px;
      padding:10px 14px;
      cursor:pointer;
      font:inherit
    }
    .quran-read-btn {
      background:#e8d7ad;
      color:#292216
    }
    .quran-play-btn {
      background:#176b50;
      color:#fff
    }
    .quran-reading-panel {
      margin-top:12px;
      padding:14px;
      border-radius:12px;
      background:rgba(128,128,128,.09);
      line-height:2.2
    }
    .quran-reading-panel h4 {
      text-align:center;
      margin:4px 0 14px
    }
    .quran-ayah {
      display:inline;
      line-height:2.25;
      font-size:1.25rem
    }
    .quran-ayah-number {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border:1px solid currentColor;
      border-radius:50%;
      width:27px;
      height:27px;
      font-size:.78rem;
      margin:0 5px
    }
    .quran-reader-tools {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin:10px 0
    }
    .quran-reader-status {
      font-size:.9rem;
      margin-top:8px;
      min-height:1.4em
    }
    @media(max-width:480px) {
      .quran-surah-actions button,
      .quran-reader-tools button {
        flex:1 1 100%
      }
      .quran-ayah {
        font-size:1.15rem
      }
    }
  `;
  document.head.appendChild(style);

  function getEdition() {
    const selected = readerSelect ? readerSelect.value : "mishary";
    return readers[selected] || readers.mishary;
  }

  function setStatus(message) {
    if (playbackStatus) {
      playbackStatus.textContent = message;
    }
  }

  function stopAudio() {
    playRequest++;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    currentAyahs = [];
    currentAyahIndex = 0;
    setStatus("تم إيقاف الاستماع.");
  }

  async function loadSurahs() {
    surahList.innerHTML = "<p>جاري تحميل سور القرآن الكريم...</p>";

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah"
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل السور");
      }

      const result = await response.json();

      if (result.code !== 200 || !Array.isArray(result.data)) {
        throw new Error("بيانات السور غير متاحة");
      }

      surahs = result.data;
      surahList.innerHTML = "";

      surahs.forEach(function (surah) {
        const card = document.createElement("div");
        card.className = "surah-item";

        const info = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = surah.number + ". " + surah.name;

        const details = document.createElement("small");
        details.textContent =
          " — " +
          (surah.revelationType === "Meccan" ? "مكية" : "مدنية") +
          " — " +
          surah.numberOfAyahs +
          " آية";

        info.appendChild(name);
        info.appendChild(details);

        const actions = document.createElement("div");
        actions.className = "quran-surah-actions";

        const readButton = document.createElement("button");
        readButton.type = "button";
        readButton.className = "quran-read-btn";
        readButton.textContent = "📖 قراءة";

        readButton.addEventListener("click", function () {
          loadSurahText(surah.number, card, surah.name);
        });

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

    } catch (error) {
      console.error("Quran loading error:", error);
      surahList.innerHTML =
        "<p>تعذر تحميل السور. تأكد من اتصال الإنترنت ثم حدّث الصفحة.</p>";
    }
  }

  async function loadSurahText(surahNumber, card, surahName) {
    stopAudio();

    let panel = card.querySelector(".quran-reading-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.className = "quran-reading-panel";
      card.appendChild(panel);
    }

    panel.textContent = "جاري تحميل آيات السورة...";

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah/" +
        surahNumber +
        "/quran-uthmani"
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل نص السورة");
      }

      const result = await response.json();

      if (
        result.code !== 200 ||
        !result.data ||
        !Array.isArray(result.data.ayahs)
      ) {
        throw new Error("نص السورة غير متاح");
      }

      panel.innerHTML = "";

      const heading = document.createElement("h4");
      heading.textContent = "سورة " + surahName;
      panel.appendChild(heading);

      if (surahNumber !== 1 && surahNumber !== 9) {
        const basmala = document.createElement("p");
        basmala.textContent =
          "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
        basmala.style.textAlign = "center";
        panel.appendChild(basmala);
      }

      result.data.ayahs.forEach(function (ayah) {
        const verse = document.createElement("span");
        verse.className = "quran-ayah";
        verse.textContent = ayah.text + " ";
        panel.appendChild(verse);

        const number = document.createElement("span");
        number.className = "quran-ayah-number";
        number.textContent = ayah.numberInSurah;

        panel.appendChild(number);
        panel.appendChild(document.createTextNode(" "));
      });

      panel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });

    } catch (error) {
      console.error("Quran text error:", error);
      panel.textContent =
        "تعذر تحميل الآيات. تأكد من اتصال الإنترنت وحاول مرة أخرى.";
    }
  }

  async function playSurah(surahNumber, card) {
    stopAudio();

    const requestId = playRequest;
    const edition = getEdition();

    let panel = card.querySelector(".quran-reading-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.className = "quran-reading-panel";
      card.appendChild(panel);
    }

    panel.innerHTML = "";

    const status = document.createElement("p");
    status.className = "quran-reader-status";
    status.textContent = "جاري تجهيز صوت القارئ...";
    panel.appendChild(status);

    playbackStatus = status;

    const tools = document.createElement("div");
    tools.className = "quran-reader-tools";

    const stopButton = document.createElement("button");
    stopButton.type = "button";
    stopButton.textContent = "■ إيقاف الاستماع";
    stopButton.addEventListener("click", stopAudio);

    tools.appendChild(stopButton);
    panel.appendChild(tools);

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah/" +
        surahNumber +
        "/" +
        edition
      );

      if (!response.ok) {
        throw new Error("الصوت غير متاح لهذا القارئ");
      }

      const result = await response.json();

      if (requestId !== playRequest) return;

      if (
        result.code !== 200 ||
        !result.data ||
        !Array.isArray(result.data.ayahs)
      ) {
        throw new Error("بيانات الصوت غير متاحة");
      }

      currentAyahs = result.data.ayahs;
      currentAyahIndex = 0;

      if (!currentAyahs.length || !currentAyahs[0].audio) {
        throw new Error(
          "لا يوجد تسجيل صوتي لهذه السورة بهذا القارئ"
        );
      }

      const readerName =
        readerSelect &&
        readerSelect.options[readerSelect.selectedIndex]
          ? readerSelect.options[readerSelect.selectedIndex].text
          : "القارئ";

      setStatus("بدأ الاستماع — " + readerName);

      playCurrentAyah(requestId);

    } catch (error) {
      if (requestId !== playRequest) return;

      console.error("Quran audio error:", error);

      setStatus(
        "تعذر تشغيل هذا القارئ حاليًا. جرّب قارئًا آخر أو أعد المحاولة."
      );
    }
  }

  function playCurrentAyah(requestId) {
    if (requestId !== playRequest) return;

    if (currentAyahIndex >= currentAyahs.length) {
      currentAyahs = [];
      setStatus("انتهى تشغيل السورة.");
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

    audio.play().then(function () {
      if (requestId === playRequest) {
        setStatus(
          "جاري الاستماع — الآية " +
          (ayah.numberInSurah || currentAyahIndex + 1)
        );
      }
    }).catch(function (error) {
      if (requestId !== playRequest) return;

      console.error("Audio playback error:", error);

      setStatus(
        "لم يبدأ الصوت. اضغط استماع مرة أخرى أو جرّب قارئًا آخر."
      );
    });
  }

  audio.addEventListener("ended", function () {
    if (!currentAyahs.length) return;

    currentAyahIndex++;
    playCurrentAyah(playRequest);
  });

  audio.addEventListener("error", function () {
    if (currentAyahs.length) {
      setStatus("حدث خطأ أثناء تحميل الصوت. جرّب قارئًا آخر.");
    }
  });

  loadSurahs();

})();
