
(function () {
  "use strict";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");
  const player = document.getElementById("quran-player");
  const surahName = document.getElementById("surah-name");
  const versesContainer = document.getElementById("quran-verses");

  let currentSurah = 1;

  const readers = {
    mishary: "ar.alafasy",
    alafasy: "ar.alafasy",
    abdulbasit: "ar.abdulbasitmurattal",
    "ar.alafasy": "ar.alafasy",
    "ar.abdulbasitmurattal": "ar.abdulbasitmurattal"
  };

  function getReader() {
    if (!readerSelect) return "ar.alafasy";

    const value = (readerSelect.value || "").toLowerCase();
    const text = (
      readerSelect.options[readerSelect.selectedIndex]?.text || ""
    ).toLowerCase();

    if (readers[value]) return readers[value];

    if (text.includes("مشاري") || text.includes("العفاسي")) {
      return "ar.alafasy";
    }

    if (text.includes("عبد الباسط")) {
      return "ar.abdulbasitmurattal";
    }

    return "ar.alafasy";
  }

  async function loadSurahList() {
    if (!surahList) return;

    surahList.innerHTML = "<option>جاري تحميل سور القرآن...</option>";

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah"
      );

      if (!response.ok) throw new Error("تعذر تحميل السور");

      const result = await response.json();

      surahList.innerHTML = "";

      result.data.forEach(function (surah) {
        const option = document.createElement("option");
        option.value = surah.number;
        option.textContent =
          surah.number + " - سورة " + surah.name;
        surahList.appendChild(option);
      });

      surahList.value = "1";
      loadSurah(1);

    } catch (error) {
      surahList.innerHTML =
        '<option value="">تعذر تحميل القرآن، حاول مرة أخرى</option>';
      console.error(error);
    }
  }

  async function loadSurah(number) {
    currentSurah = Number(number);

    if (!versesContainer) return;

    versesContainer.innerHTML = "جاري تحميل الآيات...";

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah/" +
        currentSurah + "/quran-uthmani"
      );

      if (!response.ok) throw new Error("تعذر تحميل السورة");

      const result = await response.json();
      const surah = result.data;

      if (surahName) {
        surahName.textContent = "سورة " + surah.name;
      }

      versesContainer.innerHTML = "";

      surah.ayahs.forEach(function (ayah) {
        const span = document.createElement("span");
        span.className = "quran-ayah";
        span.textContent =
          ayah.text + " ۞ ";

        versesContainer.appendChild(span);
      });

      loadAudio();

    } catch (error) {
      versesContainer.textContent =
        "حدث خطأ أثناء تحميل السورة. تأكد من الاتصال بالإنترنت.";
      console.error(error);
    }
  }

  async function loadAudio() {
    if (!player) return;

    const edition = getReader();

    try {
      const response = await fetch(
        "https://api.alquran.cloud/v1/surah/" +
        currentSurah + "/" + edition
      );

      if (!response.ok) throw new Error("تعذر تحميل التلاوة");

      const result = await response.json();

      if (result.data && result.data.audio) {
        player.src = result.data.audio;
        player.load();
      }

    } catch (error) {
      console.error("خطأ في تحميل التلاوة:", error);
    }
  }

  if (surahList) {
    surahList.addEventListener("change", function () {
      if (this.value) loadSurah(this.value);
    });
  }

  if (readerSelect) {
    readerSelect.addEventListener("change", loadAudio);
  }

  document.addEventListener("DOMContentLoaded", loadSurahList);

  window.loadQuranSurah = loadSurah;
})();
