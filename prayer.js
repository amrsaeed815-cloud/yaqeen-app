
(function () {
  "use strict";

  // =====================================
  // إعدادات تطبيق يقين
  // =====================================

  const METHOD = 5;
  const CACHE_KEY = "yaqeen_prayer_times_v2";
  const RETRY_INTERVAL = 60000;

const ADHAN_FILE = "./Beautiful_adhan.ogg";
  const ADHAN_ENABLED_KEY = "yaqeen_adhan_enabled";
  const ALERTS_KEY = "yaqeen_prayer_alerts";

  const CAIRO = {
    latitude: 30.0444,
    longitude: 31.2357,
    city: "القاهرة - مصر",
    timeZone: "Africa/Cairo"
  };

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

  // =====================================
  // حالة التطبيق
  // =====================================

  let location = null;
  let timeZone = "Africa/Cairo";

  let timings = {};
  let currentDate = "";

  let loading = false;
  let lastAttempt = 0;

  let countdownTimer = null;

  let nextDayFajr = null;
  let nextDayFajrPromise = null;

  let adhanEnabled = localStorage.getItem(ADHAN_ENABLED_KEY) !== "false";

  let adhanAudio = null;
  let alertStatus = null;

  // =====================================
  // أدوات التاريخ والتوقيت
  // =====================================

  function getDateParts(date, zone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);

    const result = {};

    parts.forEach(function (part) {
      if (part.type !== "literal") {
        result[part.type] = Number(part.value);
      }
    });

    return result;
  }

  function getToday() {
    const p = getDateParts(new Date(), timeZone);

    return (
      p.year + "-" +
      String(p.month).padStart(2, "0") + "-" +
      String(p.day).padStart(2, "0")
    );
  }

  function addDays(dateString, amount) {
    const parts = dateString.split("-").map(Number);

    const date = new Date(Date.UTC(
      parts[0],
      parts[1] - 1,
      parts[2] + amount
    ));

    return (
      date.getUTCFullYear() + "-" +
      String(date.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(date.getUTCDate()).padStart(2, "0")
    );
  }

  function apiDate(dateString) {
    const p = dateString.split("-");
    return p[2] + "-" + p[1] + "-" + p[0];
  }

  function localDateToUTC(dateString, timeString) {
    const match = String(timeString || "").match(
      /^(\d{1,2}):(\d{2})/
    );

    if (!match) {
      throw new Error("وقت الصلاة غير صالح");
    }

    const dateParts = dateString.split("-").map(Number);

    const target = Date.UTC(
      dateParts[0],
      dateParts[1] - 1,
      dateParts[2],
      Number(match[1]),
      Number(match[2])
    );

    let guess = target;

    for (let i = 0; i < 4; i++) {
      const p = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }).formatToParts(new Date(guess));

      const values = {};

      p.forEach(function (part) {
        if (part.type !== "literal") {
          values[part.type] = Number(part.value);
        }
      });

      const represented = Date.UTC(
        values.year,
        values.month - 1,
        values.day,
        values.hour,
        values.minute,
        values.second
      );

      guess += target - represented;
    }

    return new Date(guess);
  }

  // =====================================
  // تنسيق المواقيت
  // =====================================

  function formatTime(value) {
    if (!value) return "--:--";

    const match = String(value).match(
      /^(\d{1,2}):(\d{2})/
    );

    if (!match) return "--:--";

    const hour = Number(match[1]);
    const minute = match[2];

    return (
      String(hour % 12 || 12).padStart(2, "0") +
      ":" + minute +
      " " +
      (hour < 12 ? "صباحًا" : "مساءً")
    );
  }

  function validTimings(data) {
    return Object.keys(elements).every(function (name) {
      const value = data && data[name];

      if (typeof value !== "string") return false;

      const match = value.match(/^(\d{1,2}):(\d{2})/);

      if (!match) return false;

      return (
        Number(match[1]) <= 23 &&
        Number(match[2]) <= 59
      );
    });
  }

  // =====================================
  // عرض اسم المدينة
  // =====================================

  function updateCityName(name) {
    const cityElement = document.getElementById("city-name");
    const prayerCity = document.getElementById("prayer-city");

    if (cityElement) cityElement.textContent = name;
    if (prayerCity) prayerCity.textContent = name;
  }

  async function getCityName(lat, lon) {
    try {
      const url =
        "https://api.bigdatacloud.net/data/reverse-geocode-client" +
        "?latitude=" + lat +
        "&longitude=" + lon +
        "&localityLanguage=ar";

      const response = await fetch(url);

      if (!response.ok) throw new Error("Geocoding error");

      const data = await response.json();

      const city =
        data.city ||
        data.locality ||
        data.principalSubdivision;

      const country = data.countryName;

      if (city && country) {
        updateCityName(city + " - " + country);
      } else if (city) {
        updateCityName(city);
      }

    } catch (error) {
      console.warn("City name error:", error);
      updateCityName("موقعك الحالي");
    }
  }

  // =====================================
  // حفظ واسترجاع المواقيت
  // =====================================

  function saveCache() {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          date: currentDate,
          timings: timings,
          location: location,
          timeZone: timeZone
        })
      );
    } catch (error) {
      console.warn("Cache save error:", error);
    }
  }

  function loadCache() {
    try {
      const cached = JSON.parse(
        localStorage.getItem(CACHE_KEY)
      );

      if (
        !cached ||
        cached.date !== getToday() ||
        !validTimings(cached.timings) ||
        !cached.location
      ) {
        return false;
      }

      if (
        Math.abs(cached.location.latitude - location.latitude) > 0.01 ||
        Math.abs(cached.location.longitude - location.longitude) > 0.01
      ) {
        return false;
      }

      timings = cached.timings;
      currentDate = cached.date;

      updatePrayerCards();
      updateNextPrayer();

      return true;

    } catch (error) {
      console.warn("Cache loading error:", error);
      return false;
    }
  }

  // =====================================
  // جلب مواقيت الصلاة
  // =====================================

  async function fetchTimings(dateString) {
    const url =
      "https://api.aladhan.com/v1/timings/" +
      apiDate(dateString) +
      "?latitude=" + location.latitude +
      "&longitude=" + location.longitude +
      "&method=" + METHOD +
      "&timezonestring=" + encodeURIComponent(timeZone);

    const controller = new AbortController();

    const timeout = setTimeout(function () {
      controller.abort();
    }, 15000);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Prayer API error: " + response.status);
      }

      const result = await response.json();

      if (
        result.code !== 200 ||
        !result.data ||
        !validTimings(result.data.timings)
      ) {
        throw new Error("Invalid prayer data");
      }

      return result.data.timings;

    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadPrayerTimes() {
    if (loading || !location) return;

    loading = true;
    lastAttempt = Date.now();

    try {
      const today = getToday();

      const data = await fetchTimings(today);

      timings = data;
      currentDate = today;

      nextDayFajr = null;
      nextDayFajrPromise = null;

      saveCache();

      updatePrayerCards();
      await updateNextPrayer();

      console.log("تم تحميل مواقيت الصلاة بنجاح");

    } catch (error) {
      console.error("Prayer loading error:", error);

      if (
        !validTimings(timings) ||
        currentDate !== getToday()
      ) {
        if (!loadCache()) {
          updateCityName("تعذر تحميل المواقيت");
        }
      }

    } finally {
      loading = false;
    }
  }

  // =====================================
  // عرض مواقيت الصلوات الخمس
  // =====================================

  function updatePrayerCards() {
    Object.keys(elements).forEach(function (name) {
      const element = document.getElementById(elements[name]);

      if (element) {
        element.textContent = formatTime(timings[name]);
      }
    });
  }

  // =====================================
  // نظام الأذان والصوت
  // =====================================

  function initializeAdhan() {
    if (adhanAudio) return;

    adhanAudio = new Audio(ADHAN_FILE);
    adhanAudio.preload = "auto";

    adhanAudio.addEventListener("error", function () {
      console.error("تعذر تحميل ملف الأذان");
      showAlertStatus("تعذر تحميل ملف الأذان. راجع مسار الصوت.");
    });
  }

  function playAdhan() {
    if (!adhanEnabled) return;

    initializeAdhan();

    adhanAudio.currentTime = 0;

    const result = adhanAudio.play();

    if (result && typeof result.catch === "function") {
      result.catch(function (error) {
        console.warn("Adhan playback error:", error);
        showAlertStatus("المتصفح منع تشغيل الأذان. اضغط تجربة الأذان أولاً.");
      });
    }
  }

  function stopAdhan() {
    if (!adhanAudio) return;

    adhanAudio.pause();
    adhanAudio.currentTime = 0;

    showAlertStatus("تم إيقاف الأذان");
  }

  function testAdhan() {
    initializeAdhan();
    adhanEnabled = true;

    localStorage.setItem(ADHAN_ENABLED_KEY, "true");

    updateAdhanButton();

    stopAdhan();

    adhanAudio.play().then(function () {
      showAlertStatus("يتم الآن تشغيل الأذان التجريبي");
    }).catch(function (error) {
      console.error("Test adhan error:", error);
      showAlertStatus("تعذر تشغيل الصوت. تأكد من وجود الملف.");
    });
  }

  function toggleAdhan() {
    adhanEnabled = !adhanEnabled;

    localStorage.setItem(
      ADHAN_ENABLED_KEY,
      String(adhanEnabled)
    );

    updateAdhanButton();

    if (!adhanEnabled) {
      stopAdhan();
      showAlertStatus("تم إيقاف الأذان التلقائي");
    } else {
      showAlertStatus("تم تفعيل الأذان التلقائي");
    }
  }

  // =====================================
  // تنبيه قبل الصلاة بـ15 دقيقة
  // =====================================

  function getAlertHistory() {
    try {
      return JSON.parse(localStorage.getItem(ALERTS_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveAlertHistory(history) {
    try {
      localStorage.setItem(
        ALERTS_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.warn("Alert history error:", error);
    }
  }

  function speakPrePrayer(name, remainingMinutes) {
    const message =
      "اقتربت صلاة " + prayerNames[name] +
      "، باقي " + remainingMinutes + " دقيقة";

    showAlertStatus(message);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(message);

      speech.lang = "ar";
      speech.rate = 0.9;
      speech.pitch = 1;

      window.speechSynthesis.speak(speech);
    }
  }

  function showAlertStatus(message) {
    if (alertStatus) {
      alertStatus.textContent = message;
    }
  }

  function processPrayerAlerts() {
    if (!validTimings(timings) || !currentDate) return;

    const now = new Date();
    const today = getToday();

    const history = getAlertHistory();

    Object.keys(prayerNames).forEach(function (name) {
      const prayerTime = localDateToUTC(
        today,
        timings[name]
      );

      const alertTime = new Date(
        prayerTime.getTime() - 15 * 60 * 1000
      );

      const remaining = prayerTime.getTime() - now.getTime();

      const alertKey = today + "_" + name + "_before";
      const adhanKey = today + "_" + name + "_adhan";

      // تنبيه قبل الصلاة
      if (
        now >= alertTime &&
        now < prayerTime &&
        !history[alertKey]
      ) {
        const minutes = Math.max(
          1,
          Math.ceil(remaining / 60000)
        );

        history[alertKey] = true;
        saveAlertHistory(history);

        speakPrePrayer(name, minutes);
      }

      // الأذان عند دخول وقت الصلاة
      if (
        now >= prayerTime &&
        now.getTime() < prayerTime.getTime() + 60000 &&
        !history[adhanKey]
      ) {
        history[adhanKey] = true;
        saveAlertHistory(history);

        if (adhanEnabled) {
          showAlertStatus(
            "حان الآن وقت صلاة " + prayerNames[name]
          );

          playAdhan();
        }
      }
    });
  }

  // =====================================
  // أزرار الأذان في التطبيق
  // =====================================

  function createAdhanControls() {
    const prayerCard = document.querySelector(".prayer-card");

    if (!prayerCard) return;

    if (document.getElementById("yaqeen-adhan-controls")) {
      return;
    }

    const controls = document.createElement("div");

    controls.id = "yaqeen-adhan-controls";

    controls.style.cssText = `
      margin-top:20px;
      padding:15px;
      border-radius:14px;
      background:rgba(16,59,48,0.07);
      text-align:center;
    `;

    controls.innerHTML = `
      <h3 style="margin:0 0 12px;color:#103b30">
        🕌 إعدادات الأذان والتنبيهات
      </h3>

      <button id="yaqeen-adhan-toggle"
        style="padding:11px 15px;margin:5px;border:0;
        border-radius:9px;background:#103b30;color:white;
        cursor:pointer">
        تفعيل الأذان
      </button>

      <button id="yaqeen-adhan-test"
        style="padding:11px 15px;margin:5px;border:0;
        border-radius:9px;background:#b58b45;color:white;
        cursor:pointer">
        ▶ تجربة الأذان
      </button>

      <button id="yaqeen-adhan-stop"
        style="padding:11px 15px;margin:5px;border:0;
        border-radius:9px;background:#9b3333;color:white;
        cursor:pointer">
        ⏹ إيقاف الصوت
      </button>

      <p id="yaqeen-alert-status"
        style="margin:12px 0 0;font-size:14px;color:#103b30">
        تنبيهات الصلاة جاهزة
      </p>

      <p style="margin:8px 0 0;font-size:12px;color:#666">
        سيتم التنبيه قبل كل صلاة بـ15 دقيقة
      </p>
    `;

    prayerCard.appendChild(controls);

    alertStatus = document.getElementById(
      "yaqeen-alert-status"
    );

    document.getElementById(
      "yaqeen-adhan-toggle"
    ).addEventListener("click", toggleAdhan);

    document.getElementById(
      "yaqeen-adhan-test"
    ).addEventListener("click", testAdhan);

    document.getElementById(
      "yaqeen-adhan-stop"
    ).addEventListener("click", stopAdhan);

    updateAdhanButton();
  }

  function updateAdhanButton() {
    const button = document.getElementById(
      "yaqeen-adhan-toggle"
    );

    if (!button) return;

    button.textContent = adhanEnabled
      ? "إيقاف الأذان التلقائي"
      : "تفعيل الأذان";
  }

  // =====================================
  // الصلاة القادمة والعد التنازلي
  // =====================================

  async function updateNextPrayer() {
    if (!validTimings(timings) || !location) return;

    const now = new Date();
    const today = getToday();

    let nextName = null;
    let nextTime = null;

    for (const name of Object.keys(prayerNames)) {
      const date = localDateToUTC(today, timings[name]);

      if (date > now) {
        nextName = name;
        nextTime = date;
        break;
      }
    }

    if (!nextName) {
      try {
        const tomorrow = addDays(today, 1);

        if (!nextDayFajr) {
          if (!nextDayFajrPromise) {
            nextDayFajrPromise = fetchTimings(tomorrow)
              .then(function (data) {
                if (!data.Fajr) {
                  throw new Error("Tomorrow Fajr unavailable");
                }

                nextDayFajr = localDateToUTC(
                  tomorrow,
                  data.Fajr
                );

                return nextDayFajr;
              })
              .finally(function () {
                nextDayFajrPromise = null;
              });
          }

          await nextDayFajrPromise;
        }

        nextName = "Fajr";
        nextTime = nextDayFajr;

      } catch (error) {
        console.warn("Tomorrow Fajr error:", error);
        return;
      }
    }

    const nameElement = document.getElementById(
      "next-prayer-name"
    );

    const countdown = document.getElementById("countdown");

    if (nameElement) {
      nameElement.textContent = prayerNames[nextName];
    }

    if (countdown) {
      const difference = Math.max(
        0,
        nextTime.getTime() - now.getTime()
      );

      const hours = Math.floor(difference / 3600000);

      const minutes = Math.floor(
        (difference % 3600000) / 60000
      );

      const seconds = Math.floor(
        (difference % 60000) / 1000
      );

      countdown.textContent =
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
    }
  }

  // =====================================
  // تحديد موقع المستخدم
  // =====================================

  function useLocation(position) {
    location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };

    timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      CAIRO.timeZone;

    updateCityName("جاري تحديد المدينة...");

    getCityName(
      location.latitude,
      location.longitude
    );

    const hasCache = loadCache();

    if (!hasCache) {
      timings = {};
      currentDate = "";
    }

    loadPrayerTimes();
  }

  function useCairoFallback() {
    console.warn("Using Cairo fallback location");

    location = {
      latitude: CAIRO.latitude,
      longitude: CAIRO.longitude
    };

    timeZone = CAIRO.timeZone;

    updateCityName(CAIRO.city);

    const hasCache = loadCache();

    if (!hasCache) {
      timings = {};
      currentDate = "";
    }

    loadPrayerTimes();
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      useCairoFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      useLocation,

      function (error) {
        console.warn("Location error:", error.message);
        useCairoFallback();
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 600000
      }
    );
  }

  // =====================================
  // التحديث التلقائي والعد التنازلي
  // =====================================

  function startCountdown() {
    if (countdownTimer) return;

    countdownTimer = setInterval(function () {
      if (!location) return;

      if (
        currentDate &&
        currentDate !== getToday()
      ) {
        timings = {};
        currentDate = "";

        nextDayFajr = null;
        nextDayFajrPromise = null;

        loadPrayerTimes();
        return;
      }

      if (validTimings(timings)) {
        updateNextPrayer();
        processPrayerAlerts();
      }

      if (
        !loading &&
        Date.now() - lastAttempt >= RETRY_INTERVAL
      ) {
        loadPrayerTimes();
      }

    }, 1000);
  }

  // =====================================
  // التعامل مع العودة للصفحة
  // =====================================

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && location) {
      if (currentDate !== getToday()) {
        timings = {};
        currentDate = "";
        loadPrayerTimes();
      } else {
        updateNextPrayer();
        processPrayerAlerts();
      }
    }
  });

  window.addEventListener("online", function () {
    if (location) {
      loadPrayerTimes();
    }
  });

  // =====================================
  // تشغيل التطبيق
  // =====================================

  function init() {
    updateCityName("جاري تحديد موقعك...");

    createAdhanControls();
    initializeAdhan();

    startCountdown();

    detectLocation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
