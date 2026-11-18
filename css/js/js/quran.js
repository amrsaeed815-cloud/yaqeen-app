
(function () {
  "use strict";

  // تطبيق يقين - قسم القرآن الكريم
  const API = "https://alquran.api.islamic.network/v1";
  const TEXT_API = "https://api.alquran.cloud/v1";

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

  // مشغّلان صوتيان لتجهيز الآية التالية مسبقًا
  const audioPlayers = [new Audio(), new Audio()];

  audioPlayers.forEach(function (player) {
    player.preload = "auto";
  });

  let currentAyahs = [];
  let currentAyahIndex = 0;
  let currentSurahName = "";
  let activePlayer = 0;
  let playbackSession = 0;

  const playerSessions = [0, 0];
  const playerAyahIndexes = [-1, -1];

  const status = document.createElement("p");
  status.id = "quran-status";
  status.style.cssText =
    "text-align:center;padding:10px;color:inherit;";

  surahList.before(status);

  const reader = document.createElement("div");
  reader.id = "quran-text";
  reader.style.cssText =
    "direction:rtl;text-align:justify;line-height:2.5;font-size:22px;padding:15px;";

  surahList.after(reader);

  function setStatus(message) {
    status.textContent = message;
  }

  function getEdition() {
    const selected = readerSelect.value;
    return readers[selected] || selected || readers.mishary;
  }

  // إيقاف أي تشغيل سابق وإلغاء الجلسة القديمة
  function stopAudio() {
    playbackSession++;

    audioPlayers.forEach(function (player) {
      player.pause();
      player.currentTime = 0;
      player.removeAttribute("src");
      player.load();
    });

    currentAyahs = [];
    currentAyahIndex = 0;

    playerAyahIndexes[0] = -1;
    playerAyahIndexes[1] = -1;
  }

  // البحث عن الآية التالية التي لديها ملف صوت
  function findNextPlayableIndex(startIndex) {
    for (let i = startIndex; i < currentAyahs.length; i++) {
      if (
        currentAyahs[i] &&
        typeof currentAyahs[i].audio === "string" &&
        currentAyahs[i].audio.trim() !== ""
      ) {
        return i;
      }
    }

    return -1;
  }

  // تجهيز ملف صوت داخل أحد المشغّلين
  function preparePlayer(playerIndex, ayahIndex, session) {
    const player = audioPlayers[playerIndex];
    const ayah = currentAyahs[ayahIndex];

    if (!ayah || !ayah.audio || session !== playbackSession) {
      return false;
    }

    player.pause();
    playerAyahIndexes[playerIndex] = ayahIndex;
    playerSessions[playerIndex] = session;

    player.src = ayah.audio;
    player.preload = "auto";
    player.load();

    return true;
  }

  // تشغيل آية وتجهيز الآية التي تليها
  function playAyah(ayahIndex, playerIndex, session) {
    if (session !== playbackSession) return;

    const nextIndex = findNextPlayableIndex(ayahIndex);

    if (nextIndex === -1) {
      currentAyahIndex = currentAyahs.length;
      setStatus("انتهى الاستماع لسورة " + currentSurahName);
      return;
    }

    currentAyahIndex = nextIndex;

    const player = audioPlayers[playerIndex];

    // تجهيز المشغّل إذا لم يكن يحمل الآية المطلوبة
    if (
      playerAyahIndexes[playerIndex] !== nextIndex ||
      playerSessions[playerIndex] !== session
    ) {
      if (!preparePlayer(playerIndex, nextIndex, session)) {
        setStatus("تعذر تجهيز ملف الآية");
        return;
      }
    }

    activePlayer = playerIndex;

    const ayah = currentAyahs[nextIndex];

    setStatus(
      "سورة " + currentSurahName +
      " - الآية " +
      (ayah.numberInSurah || nextIndex + 1)
    );

    // تجهيز الآية التالية في المشغّل الآخر أثناء التشغيل
    const nextPlayableIndex = findNextPlayableIndex(nextIndex + 1);
    const nextPlayerIndex = 1 - playerIndex;

    if (nextPlayableIndex !== -1) {
      preparePlayer(nextPlayerIndex, nextPlayableIndex, session);
    }

    player.play().catch(function (error) {
      if (session !== playbackSession) return;

      console.error("Audio Play Error:", error);
      setStatus("تعذر تشغيل الصوت. اضغط على الاستماع مرة أخرى.");
    });
  }

  // الانتقال تلقائيًا للآية التالية
  function advanceToNext(playerIndex, session) {
    if (session !== playbackSession) return;
    if (playerIndex !== activePlayer) return;

    const nextIndex = findNextPlayableIndex(currentAyahIndex + 1);
    const nextPlayerIndex = 1 - playerIndex;

    if (nextIndex === -1) {
      currentAyahIndex = currentAyahs.length;
      setStatus("انتهى الاستماع لسورة " + currentSurahName);
      return;
    }

    playAyah(nextIndex, nextPlayerIndex, session);
  }

  // ربط أحداث المشغّلين
  audioPlayers.forEach(function (player, playerIndex) {

    player.addEventListener("ended", function () {
      const session = playerSessions[playerIndex];

      if (session !== playbackSession) return;
      if (playerIndex !== activePlayer) return;
      if (playerAyahIndexes[playerIndex] !== currentAyahIndex) return;

      advanceToNext(playerIndex, session);
    });

    player.addEventListener("error", function () {
      const session = playerSessions[playerIndex];

      // تجاهل أخطاء المشغّل الذي يجهّز الآية القادمة
      if (session !== playbackSession) return;
      if (playerIndex !== activePlayer) return;
      if (playerAyahIndexes[playerIndex] !== currentAyahIndex) return;

      console.error("Quran Audio Error:", player.error);

      setStatus("تعذر تشغيل الآية، جاري تخطيها...");

      advanceToNext(playerIndex, session);
    });
  });

  // تحميل السور الـ 114
  async function loadSurahs() {
    setStatus("جاري تحميل سور القرآن الكريم...");
    surahList.innerHTML = "";

    try {
      const response = await fetch(TEXT_API + "/surah");

      if (!response.ok) {
        throw new Error("فشل تحميل قائمة السور");
      }

      const result = await response.json();
      const surahs = result.data || result;

      if (!Array.isArray(surahs) || !surahs.length) {
        throw new Error("بيانات السور غير صحيحة");
      }

      surahs.forEach(function (surah) {
        const card = document.createElement("div");

        card.style.cssText =
          "padding:12px;margin:8px 0;border:1px solid #999;border-radius:12px;";

        const name = document.createElement("h3");
        name.textContent = surah.name || ("سورة رقم " + surah.number);

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

      setStatus("تم تحميل " + surahs.length + " سورة بنجاح");

    } catch (error) {
      console.error("Surah Loading Error:", error);
      setStatus("تعذر تحميل السور. حاول تحديث الصفحة.");
    }
  }

  // قراءة السورة كاملة
  async function loadSurahText(number, name) {
    stopAudio();

    reader.innerHTML = "";
    currentSurahName = name;

    setStatus("جاري تحميل " + name + "...");

    try {
      const response = await fetch(
        TEXT_API + "/surah/" + number + "/quran-uthmani"
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
        basmala.textContent = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
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
      setStatus("تعذر تحميل آيات السورة.");
    }
  }

  // الاستماع للسورة
  async function playSurah(number, name) {
    stopAudio();

    const session = playbackSession;

    currentSurahName = name;
    reader.innerHTML = "";

    setStatus("جاري تجهيز صوت " + name + "...");

    try {
      const edition = getEdition();

      const response = await fetch(
        API + "/surah/" + number + "/" + edition
      );

      if (session !== playbackSession) return;

      if (!response.ok) {
        throw new Error("تعذر تحميل الصوت");
      }

      const result = await response.json();

      if (session !== playbackSession) return;

      const data = result.data || result;
      currentAyahs = data.ayahs || [];

      if (!currentAyahs.length) {
        throw new Error("لم يتم العثور على ملفات الصوت");
      }

      currentAyahIndex = -1;

      // بدء التلاوة تلقائيًا
      playAyah(0, 0, session);

    } catch (error) {
      if (session !== playbackSession) return;

      console.error("Quran Audio Error:", error);
      setStatus("تعذر تشغيل السورة. جرّب قارئًا آخر.");
    }
  }

  // عند تغيير القارئ أوقف الصوت القديم
  readerSelect.addEventListener("change", function () {
    if (currentAyahs.length) {
      stopAudio();
      setStatus("تم تغيير القارئ. اختر السورة للاستماع بالقارئ الجديد.");
    }
  });

  loadSurahs();

})();
