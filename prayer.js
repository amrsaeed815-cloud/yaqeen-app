
(function () {
  "use strict";

  const prayerNames = {
    Fajr: "الفجر",
    Sunrise: "الشروق",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء"
  };

  async function loadPrayerTimes(city = "Cairo", country = "Egypt") {
    const container = document.getElementById("prayer-times");

    if (!container) return;

    container.innerHTML = "جاري تحميل مواقيت الصلاة...";

    try {
      const url =
        "https://api.aladhan.com/v1/timingsByCity?city=" +
        encodeURIComponent(city) +
        "&country=" +
        encodeURIComponent(country) +
        "&method=5";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("تعذر تحميل المواقيت");
      }

      const result = await response.json();
      const timings = result.data.timings;

      container.innerHTML = "";

      Object.keys(prayerNames).forEach(function (key) {
        const item = document.createElement("div");
        item.className = "prayer-card";

        const name = document.createElement("span");
        name.textContent = prayerNames[key];

        const time = document.createElement("strong");
        time.textContent = timings[key];

        item.appendChild(name);
        item.appendChild(time);

        container.appendChild(item);
      });

    } catch (error) {
      container.textContent =
        "تعذر تحميل مواقيت الصلاة. حاول مرة أخرى.";
      console.error(error);
    }
  }

  window.loadPrayerTimes = loadPrayerTimes;

  document.addEventListener("DOMContentLoaded", function () {
    loadPrayerTimes();
  });

})();
container.innerHTML = "";
container.innerHTML = "";
const title = document.createElement("p");
title.textContent = "جميع المواقيت بتوقيت القاهرة - مصر 🇪🇬";
container.appendChild(title);
"&method=5";
const url =
  "https://api.aladhan.com/v1/timingsByCity?city=" +
  encodeURIComponent(city) +
  "&country=" +
  encodeURIComponent(country) +
  "&method=5&timezonestring=Africa/Cairo";
