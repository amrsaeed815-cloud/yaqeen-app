
(function () {
  "use strict";

  const TIME_ZONE = "Africa/Cairo";
  const CITY = "Cairo";
  const COUNTRY = "Egypt";

  const prayerNames = {
    Fajr: "الفجر",
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

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  let prayerTimes = {};
  let countdownTimer = null;
  let currentDate = "";
  let loading = false;
  let lastAttempt = 0;

  function getCairoParts(date) {
    const result = {};

    formatter.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") {
        result[part.type] = Number(part.value);
      }
    });

    return result;
  }

  function getToday() {
    const p = getCairoParts(new Date());

    return [
      p.year,
      String(p.month).padStart(2, "0"),
      String(p.day).padStart(2, "0")
    ].join("-");
  }

  function getApiDate() {
    const p = getCairoParts(new Date());

    return [
      String(p.day).padStart(2, "0"),
      String(p.month).padStart(2, "0"),
      p.year
    ].join("-");
  }

  function formatTime(time) {
    if (!time) return "--:--";

    const match = String(time).match(/(\d{1,2}):(\d{2})/);

    if (!match) return "--:--";

    return (
      String(Number(match[1])).padStart(2, "0") +
      ":" + match[2]
    );
  }

  function cairoTimeToDate(year, month, day, hour, minute) {
    const target = Date.UTC(
      year, month - 1, day, hour, minute, 0
    );

    let guess = target;

    for (let i = 0; i < 3; i++) {
      const p = getCairoParts(new Date(guess));

      const cairoAsUTC = Date.UTC(
        p.year,
        p.month - 1,
        p.day,
        p.hour,
        p.minute,
        p.second
      );

      guess += target - cairoAsUTC;
    }

    return new Date(guess);
  }

  function getPrayerDate(time, dayOffset) {
    const p = getCairoParts(new Date());

    const date = new Date(
      Date.UTC(p.year, p.month - 1, p.day + dayOffset)
    );

    const parts = formatTime(time).split(":");

    return cairoTimeToDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      Number(parts[0]),
      Number(parts[1])
    );
  }

  function updateCityName(name) {
    const cityName = document.getElementById("city-name");
    const prayerCity = document.getElementById("prayer-city");

    if (cityName) cityName.textContent = name;
    if (prayerCity) prayerCity.textContent = name;
  }

  function updatePrayerCards() {
    Object.keys(elements).forEach(function (prayer) {
      const element = document.getElementById(elements[prayer]);

      if (element) {
        element.textContent = formatTime(prayerTimes[prayer]);
      }
    });

    updateCityName("القاهرة - مصر");
  }

  async function loadPrayerTimes() {
    if (loading) return;

    loading = true;
    lastAttempt = Date.now();

    try {
      const date = getApiDate();

      const url =
        "https://api.aladhan.com/v1/timingsByCity/" +
        date +
        "?city=" + encodeURIComponent(CITY) +
        "&country=" + encodeURIComponent(COUNTRY) +
        "&method=5";

      const response = await fetch(url, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Network error: " + response.status);
      }

      const result = await response.json();

      if (
        result.code !== 200 ||
        !result.data ||
        !result.data.timings
      ) {
        throw new Error("Prayer times unavailable");
      }

      const timings = result.data.timings;

      for (const prayer of Object.keys(elements)) {
        if (!timings[prayer]) {
          throw new Error("Missing prayer time: " + prayer);
        }
      }

      prayerTimes = timings;
      currentDate = getToday();

      updatePrayerCards();
      updateNextPrayer();

      console.log("Prayer times loaded successfully.");

    } catch (error) {
      console.error("Prayer times error:", error);

      updateCityName("تعذر تحميل المواقيت");

    } finally {
      loading = false;
    }

    if (!countdownTimer) {
      countdownTimer = setInterval(function () {
        if (
          currentDate !== getToday() ||
          (
            Object.keys(prayerTimes).length === 0 &&
            Date.now() - lastAttempt >= 60000
          )
        ) {
          loadPrayerTimes();
        } else {
          updateNextPrayer();
        }
      }, 1000);
    }
  }

  function updateNextPrayer() {
    if (!prayerTimes.Fajr) return;

    const now = new Date();

    const prayers = [
      "Fajr",
      "Dhuhr",
      "Asr",
      "Maghrib",
      "Isha"
    ];

    let nextPrayer = null;
    let nextTime = null;

    for (const prayer of prayers) {
      const prayerDate = getPrayerDate(
        prayerTimes[prayer], 0
      );

      if (prayerDate > now) {
        nextPrayer = prayer;
        nextTime = prayerDate;
        break;
      }
    }

    if (!nextPrayer) {
      nextPrayer = "Fajr";
      nextTime = getPrayerDate(prayerTimes.Fajr, 1);
    }

    const nameElement =
      document.getElementById("next-prayer-name");

    const countdownElement =
      document.getElementById("countdown");

    if (nameElement) {
      nameElement.textContent = prayerNames[nextPrayer];
    }

    if (countdownElement) {
      const difference = Math.max(
        0, nextTime.getTime() - now.getTime()
      );

      const hours = Math.floor(difference / 3600000);
      const minutes = Math.floor(
        (difference % 3600000) / 60000
      );
      const seconds = Math.floor(
        (difference % 60000) / 1000
      );

      countdownElement.textContent =
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
    }
  }

  function init() {
    loadPrayerTimes();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
