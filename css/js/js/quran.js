
(function () {
  "use strict";

  // تطبيق يقين - قسم القرآن الكريم

  const API = "https://alquran.api.alislam.ru/v1";
  const TEXT_API = "https://api.alquran.cloud/v1";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  if (!surahList || !readerSelect) {
    console.error("لم يتم العثور على عناصر قسم القرآن في الصفحة");
    return;
  }

  // القراء
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

  // حالة التحميل
  const status = document.createElement("p");
  status.id = "quran-status";
  status.style.cssText =
    "text-align:center;padding:10px;color:inherit;";

  surahList.before(status);

  // مساحة عرض القرآن
  const reader = document.createElement("div");
  reader.id = "quran-text";
  reader.style.cssText =
    "direction:rtl;text-align:justify;line-height:2.5;font-size:22px;padding:15px;";

  surahList.after(reader);

  function setStatus(message) {
    status.textContent = message;
  }

  // تحديد القارئ
  function getEdition() {
    const selected = readerSelect.value;
    return readers[selected] || selected || readers.mishary;
  }

  // إيقاف الصوت
  function stopAudio() {
    audio.pause();
    audio.currentTime = 0;
    currentAyahs = [];
    currentAyahIndex = 0;
  }

  // تحميل قائمة السور
  async function loadSurahs() {
    setStatus("جاري تحميل سور القرآن الكريم...");
    surahList.innerHTML = "";

    try {
      const response = await fetch(API + "/surah");

      if (!response.ok) {
        throw new Error("فشل الاتصال بالخادم");
      }

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
          surah.name ||
          surah.englishName ||
          ("سورة رقم " + surah.number);

        // زر القراءة
        const readButton = document.createElement("button");

        readButton.textContent = "📖 قراءة السورة";
        readButton.style.cssText = "margin:5px;padding:9px;";

        readButton.addEventListener("click", function () {
          loadSurahText(surah.number, name.textContent);
        });

        // زر الاستماع
        const playButton = document.createElement("button");

        playButton.textContent = "🎧 استماع للسورة";
        playButton.style.cssText = "margin:5px;padding:9px;";

        playButton.addEventListener("click", function () {
          playSurah(surah.number, name.textContent);
        });

        card.appendChild(name);
        card.appendChild(readButton);
        card.appendChild(playButton);

        surahList.appendChild(card);
      });

      setStatus("تم تحميل سور القرآن الكريم بنجاح");

    } catch (error) {
      console.error("Surah Loading Error:", error);
      setStatus("تعذر تحميل السور. تأكد من الاتصال بالإنترنت.");
    }
  }

  // قراءة نص السورة
  async function loadSurahText(number, name) {
    stopAudio();

    currentSurahName = name;
    reader.innerHTML = "";

    setStatus("جاري تحميل " + name + "...");

    try {
      const response = await fetch(
        TEXT_API + "/surah/" + number + "/quran-uthmani"
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل السورة");
      }

      const result = await response.json();

      const data = result.data || result;
      const ayahs = data.ayahs || [];

      if (!ayahs.length) {
        throw new Error("لا توجد آيات");
      }

      // عنوان السورة
      const heading = document.createElement("h2");

      heading.textContent = name;

      heading.style.cssText =
        "text-align:center;margin:15px 0;color:var(--gold);";

      reader.appendChild(heading);

      // البسملة
      if (Number(number) !== 1 && Number(number) !== 9) {
        const basmala = document.createElement("p");

        basmala.textContent =
          "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

        basmala.style.cssText =
          "text-align:center;font-size:23px;margin:20px 0;";

        reader.appendChild(basmala);
      }

      // عرض الآيات
      const textContainer = document.createElement("div");

      textContainer.style.cssText =
        "direction:rtl;text-align:justify;line-height:2.6;font-size:23px;";

      ayahs.forEach(function (ayah) {
        const span = document.createElement("span");

        span.textContent =
          ayah.text + " ﴿" + ayah.numberInSurah + "﴾ ";

        textContainer.appendChild(span);
      });

      reader.appendChild(textContainer);

      setStatus("تم تحميل " + name + " بنجاح");

      reader.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      console.error("Quran Reading Error:", error);

      setStatus("تعذر تحميل آيات السورة. حاول مرة أخرى.");
    }
  }

  // تشغيل صوت السورة
  async function playSurah(number, name) {
    stopAudio();

    currentSurahName = name;

    reader.innerHTML = "";

    setStatus("جاري تجهيز صوت " + name + "...");

    try {
      const edition = getEdition();

      const response = await fetch(
        API + "/surah/" + number + "/" + edition
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل الصوت");
      }

      const result = await response.json();

      const data = result.data || result;

      currentAyahs = data.ayahs || [];

      if (!currentAyahs.length) {
        throw new Error("لم يتم العثور على ملفات الصوت");
      }

      currentAyahIndex = 0;

      playCurrentAyah();

    } catch (error) {
      console.error("Quran Audio Error:", error);

      setStatus("تعذر تشغيل السورة. جرّب قارئًا آخر.");
    }
  }

  // تشغيل الآيات بالتتابع
  function playCurrentAyah() {
    if (currentAyahIndex >= currentAyahs.length) {
      setStatus("انتهى الاستماع لسورة " + currentSurahName);
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
      " - الآية " +
      (ayah.numberInSurah || currentAyahIndex + 1)
    );

    audio.play().catch(function (error) {
      console.error(error);

      setStatus("اضغط على زر الاستماع مرة أخرى لتشغيل الصوت");
    });
  }

  // الانتقال للآية التالية
  audio.addEventListener("ended", function () {
    currentAyahIndex++;
    playCurrentAyah();
  });

  // أخطاء الصوت
  audio.addEventListener("error", function () {
    setStatus("حدث خطأ في تشغيل الصوت");
  });

  // تغيير القارئ
  readerSelect.addEventListener("change", function () {
    if (currentAyahs.length) {
      stopAudio();

      setStatus(
        "تم تغيير القارئ. اختر السورة للاستماع بالقارئ الجديد."
      );
    }
  });

  // بدء تحميل السور
  loadSurahs();

})();
