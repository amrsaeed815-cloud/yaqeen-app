
(function () {
  "use strict";

  // =====================================
  // تطبيق يقين - الملف الرئيسي app.js
  // =====================================

  // 1- التنقل بين صفحات التطبيق
  window.showPage = function (pageId) {
    const pages = document.querySelectorAll(".page");
    const navItems = document.querySelectorAll(".nav-item");

    pages.forEach(function (page) {
      page.classList.remove("active");
    });

    navItems.forEach(function (item) {
      item.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
      selectedPage.classList.add("active");
    }

    navItems.forEach(function (item) {
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

  // 2- عرض التاريخ الميلادي والهجري
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

  // 3- إعداد زر التنبيهات
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

  // =====================================
  // 4- نظام الأذكار والعدادات
  // =====================================

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
    food: "أذكار الطعام",
    general: "أذكار متنوعة"
  };

  // عرض الأذكار
  window.loadAzkar = function (type) {
    const container = document.getElementById("azkar-content");

    if (!container) return;

    // توحيد اسم أذكار بعد الصلاة
    if (type === "prayer") {
      type = "afterPrayer";
    }

    const data = window.azkarData;

    if (!data || !Array.isArray(data[type])) {
      container.textContent =
        "تعذر تحميل الأذكار. تأكد من تحميل ملف azkar.js.";
      return;
    }

    const list = data[type];

    container.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "content-card";

    const title = document.createElement("h3");
    title.textContent = azkarTitles[type] || "الأذكار";

    const description = document.createElement("p");
    description.textContent =
      "اقرأ الذكر واضغط على زر التكرار حتى يكتمل العدد.";

    heading.append(title, description);
    container.appendChild(heading);

    // إنشاء بطاقات الأذكار
    list.forEach(function (zekr) {
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

      const button = document.createElement("button");
      button.className = "azkar-repeat-btn";
      button.type = "button";
      button.textContent = "📿 تسبيح";

      const status = document.createElement("p");
      status.className = "azkar-status";

      button.addEventListener("click", function () {
        if (remaining <= 0) return;

        remaining--;

        counter.textContent =
          "المتبقي: " + remaining + " من " + originalCount;

        if (remaining === 0) {
          button.disabled = true;
          button.textContent = "✓ اكتمل الذكر";
          status.textContent = "تقبل الله منك 🤍";
          card.classList.add("azkar-complete");
        }
      });

      card.append(counter, button, status);
      container.appendChild(card);
    });

    // مصدر الأذكار
    const source = document.createElement("p");
    source.className = "azkar-source";
    source.textContent =
      "المصدر: " +
      (window.azkarSource || "مصادر الأذكار");

    container.appendChild(source);

    // الانتقال لصفحة الأذكار
    window.showPage("azkar");
  };

  // =====================================
  // 5- تشغيل التطبيق
  // =====================================

  document.addEventListener("DOMContentLoaded", function () {
    updateDates();
    setupNotifications();
  });

})();
