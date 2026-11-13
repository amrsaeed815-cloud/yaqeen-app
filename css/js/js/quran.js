
(function () {
  "use strict";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

const readers = {
  mishary: "ar.alafasy",
  husary: "ar.husary",
  abdulbasit: "ar.abdulbasit",
  sudais: "ar.sudais"
};

  let audio = new Audio();
  let currentSurah = 0;
  let surahs = [];

  audio.preload = "none";

  async function loadSurahs() {
    if (!surahList) return;

    surahList.innerHTML = "<p>جاري تحميل سور القرآن الكريم...</p>";

    try {
      const response = await fetch("https://api.alquran.cloud/v1/surah");

      if (!response.ok) throw new Error("Network error");

      const result = await response.json();

      if (result.code !== 200) throw new Error("API error");

      surahs = result.data;

      surahList.innerHTML = "";

      surahs.forEach(function (surah) {
        const card = document.createElement("div");
        card.className = "surah-item";

        const info = document.createElement("div");
        info.innerHTML =
          "<strong>" + surah.number + ". " +
          surah.name + "</strong><br>";

        const details = document.createElement("small");
        details.textContent =
          surah.revelationType === "Meccan"
            ? "مكية"
            : "مدنية";

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
        "<p>تعذر تحميل السور. تأكد من اتصال الإنترنت وحاول مرة أخرى.</p>";
    }
  }

  function playSurah(surahNumber) {
    const reader = readerSelect
      ? readerSelect.value
      : "mishary";

    const edition = readers[reader] || readers.mishary;

    const url =
      "https://cdn.islamic.network/quran/audio-surah/128/" +
      edition + "/" + surahNumber + ".mp3";

    currentSurah = surahNumber;

    audio.src = url;
    audio.load();

    audio.play().catch(function (error) {
      console.error("Audio error:", error);
      alert("تعذر تشغيل السورة. حاول مرة أخرى.");
    });
  }

  audio.addEventListener("ended", function () {
    if (currentSurah < 114) {
      playSurah(currentSurah + 1);
    }
  });

  audio.addEventListener("error", function () {
    console.error("تعذر تحميل الملف الصوتي");
  });

  document.addEventListener("DOMContentLoaded", loadSurahs);

})();
