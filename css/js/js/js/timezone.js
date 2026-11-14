
(function () {
  "use strict";

  const STORAGE_KEY = "yaqeen_timezone_v2";

  // تحديد المنطقة الزمنية الصحيحة من الجهاز
  const detectedZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "Africa/Cairo";

  function isValidZone(zone) {
    try {
      new Intl.DateTimeFormat("en", {
        timeZone: zone
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // استخدام المنطقة الزمنية المحفوظة أو المكتشفة
  let selectedZone = localStorage.getItem(STORAGE_KEY);

  if (!selectedZone || !isValidZone(selectedZone)) {
    selectedZone = detectedZone;
  }

  // قائمة المناطق الزمنية
  function getZones() {
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }

    return [
      "Africa/Cairo",
      "Africa/Casablanca",
      "Africa/Tunis",
      "Asia/Riyadh",
      "Asia/Dubai",
      "Asia/Kuwait",
      "Asia/Qatar",
      "Asia/Amman",
      "Asia/Jerusalem",
      "Asia/Istanbul",
      "Europe/Amsterdam",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Rome",
      "Europe/Moscow",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Toronto",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Singapore",
      "Australia/Sydney"
    ];
  }

  // عرض الساعة بنظام 24 ساعة
  function getLocalTime() {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: selectedZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).format(new Date());
  }

  // عرض التاريخ
  function getLocalDate() {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: selectedZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date());
  }

  // إنشاء واجهة التوقيت
  function createInterface() {
    if (document.getElementById("yaqeen-timezone")) {
      return;
    }

    const section = document.createElement("section");

    section.id = "yaqeen-timezone";
    section.dir = "rtl";

    section.innerHTML = `
      <div class="timezone-card">

        <h2>🌍 التوقيت العالمي</h2>

        <p>الوقت المحلي</p>

        <div id="yaqeen-clock"></div>

        <div id="yaqeen-date"></div>

        <label for="yaqeen-zone">
          اختر الدولة أو المدينة والمنطقة الزمنية
        </label>

        <select id="yaqeen-zone"></select>

        <p id="yaqeen-zone-name"></p>

        <small>
          يتم تطبيق التوقيت الصيفي والشتوي تلقائياً
          حسب المنطقة الزمنية المختارة.
        </small>

      </div>
    `;

    const main = document.querySelector("main");

    (main || document.body).appendChild(section);

    const select = section.querySelector("#yaqeen-zone");

    const zones = getZones();

    zones.forEach(function (zone) {
      const option = document.createElement("option");

      option.value = zone;
      option.textContent = zone.replace(/_/g, " ");

      select.appendChild(option);
    });

    // إضافة المنطقة الحالية لو مش موجودة في القائمة
    if (!zones.includes(selectedZone)) {
      const option = document.createElement("option");

      option.value = selectedZone;
      option.textContent = selectedZone;

      select.appendChild(option);
    }

    select.value = selectedZone;

    // تغيير المنطقة الزمنية
    select.addEventListener("change", function () {
      if (!isValidZone(this.value)) {
        return;
      }

      selectedZone = this.value;

      localStorage.setItem(STORAGE_KEY, selectedZone);

      updateClock();
    });

    updateClock();

    // تحديث الساعة كل ثانية
    setInterval(updateClock, 1000);
  }

  // تحديث الساعة والتاريخ
  function updateClock() {
    const clock = document.getElementById("yaqeen-clock");
    const date = document.getElementById("yaqeen-date");
    const zone = document.getElementById("yaqeen-zone-name");

    if (clock) {
      clock.textContent = getLocalTime();
    }

    if (date) {
      date.textContent = getLocalDate();
    }

    if (zone) {
      zone.textContent =
        "المنطقة الزمنية: " + selectedZone;
    }
  }

  // إتاحة بيانات التوقيت لباقي ملفات التطبيق
  window.YaqeenTime = {
    getTimezone: function () {
      return selectedZone;
    },

    getTime: getLocalTime,

    getDate: getLocalDate
  };

  // تشغيل التطبيق
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      createInterface
    );
  } else {
    createInterface();
  }

})();
