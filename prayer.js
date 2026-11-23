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
  let tomorrowFajr = null;
  let tomorrowPrayerTimes = null;
  let currentAudio = null;
  let timer = null;
  let lastDate = "";
  let isLoading = false;

  // ==========================================
  // أدوات مساعدة
  // ==========================================

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? Math.max(min, Math.min(max, number))
      : fallback;
  }

  // ==========================================
  // الإعدادات الافتراضية
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

    if (!section) {
      console.warn("لم يتم العثور على قسم الصلاة #prayer");
      return;
    }

    if (document.getElementById("yaqeen-prayer-settings")) {
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

          <p>
            اسمح للتطبيق بإرسال تنبيهات الصلاة والإقامة.
          </p>

          <button
            type="button"
            id="enable-prayer-notifications">
            تفعيل إشعارات الصلاة
          </button>

          <button
            type="button"
            id="test-prayer-notification">
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
          alert("تعذر تحديد موقعك. اسمح بالوصول للموقع من إعدادات المتصفح.");
          return;
        }

        updateLocationLabel();
        await loadPrayerTimes();
      });

    document.getElementById("stop-prayer-audio")
      ?.addEventListener("click", stopAudio);

    document.getElementById("test-prayer-dua")
      ?.addEventListener("click", () => {
        playDua("Fajr", true);
      });

    document.getElementById("enable-prayer-notifications")
      ?.addEventListener("click", requestNotifications);

    document.getElementById("test-prayer-notification")
      ?.addEventListener("click", testNotification);

    updateNotificationStatus();
    updateLocationLabel();
  }

  function updateLocationLabel() {
    const element = document.getElementById(
      "prayer-location-name"
    );

    if (element) {
      element.textContent = locationData.city;
    }
  }
