
(function () {
  "use strict";

  // التنقل بين صفحات التطبيق
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const buttons = Array.from(navItems);
    const selectedButton = buttons.find(function (button) {
      return button.getAttribute("onclick") &&
        button.getAttribute("onclick").includes("'" + pageId + "'");
    });

    if (selectedButton) {
      selectedButton.classList.add("active");
    }
  };

  // التاريخ الميلادي
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
        hijri.textContent = now.toLocaleDateString("ar-EG-u-ca-islamic", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      } catch (error) {
        hijri.textContent = "أهلاً بك في يقين";
      }
    }
  }

  // تشغيل الساعة
  function updateClock() {
    const countdown = document.getElementById("countdown");

    if (!countdown) return;

    countdown.textContent = new Date().toLocaleTimeString("ar-EG");
  }

  // تهيئة التطبيق
  document.addEventListener("DOMContentLoaded", function () {
    updateDates();
    updateClock();

    setInterval(updateClock, 1000);
  });

})();
