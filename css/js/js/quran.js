
(function () {
  "use strict";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  const readers = {
    mishary: "ar.alafasy",
    husary: "ar.husary",
    abdulbasit: "ar.abdulbasitmurattal",
    sudais: "ar.abdurrahmaansudais"
  };

  const audio = new Audio();
  audio.preload = "none";

  let surahs = [];
  let currentAyahs = [];
  let currentAyahIndex = 0;
  let currentSurah = 0;
  let playRequest = 0;

  async function loadSurahs() {
    if (!surahList) return;

    surahList.innerHTML = "<p>جاري تحميل سور القرآن الكريم...</p>";

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah"
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل السور");
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error("خطأ في بيانات السور");
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
          surah.revelationType === "Meccan" ? "مكية" : "مدنية";

        info.appendChild(name);
        info.appendChild(document.createElement("br"));
        info.appendChild(details);

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "▶ استماع";

        playButton.addEventListener("click", function () {
          playSurah(surah.number);
        });

        card.appendChild(info);
        card.appendChild(playButton);
        surahList.appendChild(card);
      });

    } catch (error) {
      console.error("Quran loading error:", error);
      surahList.innerHTML =
        "<p>تعذر تحميل السور. تأكد من اتصال الإنترنت.</p>";
    }
  }

  async function playSurah(surahNumber) {
    const requestId = ++playRequest;

    currentSurah = surahNumber;
    currentAyahIndex = 0;
    currentAyahs = [];

    const reader = readerSelect
      ? readerSelect.value
      : "mishary";

    const edition = readers[reader] || readers.mishary;

    try {
      audio.pause();

      const response = await fetch(
        "https://api.alquran.cloud/v1/surah/" +
        surahNumber + "/" + edition
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل صوت القارئ");
      }

      const result = await response.json();

      if (
        requestId !== playRequest ||
        result.code !== 200 ||
        !result.data ||
        !result.data.ayahs
      ) {
        return;
      }

      currentAyahs = result.data.ayahs;

      if (
        currentAyahs.length === 0 ||
        !currentAyahs[0].audio
      ) {
        throw new Error("الصوت غير متاح لهذا القارئ");
      }

      playCurrentAyah(requestId);

    } catch (error) {
      if (requestId !== playRequest) return;

      console.error("Audio loading error:", error);
      alert("تعذر تشغيل السورة. جرّب قارئًا آخر أو حاول مرة أخرى.");
    }
  }

  function playCurrentAyah(requestId) {
    if (requestId !== playRequest) return;

    if (currentAyahIndex >= currentAyahs.length) {
      currentAyahs = [];
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

    audio.play().catch(function (error) {
      if (requestId !== playRequest) return;

      console.error("Audio playback error:", error);
      alert("تعذر تشغيل الصوت. تأكد من اتصال الإنترنت.");
    });
  }

  audio.addEventListener("ended", function () {
    if (currentAyahs.length === 0) return;

    currentAyahIndex++;

    if (currentAyahIndex < currentAyahs.length) {
      playCurrentAyah(playRequest);
    } else {
      currentAyahs = [];
    }
  });

  audio.addEventListener("error", function () {
    console.error("تعذر تحميل الآية الصوتية");
  });

  loadSurahs();

})();
