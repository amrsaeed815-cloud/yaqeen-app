
(function () {
  "use strict";

  const TIME_ZONE = "Africa/Cairo";
  const CITY = "Cairo";
  const COUNTRY = "Egypt";
  const METHOD = 5;

  const CACHE_KEY = "yaqeen_prayer_times";
  const RETRY_INTERVAL = 60000;

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
  let currentDate = "";
  let loading = false;
  let lastAttempt = 0;
  let countdownTimer = null;

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

  // تحويل الوقت إلى نظام 12 ساعة
  function formatTime(time) {
    if (!time) return "--:--";

    const match = String(time).match(/(\d{1,2}):(\d{2})/);

    if (!match) return "--:--";

    const hour = Number(match[1]);
    const minute = match[2];

    const displayHour = hour % 12 || 12;
    const period = hour < 12 ? "صباحًا" : "مساءً";

    return (
      String(displayHour).padStart(2, "0") +
      ":" +
      minute +
      " " +
      period
    );
  }

  // التحقق من صحة مواقيت الصلاة الأصلية القادمة من API
  function isValidTimings(timings) {
    return Object.keys(elements).every(function (prayer) {
      const time = timings && timings[prayer];

      if (typeof time !== "string") return false;

      const match = time.match(/^(\d{1,2}):(\d{2})/);

      if (!match) return false;

      return Number(match[1]) <= 23 &&
        Number(match[2]) <= 59;
    });
  }

  // تحويل وقت القاهرة إلى توقيت الجهاز
  function cairoTimeToDate(year, month, day, hour, minute) {
    const target = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0
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

  // حساب موعد الصلاة من الوقت الأصلي دون استخدام formatTime
  function getPrayerDate(time, dayOffset) {
    const p = getCairoParts(new Date());

    const date = new Date(
      Date.UTC(
        p.year,
        p.month - 1,
        p.day + dayOffset
      )
    );

    const match = String(time).match(/(\d{1,2}):(\d{2})/);

    if (!match) return new Date(NaN);

    return cairoTimeToDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      Number(match[1]),
      Number(match[2])
    );
  }

  function updateCityName(name) {
    const cityName = document.getElementById("city-name");
    const prayerCity = document.getElementById("prayer-city");

    if (cityName) cityName.textContent = name;
    if (prayerCity) prayerCity.textContent = name;
  }

  // عرض مواقيت الصلاة
  function updatePrayerCards() {
    Object.keys(elements).forEach(function (prayer) {
      const element = document.getElementById(elements[prayer]);

      if (element) {
        element.textContent = formatTime(prayerTimes[prayer]);
      }
    });

    updateCityName("القاهرة - مصر");
  }

  // حفظ المواقيت
  function saveCache() {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          date: currentDate,
          timings: prayerTimes
        })
      );
    } catch (error) {
      console.warn("Prayer cache save error:", error);
    }
  }

  // تحميل المواقيت المحفوظة
  function loadCache() {
    try {
      const cached = JSON.parse(
        localStorage.getItem(CACHE_KEY)
      );

      if (
        cached &&
        cached.date === getToday() &&
        isValidTimings(cached.timings)
      ) {
        prayerTimes = cached.timings;
        currentDate = cached.date;

        updatePrayerCards();
        updateNextPrayer();

        return true;
      }
    } catch (error) {
      console.warn("Prayer cache error:", error);
    }

    return false;
  }

  // تحميل مواقيت الصلاة من API
  async function loadPrayerTimes() {
    if (loading) return;

    loading = true;
    lastAttempt = Date.now();

    const controller = new AbortController();

    const timeout = setTimeout(function () {
      controller.abort();
    }, 15000);

    try {
      const url =
        "https://api.aladhan.com/v1/timingsByCity/" +
        getApiDate() +
        "?city=" + encodeURIComponent(CITY) +
        "&country=" + encodeURIComponent(COUNTRY) +
        "&method=" + METHOD;

      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("HTTP error: " + response.status);
      }

      const result = await response.json();

      if (
        result.code !== 200 ||
        !result.data ||
        !isValidTimings(result.data.timings)
      ) {
        throw new Error("Invalid prayer times response");
      }

      prayerTimes = result.data.timings;
      currentDate = getToday();

      saveCache();

      updatePrayerCards();
      updateNextPrayer();

      console.log("تم تحميل مواقيت الصلاة بنجاح.");

    } catch (error) {
      console.error("Prayer times error:", error);

      if (
        !prayerTimes.Fajr ||
        currentDate !== getToday()
      ) {
        prayerTimes = {};
        loadCache();
      }

      if (!prayerTimes.Fajr) {
        updateCityName("تعذر تحميل المواقيت");
      }

    } finally {
      clearTimeout(timeout);
      loading = false;
    }
  }

  // تحديد الصلاة القادمة وحساب العد التنازلي
  function updateNextPrayer() {
    if (!isValidTimings(prayerTimes)) return;

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
        prayerTimes[prayer],
        0
      );

      if (prayerDate > now) {
        nextPrayer = prayer;
        nextTime = prayerDate;
        break;
      }
    }

    // لو انتهت صلوات اليوم، الصلاة القادمة هي فجر الغد
    if (!nextPrayer) {
      nextPrayer = "Fajr";

      nextTime = getPrayerDate(
        prayerTimes.Fajr,
        1
      );
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
        0,
        nextTime.getTime() - now.getTime()
      );

      const hours = Math.floor(
        difference / 3600000
      );

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

  // تشغيل العد التنازلي والتحديث التلقائي
  function startCountdown() {
    if (countdownTimer) return;

    countdownTimer = setInterval(function () {
      if (currentDate && currentDate !== getToday()) {
        prayerTimes = {};
        currentDate = "";
        loadPrayerTimes();
        return;
      }

      updateNextPrayer();

      if (
        !loading &&
        Date.now() - lastAttempt >= RETRY_INTERVAL
      ) {
        loadPrayerTimes();
      }
    }, 1000);
  }

  // بدء تشغيل الملف
  function init() {
    loadCache();
    startCountdown();
    loadPrayerTimes();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
