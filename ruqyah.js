
(function () {
  "use strict";

  // تطبيق يقين - قسم الرقية الشرعية مع مشغل الصوت

  const ruqyahData = [
    {
      title: "سورة الفاتحة",
      text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
      source: "سورة الفاتحة",
      count: 7
    },
    {
      title: "آية الكرسي",
      text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
      source: "سورة البقرة: 255",
      count: 1
    },
    {
      title: "آخر آيتين من سورة البقرة",
      text: "آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا...",
      source: "سورة البقرة: 285-286",
      count: 1
    },
    {
      title: "سورة الإخلاص",
      text: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
      source: "سورة الإخلاص",
      count: 3
    },
    {
      title: "سورة الفلق",
      text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
      source: "سورة الفلق",
      count: 3
    },
    {
      title: "سورة الناس",
      text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ",
      source: "سورة الناس",
      count: 3
    },
    {
      title: "دعاء الشفاء",
      text: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا",
      source: "صحيح البخاري وصحيح مسلم",
      count: 3
    },
    {
      title: "رقية جبريل عليه السلام",
      text: "بِاسْمِ اللَّهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللَّهُ يَشْفِيكَ، بِاسْمِ اللَّهِ أَرْقِيكَ",
      source: "صحيح مسلم",
      count: 3
    },
    {
      title: "دعاء الاستعاذة",
      text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
      source: "صحيح مسلم",
      count: 3
    }
  ];

  const container = document.getElementById("ruqyah-content");

  if (!container) return;

  const counters = ruqyahData.map(() => 0);

  // مشغل الصوت مستقل عن إعادة رسم العدادات
  const audio = new Audio("./assets/audio/الرقيه الشرعيه.mp3");
  audio.preload = "metadata";

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(remainingSeconds).padStart(2, "0")
    );
  }

  function updatePlayer() {
    const playButton = container.querySelector("[data-audio-play]");
    const progress = container.querySelector("[data-audio-progress]");
    const currentTime = container.querySelector("[data-audio-current]");
    const duration = container.querySelector("[data-audio-duration]");
    const status = container.querySelector("[data-audio-status]");

    if (!playButton) return;

    const current = audio.currentTime || 0;
    const total = Number.isFinite(audio.duration) ? audio.duration : 0;
    const percentage = total > 0 ? (current / total) * 100 : 0;

    playButton.textContent = audio.paused
      ? "▶ تشغيل الرقية"
      : "⏸ إيقاف مؤقت";

    if (progress) {
      progress.value = current;
      progress.max = total || 100;
    }

    if (currentTime) {
      currentTime.textContent = formatTime(current);
    }

    if (duration) {
      duration.textContent = formatTime(total);
    }

    if (status) {
      status.textContent = audio.error
        ? "تعذر تحميل الصوت، تأكد من وجود الملف"
        : audio.paused
          ? "الصوت متوقف مؤقتًا"
          : "الرقية الشرعية تعمل الآن";
    }
  }

  function render() {
    const total = ruqyahData.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const completed = counters.reduce(
      (sum, value) => sum + value,
      0
    );

    const percentage = Math.round((completed / total) * 100);

    container.innerHTML = `
      <div class="content-card">
        <h3>📿 متابعة الرقية الشرعية</h3>

        <p>أكملت ${completed} من ${total} قراءة</p>

        <div style="
          background:#253b3a;
          height:10px;
          border-radius:20px;
          overflow:hidden;
          margin:15px 0;
        ">
          <div style="
            width:${percentage}%;
            height:100%;
            background:#c5a45b;
            transition:width .3s;
          "></div>
        </div>

        <p>نسبة الإنجاز: ${percentage}%</p>

        <button type="button" data-reset-all>
          🔄 إعادة جميع العدادات
        </button>
      </div>

      <div class="content-card ruqyah-audio-card">
        <h3>🎧 الاستماع إلى الرقية الشرعية</h3>

        <p style="text-align:center">
          استمع إلى الرقية الشرعية أثناء القراءة
        </p>

        <div style="text-align:center;margin:18px 0">
          <button type="button" data-audio-play>
            ▶ تشغيل الرقية
          </button>
        </div>

        <input
          type="range"
          data-audio-progress
          min="0"
          max="100"
          value="0"
          step="0.1"
          aria-label="تقديم وتأخير الصوت"
          style="width:100%;cursor:pointer"
        >

        <div style="
          display:flex;
          justify-content:space-between;
          direction:ltr;
          margin-top:8px;
        ">
          <span data-audio-current>00:00</span>
          <span data-audio-duration>00:00</span>
        </div>

        <p
          data-audio-status
          style="text-align:center;color:#c5a45b;margin-top:12px"
        >
          جاهز للتشغيل
        </p>
      </div>

      ${ruqyahData.map((item, index) => `
        <div class="content-card ruqyah-card">
          <h3>${index + 1}. ${escapeHTML(item.title)}</h3>

          <p class="dua-text" style="
            font-size:21px;
            line-height:2.2;
            text-align:center;
            direction:rtl;
          ">${escapeHTML(item.text)}</p>

          <p style="text-align:center;color:#c5a45b">
            ${escapeHTML(item.source)}
          </p>

          <div style="text-align:center;margin-top:15px">
            <p>
              عدد المرات:
              <strong>${counters[index]}</strong>
              / ${item.count}
            </p>

            <button type="button" data-increment="${index}">
              📿 اضغط للتسبيح والقراءة
            </button>

            <button type="button" data-reset="${index}">
              🔄 إعادة
            </button>

            <p style="margin-top:10px">
              ${counters[index] >= item.count
                ? "✅ اكتملت القراءة"
                : "استمر في القراءة"}
            </p>
          </div>
        </div>
      `).join("")}
    `;

    updatePlayer();
  }

  // أحداث تشغيل الصوت
  audio.addEventListener("timeupdate", updatePlayer);
  audio.addEventListener("loadedmetadata", updatePlayer);
  audio.addEventListener("durationchange", updatePlayer);
  audio.addEventListener("play", updatePlayer);
  audio.addEventListener("pause", updatePlayer);
  audio.addEventListener("ended", updatePlayer);
  audio.addEventListener("error", updatePlayer);

  container.addEventListener("click", function (event) {
    const playButton = event.target.closest("[data-audio-play]");
    const increment = event.target.closest("[data-increment]");
    const reset = event.target.closest("[data-reset]");
    const resetAll = event.target.closest("[data-reset-all]");

    if (playButton) {
      if (audio.paused) {
        if (audio.ended) {
          audio.currentTime = 0;
        }

        audio.play().catch(function () {
          const status = container.querySelector("[data-audio-status]");
          if (status) {
            status.textContent = "تعذر تشغيل الصوت. تحقق من مسار الملف.";
          }
        });
      } else {
        audio.pause();
      }
      return;
    }

    if (increment) {
      const index = Number(increment.dataset.increment);

      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index < counters.length &&
        counters[index] < ruqyahData[index].count
      ) {
        counters[index]++;
        render();
      }
      return;
    }

    if (reset) {
      const index = Number(reset.dataset.reset);

      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index < counters.length
      ) {
        counters[index] = 0;
        render();
      }
      return;
    }

    if (resetAll) {
      counters.fill(0);
      render();
    }
  });

  // التحكم في تقديم وتأخير الصوت
  container.addEventListener("input", function (event) {
    if (event.target.matches("[data-audio-progress]")) {
      if (Number.isFinite(audio.duration)) {
        audio.currentTime = Number(event.target.value);
      }
    }
  });

  render();

  window.ruqyahData = ruqyahData;

})();
