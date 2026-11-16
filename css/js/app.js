
(function () {
  "use strict";

  // =====================================
  // تطبيق يقين - الملف الرئيسي app.js
  // =====================================

  let currentUtterance = null;
  let currentPlayButton = null;
  let currentStopButton = null;

  // إيقاف القراءة الصوتية
  function stopAzkarReading() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (currentPlayButton) {
      currentPlayButton.disabled = false;
      currentPlayButton.textContent = "🔊 استمع للذكر";
    }

    if (currentStopButton) {
      currentStopButton.disabled = true;
    }

    currentUtterance = null;
    currentPlayButton = null;
    currentStopButton = null;
  }

  // التنقل بين صفحات التطبيق
  window.showPage = function (pageId) {
    if (pageId !== "azkar") {
      stopAzkarReading();
    }

    document.querySelectorAll(".page").forEach(function (page) {
      page.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach(function (item) {
      item.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
      selectedPage.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(function (item) {
      const action = item.getAttribute("onclick");

      if (action && action.includes("'" + pageId + "'")) {
        item.classList.add("active");
      }
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // التاريخ الميلادي والهجري
  function updateDates() {
    const now = new Date();

    const gregorian = document.getElementById("gregorian-date");
    const hijri = document.getElementById("hijri-date");

    if (gregorian) {
      gregorian.textContent = now.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }

    if (hijri) {
      try {
        hijri.textContent = new Intl.DateTimeFormat(
          "ar-SA-u-ca-islamic",
          {
            day: "numeric",
            month: "long",
            year: "numeric"
          }
        ).format(now);
      } catch (error) {
        hijri.textContent = "نسأل الله أن يجعل يومك مباركاً";
      }
    }
  }

  // التنبيهات
  function setupNotifications() {
    const button = document.querySelector(".notification-btn");

    if (!button) return;

    button.addEventListener("click", async function () {
      if (!("Notification" in window)) {
        alert("المتصفح لا يدعم التنبيهات");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        new Notification("يَقِين ☪", {
          body: "أهلاً بك في تطبيق يقين، رفيقك إلى الله"
        });
      } else {
        alert("لم يتم السماح بالتنبيهات");
      }
    });
  }

  // عناوين الأقسام
  const azkarTitles = {
    morning: "أذكار الصباح",
    evening: "أذكار المساء",
    sleep: "أذكار النوم",
    wake: "أذكار الاستيقاظ من النوم",
    prayer: "أذكار بعد الصلاة",
    afterPrayer: "أذكار بعد الصلاة",
    adhan: "أذكار الأذان",
    mosque: "أذكار المسجد",
    home: "أذكار المنزل",
    food: "أذكار الطعام والشراب",
    general: "أذكار متنوعة"
  };

  // تشغيل القراءة الصوتية
  function speakAzkar(text, playButton, stopButton, status) {
    if (!("speechSynthesis" in window)) {
      status.textContent = "المتصفح لا يدعم القراءة الصوتية.";
      return;
    }

    stopAzkarReading();

    const cleanText = text.replace(/\n/g, " ");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = "ar-SA";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(function (voice) {
      return voice.lang && voice.lang.toLowerCase().startsWith("ar");
    });

    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    currentUtterance = utterance;
    currentPlayButton = playButton;
    currentStopButton = stopButton;

    playButton.disabled = true;
    playButton.textContent = "🔊 جاري القراءة...";
    stopButton.disabled = false;
    status.textContent = "جاري قراءة الذكر...";

    utterance.onend = function () {
      if (currentUtterance !== utterance) return;

      playButton.disabled = false;
      playButton.textContent = "🔊 استمع للذكر";
      stopButton.disabled = true;
      status.textContent = "انتهت القراءة.";
      currentUtterance = null;
      currentPlayButton = null;
      currentStopButton = null;
    };

    utterance.onerror = function () {
      if (currentUtterance !== utterance) return;

      playButton.disabled = false;
      playButton.textContent = "🔊 استمع للذكر";
      stopButton.disabled = true;
      status.textContent = "تعذرت القراءة الصوتية على هذا الجهاز.";
      currentUtterance = null;
      currentPlayButton = null;
      currentStopButton = null;
    };

    window.speechSynthesis.speak(utterance);
  }

  // تحميل وعرض الأذكار
  window.loadAzkar = function (type) {
    const container = document.getElementById("azkar-content");

    if (!container) return;

    stopAzkarReading();

    if (type === "prayer") {
      type = "afterPrayer";
    }

    const data = window.azkarData;

    if (!data || !Array.isArray(data[type])) {
      container.textContent =
        "تعذر تحميل الأذكار. تأكد من تحميل ملف azkar.js.";
      return;
    }

    container.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "content-card";

    const title = document.createElement("h3");
    title.textContent = azkarTitles[type] || "الأذكار";

    const description = document.createElement("p");
    description.textContent =
      "اقرأ الذكر أو استمع إليه واضغط على زر التسبيح لإكمال العدد.";

    heading.append(title, description);
    container.appendChild(heading);

    data[type].forEach(function (zekr) {
      const card = document.createElement("div");
      card.className = "content-card azkar-card";

      const text = document.createElement("p");
      text.className = "azkar-text";
      text.textContent = zekr.text || "";

      card.appendChild(text);

      if (zekr.note) {
        const note = document.createElement("small");
        note.className = "azkar-note";
        note.textContent = zekr.note;
        card.appendChild(note);
      }

      const originalCount = Math.max(
        1,
        Number(zekr.count) || 1
      );

      let remaining = originalCount;

      const counter = document.createElement("h3");
      counter.className = "azkar-counter";
      counter.textContent =
        "المتبقي: " + remaining + " من " + originalCount;

      // زر الاستماع
      const playButton = document.createElement("button");
      playButton.type = "button";
      playButton.className = "azkar-play-btn";
      playButton.textContent = "🔊 استمع للذكر";

      // زر إيقاف القراءة
      const stopButton = document.createElement("button");
      stopButton.type = "button";
      stopButton.className = "azkar-stop-btn";
      stopButton.textContent = "⏹ إيقاف";
      stopButton.disabled = true;

      const status = document.createElement("p");
      status.className = "azkar-status";

      playButton.addEventListener("click", function () {
        speakAzkar(zekr.text || "", playButton, stopButton, status);
      });

      stopButton.addEventListener("click", function () {
        if (currentPlayButton === playButton) {
          stopAzkarReading();
          status.textContent = "تم إيقاف القراءة.";
        }
      });

      // زر التسبيح
      const counterButton = document.createElement("button");
      counterButton.type = "button";
      counterButton.className = "azkar-repeat-btn";
      counterButton.textContent = "📿 تسبيح";

      counterButton.addEventListener("click", function () {
        if (remaining <= 0) return;

        remaining--;

        counter.textContent =
          "المتبقي: " + remaining + " من " + originalCount;

        if (remaining === 0) {
          counterButton.disabled = true;
          counterButton.textContent = "✓ اكتمل الذكر";
          status.textContent = "تقبل الله منك 🤍";
          card.classList.add("azkar-complete");
        }
      });

      card.append(
        counter,
        playButton,
        stopButton,
        counterButton,
        status
      );

      container.appendChild(card);
    });

    const source = document.createElement("p");
    source.className = "azkar-source";
    source.textContent =
      "المصدر: " + (window.azkarSource || "مصادر الأذكار");

    container.appendChild(source);

    window.showPage("azkar");
  };

  // تشغيل التطبيق
  document.addEventListener("DOMContentLoaded", function () {
    updateDates();
    setupNotifications();
  });

})();
