
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

  const elements = {
    Fajr: "fajr-time",
    Dhuhr: "dhuhr-time",
    Asr: "asr-time",
    Maghrib: "maghrib-time",
    Isha: "isha-time"
  };

  let prayerTimes = {};
  let countdownTimer = null;
  let currentDate = "";

  function formatTime(time) {
    if (!time) return "--:--";

    const cleanTime = time.split(" ")[0];
    const parts = cleanTime.split(":");

    return parts[0] + ":" + parts[1];
  }

  function getToday() {
    const now = new Date();
    return [
      now.getDate(),
      now.getMonth() + 1,
      now.getFullYear()
    ].join("-");
  }

  async function loadPrayerTimes() {
    const city = "Cairo";
    const country = "Egypt";

    try {
      const response = await fetch(
        "https://api.aladhan.com/v1/timingsByCity/" +
        encodeURIComponent(getToday()) +
        "?city=" + city +
        "&country=" + country +
        "&method=5"
      );

      if (!response.ok) throw new Error("Network error");

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error("Prayer times unavailable");
      }

      prayerTimes = result.data.timings;

      Object.keys(elements).forEach(function (prayer) {
        const element = document.getElementById(elements[prayer]);

        if (element) {
          element.textContent = formatTime(prayerTimes[prayer]);
        }
      });

      const cityName = document.getElementById("city-name");
      const prayerCity = document.getElementById("prayer-city");

      if (cityName) cityName.textContent = "القاهرة - مصر";
      if (prayerCity) prayerCity.textContent = "القاهرة - مصر";

      currentDate = getToday();
      updateNextPrayer();

      if (countdownTimer) clearInterval(countdownTimer);

      countdownTimer = setInterval(function () {
        if (currentDate !== getToday()) {
          loadPrayerTimes();
        } else {
          updateNextPrayer();
        }
      }, 1000);

    } catch (error) {
      console.error("Prayer times error:", error);

      const cityName = document.getElementById("city-name");
      if (cityName) cityName.textContent = "تعذر تحميل المواقيت";
    }
  }

  function updateNextPrayer() {
    if (!prayerTimes.Fajr) return;

    const now = new Date();
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    let nextPrayer = null;
    let nextTime = null;

    for (const prayer of prayers) {
      const parts = formatTime(prayerTimes[prayer]).split(":");

      const prayerDate = new Date();
      prayerDate.setHours(
        Number(parts[0]),
        Number(parts[1]),
        0,
        0
      );

      if (prayerDate > now) {
        nextPrayer = prayer;
        nextTime = prayerDate;
        break;
      }
    }

    if (!nextPrayer) {
      nextPrayer = "Fajr";
      nextTime = new Date();
      nextTime.setDate(nextTime.getDate() + 1);

      const parts = formatTime(prayerTimes.Fajr).split(":");
      nextTime.setHours(
        Number(parts[0]),
        Number(parts[1]),
        0,
        0
      );
    }

    const nameElement = document.getElementById("next-prayer-name");
    const countdownElement = document.getElementById("countdown");

    if (nameElement) {
      nameElement.textContent = prayerNames[nextPrayer];
    }

    if (countdownElement) {
      const difference = Math.max(0, nextTime - now);

      const hours = Math.floor(difference / 3600000);
      const minutes = Math.floor((difference % 3600000) / 60000);
      const seconds = Math.floor((difference % 60000) / 1000);

      countdownElement.textContent =
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
    }
  }

  document.addEventListener("DOMContentLoaded", loadPrayerTimes);

})();
