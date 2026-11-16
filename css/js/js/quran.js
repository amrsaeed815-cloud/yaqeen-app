
(function () {
  "use strict";

  // تطبيق يقين - قسم القرآن الكريم

  const API = "https://alquran.api.alislam.ru/v1";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  if (!surahList || !readerSelect) {
    console.error("لم يتم العثور على عناصر قسم القرآن في الصفحة");
    return;
  }

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

  let audio = new Audio();
  let currentAyahs = [];
  let currentAyahIndex = 0;
  let currentSurahName = "";

  const status = document.createElement("p");
  status.id = "quran-status";
  status.style.cssText =
    "text-align:center;padding:10px;color:inherit;";
  surahList.before(status);

  const reader = document.createElement("div");
  reader.id = "quran-text";
  reader.style.cssText =
    "text-align:center;line-height:2.3;font-size:20px;padding:15px;";
  surahList.after(reader);

  function setStatus(message) {
    status.textContent = message;
  }

  function getEdition() {
    const selected = readerSelect.value;
    return readers[selected] || selected || readers.mishary;
  }

  function stopAudio() {
    audio.pause();
    audio.currentTime = 0;
    currentAyahs = [];
    currentAyahIndex = 0;
  }

  async function loadSurahs() {
    setStatus("جاري تحميل سور القرآن الكريم...");
    surahList.innerHTML = "";

    try {
      const response = await fetch(API + "/surah");
      if (!response.ok) throw new Error("فشل الاتصال بالخادم");

      const result = await response.json();
      const surahs = result.data || result;

      if (!Array.isArray(surahs)) {
        throw new Error("بيانات السور غير صحيحة");
      }

      surahList.innerHTML = "";

      surahs.forEach(function (surah) {
        const card = document.createElement("div");
        card.style.cssText =
          "padding:12px;margin:8px 0;border:1px solid #999;border-radius:12px;";

        const name = document.createElement("h3");
        name.textContent =
          surah.name || surah.englishName || ("سورة رقم " + surah.number);

        const readButton = document.createElement("button");
        readButton.textContent = "قراءة السورة";
        readButton.style.cssText = "margin:5px;padding:9px;";
        readButton.addEventListener("click", function () {
          loadSurahText(surah.number, name.textContent);
        });

        const playButton = document.createElement("button");
        playButton.textContent = "استماع للسورة";
        playButton.style.cssText = "margin:5px;padding:9px;";
        playButton.addEventListener("click", function () {
          playSurah(surah.number, name.textContent);
        });

        card.appendChild(name);
        card.appendChild(readButton);
        card.appendChild(playButton);
        surahList.appendChild(card);
      });

      setStatus("تم تحميل سور القرآن الكريم");
    } catch (error) {
      console.error(error);
      setStatus("تعذر تحميل السور. تأكد من الاتصال بالإنترنت.");
    }
  }

  async function loadSurahText(number, name) {
    stopAudio();
    currentSurahName = name;
    reader.innerHTML = "";
    setStatus("جاري تحميل " + name);

    try {
      const response = await fetch(
        API + "/surah/" + number + "/quran-uthmani"
      );

      if (!response.ok) throw new Error("تعذر تحميل السورة");

      const result = await response.json();
      const data = result.data || result;
      const ayahs = data.ayahs || [];

      if (!ayahs.length) throw new Error("لا توجد آيات");

      const heading = document.createElement("h2");
      heading.textContent = name;
      reader.appendChild(heading);

      if (Number(number) !== 1 && Number(number) !== 9) {
        const basmala = document.createElement("p");
        basmala.textContent = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
        reader.appendChild(basmala);
      }

      ayahs.forEach(function (ayah) {
        const span = document.createElement("span");
        span.textContent =
          (ayah.text || "") + " ﴿" + (ayah.numberInSurah || "") + "﴾ ";
        reader.appendChild(span);
      });

      setStatus("تم تحميل " + name);
    } catch (error) {
      console.error(error);
      setStatus("حدث خطأ أثناء تحميل آيات السورة");
    }
  }

  async function playSurah(number, name) {
    stopAudio();
    currentSurahName = name;
    setStatus("جاري تجهيز صوت " + name);

    try {
      const edition = getEdition();
      const response = await fetch(
        API + "/surah/" + number + "/" + edition
      );

      if (!response.ok) throw new Error("تعذر تحميل الصوت");

      const result = await response.json();
      const data = result.data || result;

      currentAyahs = data.ayahs || [];

      if (!currentAyahs.length) {
        throw new Error("لم يتم العثور على ملفات الصوت");
      }

      currentAyahIndex = 0;
      playCurrentAyah();
    } catch (error) {
      console.error(error);
      setStatus("تعذر تشغيل السورة. جرّب قارئًا آخر.");
    }
  }

  function playCurrentAyah() {
    if (currentAyahIndex >= currentAyahs.length) {
      setStatus("انتهت سورة " + currentSurahName);
      return;
    }

    const ayah = currentAyahs[currentAyahIndex];

    if (!ayah.audio) {
      setStatus("ملف صوت الآية غير متوفر");
      return;
    }

    audio.src = ayah.audio;
    setStatus(
      "سورة " + currentSurahName +
      " - الآية " + (ayah.numberInSurah || currentAyahIndex + 1)
    );

    audio.play().catch(function (error) {
      console.error(error);
      setStatus("اضغط على زر الاستماع مرة أخرى لتشغيل الصوت");
    });
  }

  audio.addEventListener("ended", function () {
    currentAyahIndex++;
    playCurrentAyah();
  });

  audio.addEventListener("error", function () {
    setStatus("حدث خطأ في تشغيل الصوت");
  });

  readerSelect.addEventListener("change", function () {
    if (currentAyahs.length) {
      setStatus("تم تغيير القارئ. اختر السورة للاستماع بالقارئ الجديد.");
      stopAudio();
    }
  });

  loadSurahs();

})();
