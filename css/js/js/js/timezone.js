
(function () {
  "use strict";

  const STORAGE_KEY = "yaqeen_timezone_v2";
  const MODE_KEY = "yaqeen_timezone_mode_v1";

  // تحديد توقيت الجهاز
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

  let selectedZone = detectedZone;
  let selectedMode = "auto";

  // قراءة الإعدادات المحفوظة
  try {
    const savedZone = localStorage.getItem(STORAGE_KEY);
    const savedMode = localStorage.getItem(MODE_KEY);

    if (savedZone && isValidZone(savedZone)) {
      selectedZone = savedZone;
    }

    if (["auto", "summer", "winter"].includes(savedMode)) {
      selectedMode = savedMode;
    }
  } catch (error) {
    console.warn("تعذر قراءة إعدادات التوقيت المحفوظة");
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
      "Asia/Karachi",
      "Asia/Kolkata",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Singapore",
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
      "Australia/Sydney"
    ];
  }

  // حساب فرق التوقيت
  function getOffsetMinutes(date, zone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);

    const values = {};

    parts.forEach(function (part) {
      values[part.type] = part.value;
    });

    const asUTC = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );

    return Math.round(
      (asUTC - date.getTime()) / 60000
    );
  }

  // تحديد التوقيت المطلوب
  function getTargetOffset(date) {
    const year = date.getFullYear();

    const jan = getOffsetMinutes(
      new Date(Date.UTC(year, 0, 15, 12)),
      selectedZone
    );

    const jul = getOffsetMinutes(
      new Date(Date.UTC(year, 6, 15, 12)),
      selectedZone
    );

    const standardOffset = Math.min(jan, jul);

    if (selectedMode === "winter") {
      return standardOffset;
    }

    if (selectedMode === "summer") {
      return standardOffset + 60;
    }

    return getOffsetMinutes(date, selectedZone);
  }

  // حساب الوقت المعروض
  function getDisplayDate() {
    const now = new Date();

    const actualOffset = getOffsetMinutes(
      now,
      selectedZone
    );

    const targetOffset = getTargetOffset(now);

    return new Date(
      now.getTime() +
      (targetOffset - actualOffset) * 60000
    );
  }

  // عرض الساعة بالأرقام العربية
  function getLocalTime() {
    const date = getDisplayDate();

    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);

    const values = {};

    parts.forEach(function (part) {
      values[part.type] = part.value;
    });

    const hour = Number(values.hour);

    const number = new Intl.NumberFormat("ar-EG", {
      minimumIntegerDigits: 2,
      useGrouping: false
    });

    return (
      number.format(hour % 12 || 12) + ":" +
      number.format(values.minute) + ":" +
      number.format(values.second) + " " +
      (hour < 12 ? "صباحًا" : "مساءً")
    );
  }

  // عرض التاريخ
  function getLocalDate() {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(getDisplayDate());
  }

  // حفظ الإعدادات
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, selectedZone);
      localStorage.setItem(MODE_KEY, selectedMode);
    } catch (error) {
      console.warn("تعذر حفظ إعدادات التوقيت");
    }
  }

  // تنسيق الواجهة
  function addStyles() {
    if (document.getElementById("yaqeen-timezone-styles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "yaqeen-timezone-styles";

    style.textContent = `
      #yaqeen-timezone-panel {
        direction: rtl;
        margin-top: 14px;
        padding: 16px;
        border-radius: 16px;
        background: linear-gradient(145deg,#102D38,#0D1B25);
        border: 1px solid rgba(229,184,92,.45);
        color: #E7EEF2;
      }

      #yaqeen-timezone-panel h3 {
        color: #E5B85C;
        margin: 0 0 12px;
        font-size: 16px;
      }

      #yaqeen-clock {
        font-size: 30px;
        font-weight: 700;
        text-align: center;
        color: #E5B85C;
        direction: rtl;
        margin: 8px 0;
      }

      #yaqeen-date,
      #yaqeen-zone-name {
        text-align: center;
        color: #B5C6CE;
        font-size: 12px;
        margin: 6px 0;
      }

      #yaqeen-zone {
        width: 100%;
        padding: 11px;
        margin: 10px 0;
        border-radius: 10px;
        border: 1px solid #34515D;
        background: #09131B;
        color: #E7EEF2;
      }

      .yaqeen-time-modes {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 8px;
        margin-top: 12px;
      }

      .yaqeen-time-mode {
        padding: 10px 5px;
        border-radius: 10px;
        border: 1px solid #34515D;
        background: #142632;
        color: #DCE7EB;
        font-size: 12px;
        cursor: pointer;
      }

      .yaqeen-time-mode[aria-pressed="true"] {
        border-color: #E5B85C;
        background: #25404A;
        color: #F4D58E;
        box-shadow: 0 0 0 1px rgba(229,184,92,.2);
      }

      #yaqeen-time-note {
        font-size: 11px;
        line-height: 1.8;
        color: #9FB2BC;
        margin-top: 10px;
      }

      #yaqeen-settings-toggle {
        width: 100%;
        text-align: right;
        background: transparent;
        border: 0;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }

      @media(max-width:360px) {
        #yaqeen-clock {
          font-size: 25px;
        }

        .yaqeen-time-mode {
          font-size: 11px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // إنشاء واجهة التوقيت داخل الإعدادات
  function createInterface() {
    if (document.getElementById("yaqeen-timezone-panel")) {
      return;
    }

    const morePage = document.getElementById("more");

    if (!morePage) {
      console.error(
        "لم يتم العثور على صفحة المزيد لإضافة إعدادات التوقيت"
      );
      return;
    }

    const cards = Array.from(
      morePage.querySelectorAll(".content-card")
    );

    const settingsCard = cards.find(function (card) {
      const heading = card.querySelector("h3,h2");

      return (
        heading &&
        heading.textContent.includes("الإعدادات")
      );
    });

    if (!settingsCard) {
      console.error(
        "لم يتم العثور على بطاقة الإعدادات في صفحة المزيد"
      );
      return;
    }

    // إزالة بطاقة التوقيت القديمة
    cards.forEach(function (card) {
      const heading = card.querySelector("h3,h2");

      if (
        heading &&
        heading.textContent.includes("التوقيت العالمي")
      ) {
        card.remove();
      }
    });

    addStyles();

    const oldDescription = settingsCard.querySelector("p");

    if (oldDescription) {
      oldDescription.textContent =
        "إعدادات التوقيت العالمي وخيارات العرض";
    }

    // زر فتح إعدادات التوقيت
    const toggle = document.createElement("button");

    toggle.type = "button";
    toggle.id = "yaqeen-settings-toggle";

    toggle.textContent =
      "⚙️ إعدادات التوقيت العالمي  ＋";

    settingsCard.appendChild(toggle);

    // لوحة التوقيت
    const panel = document.createElement("div");

    panel.id = "yaqeen-timezone-panel";
    panel.hidden = true;

    panel.innerHTML = `
      <h3>🌍 التوقيت العالمي</h3>

      <div id="yaqeen-clock" aria-live="off"></div>

      <div id="yaqeen-date"></div>

      <label for="yaqeen-zone">
        اختر الدولة أو المدينة والمنطقة الزمنية
      </label>

      <select id="yaqeen-zone"></select>

      <div id="yaqeen-zone-name"></div>

      <div class="yaqeen-time-modes"
           role="group"
           aria-label="اختيار نظام التوقيت">

        <button type="button"
                class="yaqeen-time-mode"
                data-mode="auto"
                aria-pressed="true">
          🕒 تلقائي
        </button>

        <button type="button"
                class="yaqeen-time-mode"
                data-mode="summer"
                aria-pressed="false">
          ☀️ صيفي
        </button>

        <button type="button"
                class="yaqeen-time-mode"
                data-mode="winter"
                aria-pressed="false">
          🌙 شتوي
        </button>

      </div>

      <p id="yaqeen-time-note">
        تلقائي: يتبع قواعد المنطقة الزمنية.
        الاختيار الصيفي أو الشتوي يغيّر ساعة العرض
        داخل التطبيق فقط، ولا يغيّر ساعة الجهاز
        أو مواقيت الصلاة.
      </p>
    `;

    settingsCard.appendChild(panel);

    // إضافة المناطق الزمنية
    const select = panel.querySelector("#yaqeen-zone");

    const zones = getZones();

    zones.forEach(function (zone) {
      const option = document.createElement("option");

      option.value = zone;
      option.textContent = zone.replace(/_/g, " ");

      select.appendChild(option);
    });

    if (!zones.includes(selectedZone)) {
      const option = document.createElement("option");

      option.value = selectedZone;
      option.textContent = selectedZone;

      select.appendChild(option);
    }

    select.value = selectedZone;

    // فتح وإغلاق اللوحة
    toggle.addEventListener("click", function () {
      panel.hidden = !panel.hidden;

      toggle.textContent = panel.hidden
        ? "⚙️ إعدادات التوقيت العالمي  ＋"
        : "⚙️ إعدادات التوقيت العالمي  −";

      if (!panel.hidden) {
        updateClock();
      }
    });

    // تغيير المدينة
    select.addEventListener("change", function () {
      if (!isValidZone(this.value)) {
        return;
      }

      selectedZone = this.value;

      saveSettings();
      updateClock();
    });

    // تغيير وضع التوقيت
    panel.querySelectorAll("[data-mode]").forEach(
      function (button) {
        button.addEventListener("click", function () {
          selectedMode = this.dataset.mode;

          saveSettings();
          updateModeButtons();
          updateClock();
        });
      }
    );

    updateModeButtons();
    updateClock();

    // تحديث الساعة كل ثانية
    window.setInterval(updateClock, 1000);
  }

  // تحديث حالة أزرار التوقيت
  function updateModeButtons() {
    document.querySelectorAll(
      "#yaqeen-timezone-panel [data-mode]"
    ).forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.mode === selectedMode)
      );
    });
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
      const modeLabels = {
        auto: "تلقائي",
        summer: "صيفي يدوي",
        winter: "شتوي يدوي"
      };

      zone.textContent =
        "المنطقة الزمنية: " +
        selectedZone.replace(/_/g, " ") +
        " · الوضع: " +
        modeLabels[selectedMode];
    }
  }

  // إتاحة التوقيت لباقي ملفات التطبيق
  window.YaqeenTime = {
    getTimezone: function () {
      return selectedZone;
    },

    getMode: function () {
      return selectedMode;
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
