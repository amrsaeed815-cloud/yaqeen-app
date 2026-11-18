
(function () {
  "use strict";

  // ==========================================
  // تطبيق يقين - قسم القرآن الكريم
  // ==========================================

  const API = "https://www.mp3quran.net/api/v3";
  const TEXT_API = "https://api.alquran.cloud/v1";

  const surahList = document.getElementById("surah-list");
  const readerSelect = document.getElementById("quran-reader");

  if (!surahList || !readerSelect) {
    console.error("لم يتم العثور على عناصر قسم القرآن");
    return;
  }

  // ==========================================
  // بيانات القراء الـ11
  // ==========================================

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

  // ==========================================
  // تلاوات عبدالرحمن مسعد
  // المصدر: TVQuran
  // ==========================================

  const mossadSurahs = {
    32: {
      name: "السجدة",
      url: "https://download.tvquran.com/download/recitations/372/303/032.mp3"
    },

    73: {
      name: "المزمل",
      url: "https://download.tvquran.com/download/recitations/372/303/073.mp3"
    },

    78: {
      name: "النبأ",
      url: "https://download.tvquran.com/download/recitations/372/303/078.mp3"
    },

    87: {
      name: "الأعلى",
      url: "https://download.tvquran.com/download/recitations/372/303/087.mp3"
    },

    88: {
      name: "الغاشية",
      url: "https://download.tvquran.com/download/recitations/372/303/088.mp3"
    },

    100: {
      name: "العاديات",
      url: "https://download.tvquran.com/download/recitations/372/303/100.mp3"
    },

    107: {
      name: "الماعون",
      url: "https://download.tvquran.com/download/recitations/372/303/107.mp3"
    }
  };

  // ==========================================
  // إنشاء عناصر الصفحة
  // ==========================================

  let status = document.getElementById("quran-status");

  if (!status) {
    status = document.createElement("p");
    status.id = "quran-status";
    surahList.before(status);
  }

  status.style.cssText =
    "text-align:center;padding:10px;color:inherit;";

  let audio = document.getElementById("quran-audio");

  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "quran-audio";
    audio.controls = true;
    audio.preload = "none";
    surahList.after(audio);
  }

  audio.style.cssText =
    "display:block;width:100%;margin:15px auto;";

  let reader = document.getElementById("quran-text");

  if (!reader) {
    reader = document.createElement("div");
    reader.id = "quran-text";
    audio.after(reader);
  }

  reader.style.cssText =
    "direction:rtl;text-align:justify;line-height:2.5;font-size:22px;padding:15px;";

  // ==========================================
  // متغيرات التطبيق
  // ==========================================

  let surahs = [];
  let reciters = [];

  let currentSurahName = "";
  let currentAudioSession = 0;

  let recitersPromise = null;

  // ==========================================
  // أدوات مساعدة
  // ==========================================

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

  function isMossadSelected() {
    const option =
      readerSelect.options[readerSelect.selectedIndex];

    return (
      readerSelect.value === "abdulrahman_mossad" ||
      normalizeName(option?.textContent).includes(
        normalizeName("عبدالرحمن مسعد")
      )
    );
  }

  function stopAudio() {
    currentAudioSession++;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  // ==========================================
  // تحميل بيانات القراء
  // ==========================================

  async function loadReciters() {
    if (reciters.length) return true;

    if (recitersPromise) {
      return recitersPromise;
    }

    recitersPromise = (async function () {
      try {
        const response = await fetch(
          API + "/reciters?language=ar"
        );

        if (!response.ok) {
          throw new Error("تعذر تحميل قائمة القراء");
        }

        const result = await response.json();

        reciters = Array.isArray(result.reciters)
          ? result.reciters
          : [];

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
        recitersPromise = null;
        return false;
      }
    })();

    return recitersPromise;
  }

  // ==========================================
  // تحديد القارئ المختار
  // ==========================================

  function getSelectedReader() {
    const selected = readerSelect.value;

    if (readers[selected]) {
      return readers[selected];
    }

    const option =
      readerSelect.options[readerSelect.selectedIndex];

    const optionText = option
      ? option.textContent
      : "";

    const selectedNames = [
      normalizeName(selected),
      normalizeName(optionText)
    ].filter(Boolean);

    for (const key in readers) {
      const aliases = readers[key].aliases.map(
        normalizeName
      );

      const matched = aliases.some(function (alias) {
        return selectedNames.some(function (name) {
          return (
            alias === name ||
            (alias.length >= 6 && name.includes(alias)) ||
            (name.length >= 6 && alias.includes(name))
          );
        });
      });

      if (matched) {
        return readers[key];
      }
    }

    if (optionText) {
      return {
        aliases: [optionText]
      };
    }

    return null;
  }

  // ==========================================
  // البحث عن القارئ
  // ==========================================

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

  // ==========================================
  // معرفة السور المتاحة في المصحف
  // ==========================================

  function getAvailableSurahs(moshaf) {
    if (!moshaf || !moshaf.server) {
      return [];
    }

    return String(moshaf.surah_list || "")
      .split(",")
      .map(Number)
      .filter(function (number) {
        return (
          Number.isInteger(number) &&
          number >= 1 &&
          number <= 114
        );
      });
  }

  // ==========================================
  // اختيار المصحف الذي يحتوي على السورة
  // ==========================================

  function findMoshafForSurah(reciter, surahNumber) {
    if (!reciter || !Array.isArray(reciter.moshaf)) {
      return null;
    }

    return reciter.moshaf.find(function (moshaf) {
      return getAvailableSurahs(moshaf).includes(
        Number(surahNumber)
      );
    }) || null;
  }

  // ==========================================
  // إنشاء رابط صوت السورة
  // ==========================================

  function getSurahAudioUrl(moshaf, number) {
    const server = String(moshaf.server).endsWith("/")
      ? moshaf.server
      : moshaf.server + "/";

    const paddedNumber = String(number).padStart(3, "0");

    return server + paddedNumber + ".mp3";
  }

  // ==========================================
  // عرض السور حسب القارئ
  // ==========================================

  function renderSurahs() {
    surahList.innerHTML = "";

    const mossad = isMossadSelected();

    const availableSurahs = mossad
      ? surahs.filter(function (surah) {
          return Boolean(mossadSurahs[surah.number]);
        })
      : surahs;

    if (!availableSurahs.length) {
      setStatus("لا توجد سور متاحة للعرض حالياً");
      return;
    }

    if (mossad) {
      const info = document.createElement("p");

      info.textContent =
        "تلاوات عبدالرحمن مسعد المتاحة - 7 سور";

      info.style.cssText =
        "text-align:center;color:var(--gold);padding:10px;";

      surahList.appendChild(info);
    }

    availableSurahs.forEach(function (surah) {
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
        loadSurahText(
          surah.number,
          name.textContent
        );
      });

      const playButton = document.createElement("button");

      playButton.textContent = "🎧 استماع للسورة";
      playButton.style.cssText = "margin:5px;padding:9px;";

      playButton.addEventListener("click", function () {
        playSurah(
          surah.number,
          name.textContent
        );
      });

      card.appendChild(name);
      card.appendChild(readButton);
      card.appendChild(playButton);

      surahList.appendChild(card);
    });

    setStatus(
      mossad
        ? "اختر سورة للاستماع بصوت عبدالرحمن مسعد"
        : "تم تحميل 114 سورة بنجاح"
    );
  }

  // ==========================================
  // تحميل السور الـ114
  // ==========================================

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

      renderSurahs();

    } catch (error) {
      console.error("Surah Loading Error:", error);

      setStatus(
        "تعذر تحميل السور. حاول تحديث الصفحة."
      );
    }
  }

  // ==========================================
  // قراءة السورة نصياً
  // ==========================================

  async function loadSurahText(number, name) {
    stopAudio();

    reader.innerHTML = "";

    currentSurahName = name;

    setStatus("جاري تحميل " + name + "...");

    const session = currentAudioSession;

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

      if (session !== currentAudioSession) return;

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
      if (session !== currentAudioSession) return;

      console.error("Quran Reading Error:", error);

      setStatus("تعذر تحميل آيات السورة.");
    }
  }

  // ==========================================
  // تشغيل سورة عبدالرحمن مسعد
  // ==========================================

  async function playMossadSurah(number, name, session) {
    const recitation = mossadSurahs[number];

    if (!recitation) {
      throw new Error(
        "هذه السورة غير متاحة للقارئ عبدالرحمن مسعد"
      );
    }

    audio.src = recitation.url;
    audio.load();

    setStatus(
      "جاري تشغيل سورة " +
      name +
      " بصوت عبدالرحمن مسعد"
    );

    await audio.play();

    if (session !== currentAudioSession) {
      audio.pause();
      return;
    }

    console.log(
      "تم طلب تشغيل تلاوة عبدالرحمن مسعد:",
      recitation.name
    );
  }

  // ==========================================
  // تشغيل السورة لباقي القراء
  // ==========================================

  async function playSurah(number, name) {
    stopAudio();

    const session = currentAudioSession;

    currentSurahName = name;

    reader.innerHTML = "";

    setStatus("جاري تجهيز صوت " + name + "...");

    try {
      // عبدالرحمن مسعد

      if (isMossadSelected()) {
        await playMossadSurah(
          number,
          name,
          session
        );

        return;
      }

      // تحميل بيانات القراء

      if (!reciters.length) {
        const loaded = await loadReciters();

        if (!loaded) {
          throw new Error(
            "تعذر تحميل بيانات القراء. حاول مرة أخرى."
          );
        }
      }

      if (session !== currentAudioSession) return;

      // البحث عن القارئ

      const reciter = findReader();

      if (!reciter) {
        throw new Error(
          "لم يتم العثور على القارئ في مكتبة الصوتيات. تحقق من اسم القارئ."
        );
      }

      // البحث عن مصحف يحتوي على السورة المطلوبة

      const moshaf = findMoshafForSurah(
        reciter,
        number
      );

      if (!moshaf) {
        throw new Error(
          "هذه السورة غير متاحة في المصحف الصوتي لهذا القارئ."
        );
      }

      // إنشاء الرابط

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

      await audio.play();

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

  // ==========================================
  // أحداث مشغل الصوت
  // ==========================================

  audio.addEventListener("ended", function () {
    setStatus(
      "انتهى الاستماع لسورة " + currentSurahName
    );
  });

  audio.addEventListener("error", function () {
    if (!audio.src) return;

    console.error("Audio Error:", audio.error);

    setStatus(
      "تعذر تحميل ملف الصوت. تحقق من اتصال الإنترنت أو جرّب قارئاً آخر."
    );
  });

  audio.addEventListener("play", function () {
    if (currentSurahName) {
      setStatus(
        "يتم الآن الاستماع لسورة " + currentSurahName
      );
    }
  });

  // ==========================================
  // تغيير القارئ
  // ==========================================

  readerSelect.addEventListener("change", function () {
    stopAudio();

    reader.innerHTML = "";

    if (surahs.length) {
      renderSurahs();
    }

    if (isMossadSelected()) {
      setStatus(
        "اختر سورة من السور السبعة المتاحة لعبدالرحمن مسعد"
      );
    } else {
      setStatus(
        "تم تغيير القارئ. اختر السورة للاستماع."
      );
    }
  });

  // ==========================================
  // بدء التطبيق
  // ==========================================

  Promise.all([
    loadReciters(),
    loadSurahs()
  ]);

})();
