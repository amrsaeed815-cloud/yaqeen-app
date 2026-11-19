
(function () {
  "use strict";

  // ==========================================
  // تطبيق يقين - الملف الرئيسي app.js
  // ==========================================

  if (window.yaqeenAppInitialized) {
    console.warn("Yaqeen app already initialized");
    return;
  }

  window.yaqeenAppInitialized = true;

  // ==========================================
  // التنقل بين أقسام التطبيق
  // ==========================================

  function showPage(pageId) {
    const target = document.getElementById(pageId);

    if (!target || !target.classList.contains("page")) {
      console.warn("Page not found:", pageId);
      return;
    }

    document.querySelectorAll("main .page").forEach(page => {
      page.classList.remove("active");
    });

    target.classList.add("active");

    // تحديث القائمة السفلية
    document.querySelectorAll(".bottom-nav .nav-item")
      .forEach(button => {
        const onclick = button.getAttribute("onclick") || "";
        const match = onclick.match(/showPage\(['"]([^'"]+)['"]\)/);

        button.classList.toggle(
          "active",
          !!match && match[1] === pageId
        );
      });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  window.showPage = showPage;

  // ==========================================
  // تحديث التاريخ الميلادي والهجري
  // ==========================================

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
          "ar-EG-u-ca-islamic-umalqura",
          {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          }
        ).format(now);

      } catch (error) {
        console.warn("Hijri date error:", error);

        try {
          hijri.textContent = new Intl.DateTimeFormat(
            "ar-EG-u-ca-islamic",
            {
              year: "numeric",
              month: "long",
              day: "numeric"
            }
          ).format(now);

        } catch (fallbackError) {
          hijri.textContent = "التاريخ الهجري غير متاح";
        }
      }
    }
  }

  // ==========================================
  // نظام الإشعارات
  // ==========================================

  function setupNotifications() {
    const button = document.querySelector(".notification-btn");

    if (!button || button.dataset.bound === "true") {
      return;
    }

    button.dataset.bound = "true";

    button.addEventListener("click", async function () {

      if (!("Notification" in window)) {
        alert("المتصفح لا يدعم الإشعارات.");
        return;
      }

      if (Notification.permission === "denied") {
        alert("الإشعارات محظورة. يمكنك تفعيلها من إعدادات المتصفح.");
        return;
      }

      try {
        let permission = Notification.permission;

        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission === "granted") {
          new Notification("يَقِين ☪", {
            body: "تم تفعيل الإشعارات بنجاح. رفيقك إلى الله.",
            icon: "./icon-192.png"
          });

          button.title = "الإشعارات مفعلة";

        } else {
          alert("لم يتم السماح بالإشعارات.");
        }

      } catch (error) {
        console.error("Notification error:", error);
        alert("تعذر تفعيل الإشعارات.");
      }
    });
  }

  // ==========================================
  // التأكد من وجود جميع أقسام التطبيق
  // ==========================================

  function checkAppSections() {
    const sections = [
      "home",
      "quran",
      "azkar",
      "prayer",
      "ramadan",
      "more",
      "duas",
      "ruqyah"
    ];

    sections.forEach(id => {
      if (!document.getElementById(id)) {
        console.warn("Yaqeen section missing:", id);
      }
    });
  }

  // ==========================================
  // بدء التطبيق
  // ==========================================

  function init() {
    checkAppSections();

    updateDates();

    setupNotifications();

    // تحديث التاريخ كل دقيقة
    setInterval(updateDates, 60000);

    // تحديث التاريخ عند العودة للتطبيق
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        updateDates();
      }
    });

    console.log("يَقِين: تم تشغيل الملف الرئيسي بنجاح ☪");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

  // ==========================================
  // إتاحة وظائف التطبيق
  // ==========================================

  window.YaqeenApp = {
    showPage: showPage,
    updateDates: updateDates
  };

})();
