
(function () {
  "use strict";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  // القراء وجودة الصوت الصحيحة
  const readers = {
    mishary: {
      edition: "ar.alafasy",
      bitrate: 128
    },
    husary: {
      edition: "ar.husary",
      bitrate: 128
    },
    abdulbasit: {
      edition: "ar.abdulbasit",
      bitrate: 192
    },
    sudais: {
      edition: "ar.sudais",
      bitrate: 192
    }
  };

  const audio = new Audio();
  audio.preload = "none";

  let currentSurah = 0;
  let surahs = [];
  let audioErrorShown = false;

  function showAudioError(message) {
    if (audioErrorShown) return;

    audioErrorShown = true;
    alert(message || "تعذر تشغيل السورة. تأكد من الإنترنت وحاول مرة أخرى.");
  }

  async function loadSurahs() {
    if (!surahList) return;

    surahList.innerHTML =
      "<p>جاري تحميل سور القرآن الكريم...</p>";

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah"
      );

      if (!response.ok) {
        throw new Error("Network error");
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error("API error");
      }

      surahs = result.data;
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
          surah.revelationType === "Meccan"
            ? "مكية"
            : "مدنية";

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
        "<p>تعذر تحميل السور. تأكد من اتصال الإنترنت وحاول مرة أخرى.</p>";
    }
  }

  async function playSurah(surahNumber) {
    const readerKey = readerSelect
      ? readerSelect.value
      : "mishary";

    const reader = readers[readerKey] || readers.mishary;

    const url =
      "https://cdn.islamic.network/quran/audio-surah/" +
      reader.bitrate + "/" +
      reader.edition + "/" +
      surahNumber + ".mp3";

    currentSurah = surahNumber;
    audioErrorShown = false;

    audio.pause();
    audio.src = url;
    audio.load();

    try {
      await audio.play();

      console.log(
        "Playing:",
        reader.edition,
        "Surah:",
        surahNumber
      );

    } catch (error) {
      console.error("Audio playback error:", error);

      showAudioError(
        "تعذر تشغيل السورة. تأكد من اتصال الإنترنت أو جرّب قارئاً آخر."
      );
    }
  }

  audio.addEventListener("ended", function () {
    if (currentSurah < 114) {
      playSurah(currentSurah + 1);
    }
  });

  audio.addEventListener("error", function () {
    console.error(
      "Audio file could not be loaded:",
      audio.src
    );

    showAudioError(
      "ملف صوت السورة غير متاح حالياً. حاول مرة أخرى."
    );
  });

  // تحميل السور
  loadSurahs();

})();
