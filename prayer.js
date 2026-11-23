
(function () {
  "use strict";

  // ==========================================
  // تطبيق يقين - نظام الصلاة والأذان
  // ==========================================

  const METHOD = 5;

  const CACHE_KEY = "yaqeen_prayer_times_v3";
  const SETTINGS_KEY = "yaqeen_prayer_settings_v1";
  const LOCATION_KEY = "yaqeen_prayer_location_v1";
  const ALERTS_KEY = "yaqeen_prayer_alerts_v1";

  const DEFAULT_LOCATION = {
    latitude: 30.0444,
    longitude: 31.2357,
    city: "القاهرة - مصر"
  };

  const AUDIO_BASE = new URL("./assets/audio/", document.baseURI).href;

  const PRAYERS = [
    { id: "Fajr", name: "الفجر", element: "fajr-time" },
    { id: "Dhuhr", name: "الظهر", element: "dhuhr-time" },
    { id: "Asr", name: "العصر", element: "asr-time" },
    { id: "Maghrib", name: "المغرب", element: "maghrib-time" },
    { id: "Isha", name: "العشاء", element: "isha-time" }
  ];

  const ADHANS = {
    rifaat: {
      name: "الشيخ محمد رفعت",
      file: "محمد رفعت.mp4"
    },
    naqshbandi: {
      name: "الشيخ النقشبندي",
      file: "اذان.mp4"
    }
  };

  const DUA_FILE = "الشعراوي.mp4";

  let locationData = loadLocation();
  let prayerTimes = null;
  let currentAudio = null;
  let timer = null;
  let isLoading = false;
let lastCheckedMinute = "";
let lastDate = todayKey();
let duaAfterAdhan = false;

  // ==========================================
  // أدوات مساعدة
  // ==========================================

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? Math.max(min, Math.min(max, number))
      : fallback;
  }

  function todayKey() {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function getPrayerDateTime(time) {
    if (!time) return null;

    const parts = String(time).split(":");
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }

    const date = new Date();

    date.setHours(hour, minute, 0, 0);

    return date;
  }

  function formatTime(time) {
    if (!time) return "--:--";

    const parts = String(time).split(":");
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return "--:--";
    }

    const date = new Date();

    date.setHours(hour, minute, 0, 0);

    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) element.textContent = value;
  }

  // ==========================================
  // الإعدادات
  // ==========================================

  function defaultSettings() {
    const result = {};

    PRAYERS.forEach(prayer => {
      result[prayer.id] = {
        adhanEnabled: true,
        adhanMode: "auto",
        adhanVoice: "rifaat",
        adhanVolume: 80,
        duaEnabled: true,
        duaVolume: 80,
        timeOffsetMinutes: 0,
        alertEnabled: true,
        iqamaEnabled: true,
        iqamaMinutes: 15
      };
    });

    return result;
  }

  function loadSettings() {
    const defaults = defaultSettings();

    try {
      const saved = JSON.parse(
        localStorage.getItem(SETTINGS_KEY) || "null"
      );

      if (!saved) return defaults;

      PRAYERS.forEach(prayer => {
        const old = saved[prayer.id] || {};

        defaults[prayer.id] = {
          ...defaults[prayer.id],
          ...old
        };

        const s = defaults[prayer.id];

        if (!["auto", "manual"].includes(s.adhanMode)) {
          s.adhanMode = "auto";
        }

        if (!ADHANS[s.adhanVoice]) {
          s.adhanVoice = "rifaat";
        }

        s.adhanVolume = clampNumber(s.adhanVolume, 0, 100, 80);
        s.duaVolume = clampNumber(s.duaVolume, 0, 100, 80);

        s.timeOffsetMinutes = clampNumber(
          s.timeOffsetMinutes, -60, 60, 0
        );

        s.iqamaMinutes = clampNumber(
          s.iqamaMinutes, 1, 180, 15
        );

        [
          "adhanEnabled",
          "duaEnabled",
          "alertEnabled",
          "iqamaEnabled"
        ].forEach(key => {
          s[key] = s[key] !== false;
        });
      });

      return defaults;
    } catch (error) {
      console.error("خطأ في إعدادات الصلاة:", error);
      return defaults;
    }
  }

  let settings = loadSettings();

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error("تعذر حفظ الإعدادات:", error);
    }
  }

  // ==========================================
  // الموقع
  // ==========================================

  function loadLocation() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(LOCATION_KEY) || "null"
      );

      if (
        saved &&
        Number.isFinite(Number(saved.latitude)) &&
        Number.isFinite(Number(saved.longitude))
      ) {
        return {
          latitude: Number(saved.latitude),
          longitude: Number(saved.longitude),
          city: saved.city || "الموقع المحفوظ"
        };
      }
    } catch (error) {
      console.error("خطأ في قراءة الموقع:", error);
    }

    return { ...DEFAULT_LOCATION };
  }

  function saveLocation() {
    try {
      localStorage.setItem(
        LOCATION_KEY,
        JSON.stringify(locationData)
      );
    } catch (error) {
      console.error("تعذر حفظ الموقع:", error);
    }
  }

  function getLocation() {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: "موقعك الحالي"
          };

          saveLocation();
          resolve(true);
        },
        () => resolve(false),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 3600000
        }
      );
    });
  }

  // ==========================================
  // واجهة إعدادات الصلاة
  // ==========================================

  function createPrayerInterface() {
    const section = document.getElementById("prayer");

    if (!section) return;

    if (document.getElementById("yaqeen-prayer-settings")) {
      renderPrayerCards();
      return;
    }

    section.insertAdjacentHTML("beforeend", `
      <div id="yaqeen-prayer-settings"
           class="yaqeen-prayer-settings">

        <div class="prayer-settings-header">
          <h2>🕌 إعدادات الصلاة والأذان</h2>
          <p>خصص إعدادات كل صلاة بالطريقة التي تناسبك</p>
        </div>

        <div class="prayer-location-box">
          <h3>📍 موقع مواقيت الصلاة</h3>
          <p id="prayer-location-name"></p>

          <button type="button" id="refresh-prayer-location">
            تحديث الموقع
          </button>
        </div>

        <div class="prayer-notification-box">
          <h3>🔔 إشعارات الصلاة</h3>

          <p>اسمح للتطبيق بإرسال تنبيهات الصلاة والإقامة.</p>

          <button type="button" id="enable-prayer-notifications">
            تفعيل إشعارات الصلاة
          </button>

          <button type="button" id="test-prayer-notification">
            تجربة الإشعارات
          </button>

          <p id="prayer-notification-status">
            حالة الإشعارات غير محددة
          </p>
        </div>

        <div class="prayer-cards"
             id="prayer-settings-cards"></div>

        <div class="prayer-audio-test">
          <button type="button" id="test-prayer-dua">
            ▶ تجربة دعاء الشيخ الشعراوي
          </button>

          <button type="button" id="stop-prayer-audio">
            إيقاف صوت الأذان والدعاء
          </button>

          <p id="prayer-audio-status">
            اختر صوت الأذان أو الدعاء وجربه
          </p>
        </div>

        <p class="prayer-save-message">
          يتم حفظ إعداداتك تلقائيًا على جهازك.
        </p>

      </div>
    `);

    renderPrayerCards();

    document.getElementById("refresh-prayer-location")
      ?.addEventListener("click", async event => {
        const button = event.currentTarget;

        button.disabled = true;
        button.textContent = "جارٍ تحديد الموقع...";

        const success = await getLocation();

        button.disabled = false;
        button.textContent = "تحديث الموقع";

        if (!success) {
          alert("تعذر تحديد موقعك. اسمح بالوصول للموقع من إعدادات الجهاز.");
          return;
        }

        updateLocationLabel();
        await loadPrayerTimes();
      });

    document.getElementById("stop-prayer-audio")
      ?.addEventListener("click", stopAudio);

    document.getElementById("test-prayer-dua")
      ?.addEventListener("click", () => playDua("Fajr", true));

    document.getElementById("enable-prayer-notifications")
      ?.addEventListener("click", requestNotifications);

    document.getElementById("test-prayer-notification")
      ?.addEventListener("click", testNotification);

    updateNotificationStatus();
    updateLocationLabel();
  }
function updateLocationLabel() {
  setText("prayer-location-name", locationData.city);
  setText("prayer-city", locationData.city);
  setText("city-name", locationData.city);
}

  // ==========================================
  // بطاقات إعدادات الصلوات
  // ==========================================

  function renderPrayerCards() {
    const container = document.getElementById(
      "prayer-settings-cards"
    );

    if (!container) return;

    container.innerHTML = PRAYERS.map(prayer => {
      const s = settings[prayer.id];

      return `
        <div class="prayer-setting-card"
             data-prayer="${prayer.id}">

          <h3>🕌 صلاة ${prayer.name}</h3>

          <label>
            <input type="checkbox"
                   data-setting="adhanEnabled"
                   ${s.adhanEnabled ? "checked" : ""}>
            تشغيل الأذان
          </label>

          <label>
            طريقة الأذان
            <select data-setting="adhanMode">
              <option value="auto"
                ${s.adhanMode === "auto" ? "selected" : ""}>
                تلقائي
              </option>
              <option value="manual"
                ${s.adhanMode === "manual" ? "selected" : ""}>
                يدوي
              </option>
            </select>
          </label>

          <label>
            صوت الأذان
            <select data-setting="adhanVoice">
              <option value="rifaat"
                ${s.adhanVoice === "rifaat" ? "selected" : ""}>
                الشيخ محمد رفعت
              </option>
              <option value="naqshbandi"
                ${s.adhanVoice === "naqshbandi" ? "selected" : ""}>
                الشيخ النقشبندي
              </option>
            </select>
          </label>

          <label>
            مستوى صوت الأذان: <span data-volume-label="adhanVolume">${s.adhanVolume}</span>%
            <input type="range"
                   min="0" max="100"
                   value="${s.adhanVolume}"
                   data-setting="adhanVolume">
          </label>

          <label>
            <input type="checkbox"
                   data-setting="alertEnabled"
                   ${s.alertEnabled ? "checked" : ""}>
            تنبيه قبل الصلاة بـ15 دقيقة
          </label>

          <label>
            <input type="checkbox"
                   data-setting="iqamaEnabled"
                   ${s.iqamaEnabled ? "checked" : ""}>
            تنبيه الإقامة
          </label>

          <label>
            مدة الإقامة بالدقائق
            <input type="number"
                   min="1" max="180"
                   value="${s.iqamaMinutes}"
                   data-setting="iqamaMinutes">
          </label>

          <label>
            <input type="checkbox"
                   data-setting="duaEnabled"
                   ${s.duaEnabled ? "checked" : ""}>
            تشغيل دعاء الشيخ الشعراوي بعد الأذان
          </label>

          <label>
            مستوى صوت الدعاء:
            <span data-volume-label="duaVolume">${s.duaVolume}</span>%
            <input type="range"
                   min="0" max="100"
                   value="${s.duaVolume}"
                   data-setting="duaVolume">
          </label>

          <label>
            تعديل وقت الصلاة بالدقائق
            <input type="number"
                   min="-60" max="60"
                   value="${s.timeOffsetMinutes}"
                   data-setting="timeOffsetMinutes">
          </label>

          <button type="button"
                  data-action="test-adhan">
            ▶ تجربة الأذان
          </button>

        </div>
      `;
    }).join("");

    container.querySelectorAll("[data-setting]").forEach(input => {
      input.addEventListener("change", handleSettingChange);
      input.addEventListener("input", handleSettingChange);
    });

    container.querySelectorAll('[data-action="test-adhan"]')
      .forEach(button => {
        button.addEventListener("click", event => {
          const card = event.currentTarget.closest("[data-prayer]");
          if (card) playAdhan(card.dataset.prayer, true);
        });
      });
  }

  function handleSettingChange(event) {
    const input = event.currentTarget;
    const card = input.closest("[data-prayer]");

    if (!card) return;

    const prayerId = card.dataset.prayer;
    const key = input.dataset.setting;

    if (!key || !settings[prayerId]) return;

    let value;

    if (input.type === "checkbox") {
      value = input.checked;
    } else if (input.type === "number" || input.type === "range") {
      value = Number(input.value);
    } else {
      value = input.value;
    }

    if (key === "adhanVolume" || key === "duaVolume") {
      value = clampNumber(value, 0, 100, 80);
    }

    if (key === "iqamaMinutes") {
      value = clampNumber(value, 1, 180, 15);
    }

    if (key === "timeOffsetMinutes") {
      value = clampNumber(value, -60, 60, 0);
    }

    settings[prayerId][key] = value;
    saveSettings();

    const label = card.querySelector(
      `[data-volume-label="${key}"]`
    );

    if (label) label.textContent = value;

    if (key === "timeOffsetMinutes") {
      renderPrayerTimes();
    }
  }

  // ==========================================
  // تحميل مواقيت الصلاة
  // ==========================================

  async function loadPrayerTimes() {
    if (isLoading) return;

    isLoading = true;

    try {
      const now = new Date();

      const date = [
        String(now.getDate()).padStart(2, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        now.getFullYear()
      ].join("-");

      const url =
        "https://api.aladhan.com/v1/timings/" +
        date +
        "?latitude=" + encodeURIComponent(locationData.latitude) +
        "&longitude=" + encodeURIComponent(locationData.longitude) +
        "&method=" + METHOD;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("تعذر الاتصال بخدمة مواقيت الصلاة");
      }

      const result = await response.json();

      if (!result.data || !result.data.timings) {
        throw new Error("بيانات المواقيت غير صحيحة");
      }

      prayerTimes = result.data.timings;

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          date: todayKey(),
          timings: prayerTimes
        })
      );

      renderPrayerTimes();

      setText("prayer-audio-status", "تم تحديث مواقيت الصلاة بنجاح");

    } catch (error) {
      console.error("خطأ تحميل المواقيت:", error);

      loadCachedPrayerTimes();

      setText(
        "prayer-audio-status",
        "تعذر تحديث المواقيت. جارٍ استخدام البيانات المحفوظة إن وجدت."
      );
    } finally {
      isLoading = false;
    }
  }

  function loadCachedPrayerTimes() {
    try {
      const cached = JSON.parse(
        localStorage.getItem(CACHE_KEY) || "null"
      );

      if (cached && cached.timings) {
        prayerTimes = cached.timings;
        renderPrayerTimes();
        return true;
      }
    } catch (error) {
      console.error("خطأ قراءة المواقيت المحفوظة:", error);
    }

    return false;
  }

  function getAdjustedTime(prayerId) {
    if (!prayerTimes || !prayerTimes[prayerId]) return null;

    const original = String(prayerTimes[prayerId]).split(" ")[0];
    const date = getPrayerDateTime(original);

    if (!date) return null;

    date.setMinutes(
      date.getMinutes() + settings[prayerId].timeOffsetMinutes
    );

    return (
      String(date.getHours()).padStart(2, "0") +
      ":" +
      String(date.getMinutes()).padStart(2, "0")
    );
  }

  function renderPrayerTimes() {
    if (!prayerTimes) return;

    PRAYERS.forEach(prayer => {
      const time = getAdjustedTime(prayer.id);
      const element = document.getElementById(prayer.element);

      if (element && time) {
        element.textContent = formatTime(time);
      }
    });

    updateNextPrayer();
  }

  // ==========================================
  // الصلاة القادمة
  // ==========================================

  function updateNextPrayer() {
    if (!prayerTimes) return;

    const now = new Date();
    let next = null;

    for (const prayer of PRAYERS) {
      const time = getAdjustedTime(prayer.id);
      const date = getPrayerDateTime(time);

      if (date && date > now) {
        next = { ...prayer, date, time };
        break;
      }
    }

    if (!next) {
      setText("next-prayer-name", "الفجر");
      setText("next-prayer-time", "غدًا");
      return;
    }

    setText("next-prayer-name", next.name);
    setText("next-prayer-time", formatTime(next.time));

    const remaining = Math.max(0, next.date.getTime() - now.getTime());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    setText(
      "next-prayer-countdown",
      `${hours} ساعة و ${minutes} دقيقة`
    );
  }

  // ==========================================
  // الصوت
  // ==========================================

  function stopAudio() {
    duaAfterAdhan = false;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    setText("prayer-audio-status", "تم إيقاف الصوت");
  }

  function playAudio(file, volume, label, onEnded) {
    stopAudio();

    const audio = new Audio(
      AUDIO_BASE + encodeURIComponent(file)
    );

    audio.volume = clampNumber(volume, 0, 100, 80) / 100;
    audio.preload = "auto";

    currentAudio = audio;

    audio.addEventListener("ended", () => {
      if (currentAudio === audio) currentAudio = null;

      if (typeof onEnded === "function") {
        onEnded();
      }
    });

    audio.addEventListener("error", () => {
      if (currentAudio === audio) currentAudio = null;

      setText(
        "prayer-audio-status",
        "تعذر تشغيل الملف الصوتي. تأكد من وجود الملف داخل assets/audio."
      );
    });

    setText("prayer-audio-status", "جارٍ تشغيل " + label);

    audio.play().catch(error => {
      console.error("خطأ تشغيل الصوت:", error);

      setText(
        "prayer-audio-status",
        "تعذر التشغيل. اضغط زر تجربة الصوت أولًا للسماح بتشغيل الصوت."
      );
    });
  }

  function playAdhan(prayerId, testMode) {
    const s = settings[prayerId];

    if (!s || (!s.adhanEnabled && !testMode)) return;

    const voice = ADHANS[s.adhanVoice] || ADHANS.rifaat;

    const shouldPlayDua = !testMode && s.duaEnabled;

    playAudio(
      voice.file,
      s.adhanVolume,
      "أذان " + voice.name,
      shouldPlayDua
        ? () => playDua(prayerId, false)
        : null
    );
  }

  function playDua(prayerId, testMode) {
    const s = settings[prayerId];

    if (!s || (!s.duaEnabled && !testMode)) return;

    playAudio(
      DUA_FILE,
      s.duaVolume,
      "دعاء الشيخ الشعراوي"
    );
  }

  // ==========================================
  // الإشعارات
  // ==========================================

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setText(
        "prayer-notification-status",
        "هذا الجهاز لا يدعم إشعارات المتصفح."
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      updateNotificationStatus();

      if (permission === "granted") {
        showNotification("يقين", "تم تفعيل إشعارات الصلاة بنجاح");
      }
    } catch (error) {
      console.error("خطأ طلب الإشعارات:", error);
    }
  }

  function updateNotificationStatus() {
    let status = "الإشعارات غير مدعومة";

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        status = "الإشعارات مفعلة";
      } else if (Notification.permission === "denied") {
        status = "الإشعارات محظورة من إعدادات الجهاز";
      } else {
        status = "لم يتم تفعيل الإشعارات بعد";
      }
    }

    setText("prayer-notification-status", status);
  }

  function showNotification(title, body) {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    try {
      new Notification(title, {
        body,
        icon: "./assets/icon-512 (1).png",
        badge: "./assets/icon-512 (1).png",
        dir: "rtl",
        lang: "ar"
      });
    } catch (error) {
      console.error("تعذر عرض الإشعار:", error);
    }
  }

  function testNotification() {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      requestNotifications();
      return;
    }

    showNotification(
      "تجربة إشعارات يقين",
      "الإشعارات تعمل بنجاح بإذن الله"
    );
  }

  // ==========================================
  // منع تكرار التنبيهات
  // ==========================================

  function loadAlertHistory() {
    try {
      return JSON.parse(
        localStorage.getItem(ALERTS_KEY) || "{}"
      );
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
      console.error("تعذر حفظ سجل التنبيهات:", error);
    }
  }

  function sendOnce(key, title, body) {
    const history = loadAlertHistory();

    if (history[key]) return;

    history[key] = true;
    saveAlertHistory(history);

    showNotification(title, body);
  }

  // ==========================================
  // متابعة مواقيت الصلاة والتنبيهات
  // ==========================================

  function checkPrayerEvents() {
    if (!prayerTimes) return;

    const now = new Date();

    const dateKey = todayKey();

    const currentMinute =
      dateKey + "-" +
      String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0");

    if (lastCheckedMinute === currentMinute) return;

    lastCheckedMinute = currentMinute;

    PRAYERS.forEach(prayer => {
      const s = settings[prayer.id];
      const time = getAdjustedTime(prayer.id);
      const prayerDate = getPrayerDateTime(time);

      if (!prayerDate) return;

      const prayerKey = dateKey + "-" + prayer.id;

      const difference = Math.round(
        (prayerDate.getTime() - now.getTime()) / 60000
      );

      // تنبيه قبل الصلاة بـ 15 دقيقة
      if (difference === 15 && s.alertEnabled) {
        sendOnce(
          prayerKey + "-before",
          "اقترب موعد صلاة " + prayer.name,
          "متبقي 15 دقيقة على صلاة " + prayer.name
        );
      }

      // موعد الصلاة
      if (difference === 0) {
        sendOnce(
          prayerKey + "-adhan",
          "حان الآن موعد صلاة " + prayer.name,
          "حي على الصلاة"
        );

        if (s.adhanEnabled && s.adhanMode === "auto") {
          playAdhan(prayer.id, false);
        }

        // جدولة تنبيه الإقامة
        if (s.iqamaEnabled) {
          scheduleIqamaNotification(prayer, s, prayerKey);
        }
      }
    });
  }

  function scheduleIqamaNotification(prayer, settingsForPrayer, prayerKey) {
    const delay = settingsForPrayer.iqamaMinutes * 60000;

    window.setTimeout(() => {
      sendOnce(
        prayerKey + "-iqama",
        "موعد الإقامة",
        "حان موعد إقامة صلاة " + prayer.name
      );
    }, delay);
  }

  // ==========================================
  // تحديث اليوم
  // ==========================================

  function startPrayerTimer() {
    if (timer) clearInterval(timer);

    timer = setInterval(() => {
      if (todayKey() !== lastDate) {
        lastDate = todayKey();
        loadPrayerTimes();
      }

      checkPrayerEvents();
      updateNextPrayer();
    }, 1000);
  }

  // ==========================================
  // الربط مع نظام الأذان في Android
  // ==========================================

  function getNativePrayerPlugin() {
    return window.Capacitor?.Plugins?.YaqeenPrayer || null;
  }

  // ==========================================
  // بدء النظام
  // ==========================================

  async function initPrayerSystem() {
    createPrayerInterface();

    lastDate = todayKey();

    const hasCache = loadCachedPrayerTimes();

    if (!hasCache) {
      await loadPrayerTimes();
    } else {
      loadPrayerTimes();
    }

    updateLocationLabel();
    updateNotificationStatus();

    startPrayerTimer();

    // تنبيه: هذا المؤقت يعمل أثناء تشغيل صفحة التطبيق فقط.
    // التشغيل بعد إغلاق التطبيق يحتاج جدولة أصلية في Android.
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initPrayerSystem,
      { once: true }
    );
  } else {
    initPrayerSystem();
  }

})();
