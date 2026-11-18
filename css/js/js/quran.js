
(function () {
  "use strict";

  // تطبيق يقين - قسم القرآن الكريم
  // مصدر الصوت: MP3Quran API
  // مصدر النص: AlQuran Cloud

  const API = "https://www.mp3quran.net/api/v3";
  const TEXT_API = "https://api.alquran.cloud/v1";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  if (!surahList || !readerSelect) {
    console.error("لم يتم العثور على عناصر قسم القرآن");
    return;
  }

  // القراء المعتمدون في تطبيق يقين
  const readers = {
    mishary: {
      aliases: [
        "مشاري راشد العفاسي",
        "مشاري العفاسي",
        "Mishary Rashid Alafasy",
        "ar.alafasy"
      ]
    },

    husary: {
      aliases: [
        "محمود خليل الحصري",
        "الحصري",
        "Mahmoud Khalil Al-Hussary",
        "ar.husary"
      ]
    },

    abdulbasit: {
      aliases: [
        "عبدالباسط عبدالصمد",
        "عبد الباسط عبد الصمد",
        "Abdul Basit Abdul Samad",
        "ar.abdulbasit"
      ]
    },

    sudais: {
      aliases: [
        "عبدالرحمن السديس",
        "عبد الرحمن السديس",
        "Abdurrahman As-Sudais",
        "ar.sudais"
      ]
    },

    minshawi: {
      aliases: [
        "محمد صديق المنشاوي",
        "محمد صديق المنشاوى",
        "Mohamed Siddiq El-Minshawi",
        "ar.minshawi"
      ]
    },

    shuraim: {
      aliases: [
        "سعود الشريم",
        "Saud Al-Shuraim",
        "ar.shuraim"
      ]
    },

    ajamy: {
      aliases: [
        "أحمد بن علي العجمي",
        "احمد العجمي",
        "Ahmed Al-Ajmi",
        "ar.ajamy"
      ]
    },

    jibreel: {
      aliases: [
        "محمد جبريل",
        "Mohamed Jebreel",
        "ar.muhammadjibreel"
      ]
    },

    ayoub: {
      aliases: [
        "محمد أيوب",
        "محمد ايوب",
        "Mohammad Ayyub",
        "ar.muhammadayoub"
      ]
    },

    hudhaify: {
      aliases: [
        "علي الحذيفي",
        "علي بن عبدالرحمن الحذيفي",
        "Ali Al-Hudhaify",
        "ar.hudhaify"
      ]
    },

    abdulrahman_mossad: {
      aliases: [
        "عبدالرحمن مسعد",
        "عبد الرحمن مسعد",
        "Abdulrahman Mossad",
        "Abdul Rahman Mossad"
      ]
    }
  };

  // عناصر الصفحة
  const status = document.createElement("p");
  status.id = "quran-status";

  status.style.cssText =
    "text-align:center;padding:10px;color:inherit;";

  surahList.before(status);

  const audio = document.createElement("audio");

  audio.id = "quran-audio";
  audio.controls = true;
  audio.preload = "none";

  audio.style.cssText =
    "display:block;width:100%;margin:15px auto;";

  surahList.after(audio);

  const reader = document.createElement("div");

  reader.id = "quran-text";

  reader.style.cssText =
    "direction:rtl;text-align:justify;line-height:2.5;font-size:22px;padding:15px;";

  audio.after(reader);

  // بيانات التطبيق
  let surahs = [];
  let reciters = [];
  let currentSurahName = "";
  let currentAudioSession = 0;
  let currentMoshaf = null;

  function setStatus(message) {
    status.textContent = message;
  }

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/\u0640/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^a-z0-9\u0600-\u06FF]/g, "");
  }

  function stopAudio() {
    currentAudioSession++;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    currentMoshaf = null;
  }

  // تحميل قائمة القراء من المصدر الرسمي
  async function loadReciters() {
    try {
      const response = await fetch(
        API + "/reciters?language=ar"
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل قائمة القراء");
      }

      const result = await response.json();

      reciters = result.reciters || [];

      if (!reciters.length) {
        throw new Error("قائمة القراء فارغة");
      }

      console.log(
        "تم تحميل القراء:",
        reciters.length
      );

      return true;

    } catch (error) {
      console.error("Reciters Error:", error);
      return false;
    }
  }

  // الحصول على اسم القارئ المطلوب
  function getSelectedReader() {
    const selected = readerSelect.value;

    if (readers[selected]) {
      return readers[selected];
    }

    for (const key in readers) {
      if (readers[key].aliases.includes(selected)) {
        return readers[key];
      }
    }

    const option = readerSelect.options[
      readerSelect.selectedIndex
    ];

    if (option) {
      return {
        aliases: [option.textContent]
      };
    }

    return null;
  }

  // البحث عن القارئ الصحيح
  function findReader() {
    const config = getSelectedReader();

    if (!config) return null;

    const aliases = config.aliases.map(normalizeName);

    return reciters.find(function (reciter) {
      const name = normalizeName(reciter.name);

      return aliases.some(function (alias) {
        return (
          alias === name ||
          (alias.length >= 6 && name.includes(alias)) ||
          (name.length >= 6 && alias.includes(name))
        );
      });
    }) || null;
  }

  // التأكد من وجود السور الـ114
  function hasAllSurahs(moshaf) {
    if (!moshaf || !moshaf.server) {
      return false;
    }

    const available = String(
      moshaf.surah_list || ""
    )
      .split(",")
      .map(Number)
      .filter(Number.isInteger);

    const unique = new Set(available);

    return (
      Number(moshaf.surah_total) === 114 &&
      Array.from(
        { length: 114 },
        (_, index) => index + 1
      ).every(number => unique.has(number))
    );
  }

  // اختيار النسخة الكاملة للقارئ
  function findCompleteMoshaf(reciter) {
    if (!reciter || !Array.isArray(reciter.moshaf)) {
      return null;
    }

    return reciter.moshaf.find(hasAllSurahs) || null;
  }

  // إنشاء رابط السورة
  function getSurahAudioUrl(moshaf, number) {
    const server = moshaf.server.endsWith("/")
      ? moshaf.server
      : moshaf.server + "/";

    const paddedNumber = String(number).padStart(3, "0");

    return server + paddedNumber + ".mp3";
  }

  // تحميل السور
  async function loadSurahs() {
    setStatus("جاري تحميل سور القرآن الكريم...");

    surahList.innerHTML = "";

    try {
      const response = await fetch(
        TEXT_API + "/surah"
      );

      if (!response.ok) {
        throw new Error("فشل تحميل قائمة السور");
      }

      const result = await response.json();

      surahs = result.data || result;

      if (!Array.isArray(surahs) || surahs.length !== 114) {
        throw new Error("قائمة السور غير مكتملة");
      }

      surahs.forEach(function (surah) {
        const card = document.createElement("div");

        card.style.cssText =
          "padding:12px;margin:8px 0;border:1px solid #999;border-radius:12px;";

        const name = document.createElement("h3");

        name.textContent =
          surah.name || ("سورة رقم " + surah.number);

        const readButton = document.createElement("button");

        readButton.textContent = "📖 قراءة السورة";
        readButton.style.cssText = "margin:5px;padding:9px;";

        readButton.addEventListener("click", function () {
          loadSurahText(surah.number, name.textContent);
        });

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

      setStatus("تم تحميل 114 سورة بنجاح");

    } catch (error) {
      console.error("Surah Loading Error:", error);

      setStatus(
        "تعذر تحميل السور. حاول تحديث الصفحة."
      );
    }
  }

  // قراءة السورة
  async function loadSurahText(number, name) {
    stopAudio();

    reader.innerHTML = "";

    currentSurahName = name;

    setStatus("جاري تحميل " + name + "...");

    try {
      const response = await fetch(
        TEXT_API +
        "/surah/" +
        number +
        "/quran-uthmani"
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل نص السورة");
      }

      const result = await response.json();

      const ayahs = result.data?.ayahs || [];

      if (!ayahs.length) {
        throw new Error("لا توجد آيات");
      }

      const heading = document.createElement("h2");

      heading.textContent = name;

      heading.style.cssText =
        "text-align:center;margin:15px 0;color:var(--gold);";

      reader.appendChild(heading);

      if (Number(number) !== 1 && Number(number) !== 9) {
        const basmala = document.createElement("p");

        basmala.textContent =
          "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

        basmala.style.cssText =
          "text-align:center;font-size:23px;margin:20px 0;";

        reader.appendChild(basmala);
      }

      const textContainer = document.createElement("div");

      textContainer.style.cssText =
        "direction:rtl;text-align:justify;line-height:2.6;font-size:23px;";

      ayahs.forEach(function (ayah) {
        const span = document.createElement("span");

        span.textContent =
          ayah.text +
          " ﴿" +
          ayah.numberInSurah +
          "﴾ ";

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

      setStatus("تعذر تحميل آيات السورة.");
    }
  }

  // تشغيل السورة كاملة
  async function playSurah(number, name) {
    stopAudio();

    const session = currentAudioSession;

    currentSurahName = name;
    reader.innerHTML = "";

    setStatus("جاري تجهيز صوت " + name + "...");

    try {
      if (!reciters.length) {
        const loaded = await loadReciters();

        if (!loaded) {
          throw new Error("تعذر تحميل بيانات القراء");
        }
      }

      if (session !== currentAudioSession) return;

      const reciter = findReader();

      if (!reciter) {
        throw new Error(
          "القارئ غير موجود في مكتبة الصوتيات"
        );
      }

      const moshaf = findCompleteMoshaf(reciter);

      if (!moshaf) {
        throw new Error(
          "لا توجد نسخة كاملة من هذا القارئ تحتوي على السور الـ114"
        );
      }

      currentMoshaf = moshaf;

      const audioUrl = getSurahAudioUrl(
        moshaf,
        number
      );

      audio.src = audioUrl;
      audio.load();

      setStatus(
        "جاري تشغيل سورة " +
        name +
        " بصوت " +
        reciter.name
      );

      reader.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      const playPromise = audio.play();

      if (playPromise) {
        await playPromise;
      }

      if (session !== currentAudioSession) {
        audio.pause();
        return;
      }

    } catch (error) {
      if (session !== currentAudioSession) return;

      console.error("Quran Audio Error:", error);

      setStatus(
        error.message ||
        "تعذر تشغيل السورة. حاول مرة أخرى."
      );
    }
  }

  // أحداث مشغل الصوت
  audio.addEventListener("ended", function () {
    setStatus(
      "انتهى الاستماع لسورة " + currentSurahName
    );
  });

  audio.addEventListener("error", function () {
    if (!audio.src) return;

    console.error("Audio Error:", audio.error);

    setStatus(
      "تعذر تحميل ملف الصوت. جرّب مرة أخرى."
    );
  });

  audio.addEventListener("play", function () {
    if (currentSurahName) {
      setStatus(
        "يتم الآن الاستماع لسورة " + currentSurahName
      );
    }
  });

  // تغيير القارئ
  readerSelect.addEventListener("change", function () {
    stopAudio();

    setStatus(
      "تم تغيير القارئ. اختر السورة للاستماع."
    );
  });

  // بدء التطبيق
  Promise.all([
    loadReciters(),
    loadSurahs()
  ]);

})();
