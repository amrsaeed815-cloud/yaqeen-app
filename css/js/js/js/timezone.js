
(function () {
  "use strict";

  const STORAGE_KEY = "yaqeen_timezone";

  const detectedZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "Africa/Cairo";

  let selectedZone =
    localStorage.getItem(STORAGE_KEY) || detectedZone;

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
      "Asia/Dhaka",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Singapore",
      "Asia/Bangkok",
      "Australia/Sydney",
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
      "America/Sao_Paulo",
      "Pacific/Auckland"
    ];
  }

  function getLocalTime() {
    return new Intl.DateTimeFormat("ar", {
      timeZone: selectedZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(new Date());
  }

  function getLocalDate() {
    return new Intl.DateTimeFormat("ar", {
      timeZone: selectedZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date());
  }

  function createInterface() {
    if (document.getElementById("yaqeen-timezone")) return;

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
          حسب قواعد المنطقة الزمنية المختارة.
        </small>
      </div>
    `;

    const main = document.querySelector("main");

    (main || document.body).appendChild(section);

    const select = section.querySelector("#yaqeen-zone");

    getZones().forEach(function (zone) {
      const option = document.createElement("option");
      option.value = zone;
      option.textContent = zone.replace(/_/g, " ");
      select.appendChild(option);
    });

    if (!getZones().includes(selectedZone)) {
      selectedZone = detectedZone;
    }

    select.value = selectedZone;

    select.addEventListener("change", function () {
      selectedZone = this.value;
      localStorage.setItem(STORAGE_KEY, selectedZone);
      updateClock();
    });

    updateClock();
    setInterval(updateClock, 1000);
  }

  function updateClock() {
    const clock = document.getElementById("yaqeen-clock");
    const date = document.getElementById("yaqeen-date");
    const zone = document.getElementById("yaqeen-zone-name");

    if (clock) clock.textContent = getLocalTime();
    if (date) date.textContent = getLocalDate();

    if (zone) {
      zone.textContent = "المنطقة الزمنية: " + selectedZone;
    }
  }

  window.YaqeenTime = {
    getTimezone: function () {
      return selectedZone;
    },
    getTime: getLocalTime,
    getDate: getLocalDate
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createInterface);
  } else {
    createInterface();
  }

})();
