
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

  // عرض التاريخ الميلادي والهجري
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
        hijri.textContent = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
          day: "numeric",
          month: "long",
          year: "numeric"
        }).format(now);
      } catch (error) {
        hijri.textContent = "نسأل الله أن يجعل يومك مباركاً";
      }
    }
  }

  // زر التنبيهات
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

  // تشغيل التطبيق
  document.addEventListener("DOMContentLoaded", function () {
    updateDates();
    setupNotifications();
  });

})();
