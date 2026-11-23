
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

  // ==========================================
  // الإشعارات
  // ==========================================

  async function requestNotifications() {
    if (!("Notification" in window)) {
      alert("المتصفح لا يدعم إشعارات النظام.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      updateNotificationStatus();

      if (permission === "granted") {
        sendNotification(
          "تطبيق يقين 🕌",
          "تم تفعيل إشعارات الصلاة بنجاح."
        );
      } else {
        alert("لم يتم السماح بالإشعارات. يمكنك تفعيلها من إعدادات المتصفح.");
      }

    } catch (error) {
      console.error("خطأ في تفعيل الإشعارات:", error);
    }
  }

  function updateNotificationStatus() {
    const element = document.getElementById(
      "prayer-notification-status"
    );

    if (!element) return;

    if (!("Notification" in window)) {
      element.textContent = "المتصفح لا يدعم الإشعارات.";
      return;
    }

    const permission = Notification.permission;

    if (permission === "granted") {
      element.textContent = "الإشعارات مفعلة ✓";
    } else if (permission === "denied") {
      element.textContent = "الإشعارات محظورة. اسمح بها من إعدادات المتصفح.";
    } else {
      element.textContent = "يمكنك تفعيل الإشعارات من الزر أعلاه.";
    }
  }

  function sendNotification(title, body) {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: "./favicon.ico",
        tag: "yaqeen-prayer"
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.error("تعذر إرسال الإشعار:", error);
    }
  }

  function testNotification() {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      alert("فعّل الإشعارات أولًا.");
      return;
    }

    sendNotification(
      "تجربة تطبيق يقين 🕌",
      "الإشعارات تعمل بنجاح."
    );
  }

  // ==========================================
  // بطاقات الصلاة
  // ==========================================

  function renderPrayerCards() {
    const container = document.getElementById(
      "prayer-settings-cards"
    );

    if (!container) return;

    container.innerHTML = PRAYERS.map(prayer => {
      const s = settings[prayer.id];

      return `
        <div class="prayer-setting-card">

          <h3>🕌 ${prayer.name}</h3>

          <label>
            <input type="checkbox"
              data-prayer="${prayer.id}"
              data-setting="adhanEnabled"
              ${s.adhanEnabled ? "checked" : ""}>
            تفعيل الأذان
          </label>

          <label for="mode-${prayer.id}">
            طريقة تشغيل الأذان
          </label>

          <select id="mode-${prayer.id}"
            data-prayer="${prayer.id}"
            data-setting="adhanMode">

            <option value="auto"
              ${s.adhanMode === "auto" ? "selected" : ""}>
              تلقائي
            </option>

            <option value="manual"
              ${s.adhanMode === "manual" ? "selected" : ""}>
              يدوي
            </option>
          </select>

          <label>
            <input type="checkbox"
              data-prayer="${prayer.id}"
              data-setting="alertEnabled"
              ${s.alertEnabled ? "checked" : ""}>
            تنبيه قبل الصلاة بـ15 دقيقة
          </label>

          <label>
            <input type="checkbox"
              data-prayer="${prayer.id}"
              data-setting="iqamaEnabled"
              ${s.iqamaEnabled ? "checked" : ""}>
            تفعيل تنبيه الإقامة
          </label>

          <label for="iqama-${prayer.id}">
            مدة الإقامة بعد الأذان
          </label>

          <select id="iqama-${prayer.id}"
            data-prayer="${prayer.id}"
            data-setting="iqamaMinutes">

            ${[5, 10, 15, 20, 25, 30, 35, 40, 45, 60]
              .map(value => `
                <option value="${value}"
                  ${s.iqamaMinutes === value ? "selected" : ""}>
                  ${value} دقيقة
                </option>
              `).join("")}
          </select>

          <label for="voice-${prayer.id}">
            صوت المؤذن
          </label>

          <select id="voice-${prayer.id}"
            data-prayer="${prayer.id}"
            data-setting="adhanVoice">

            <option value="rifaat"
              ${s.adhanVoice === "rifaat" ? "selected" : ""}>
              الشيخ محمد رفعت
            </option>

            <option value="naqshbandi"
              ${s.adhanVoice === "naqshbandi" ? "selected" : ""}>
              الشيخ النقشبندي
            </option>
          </select>

          <label for="volume-${prayer.id}">
            مستوى صوت الأذان:
            <strong id="volume-value-${prayer.id}">
              ${s.adhanVolume}%
            </strong>
          </label>

          <input type="range"
            id="volume-${prayer.id}"
            min="0" max="100"
            value="${s.adhanVolume}"
            data-prayer="${prayer.id}"
            data-setting="adhanVolume">

          <label>
            <input type="checkbox"
              data-prayer="${prayer.id}"
              data-setting="duaEnabled"
              ${s.duaEnabled ? "checked" : ""}>
            تشغيل دعاء الشيخ الشعراوي بعد الأذان
          </label>

          <label for="dua-volume-${prayer.id}">
            مستوى صوت الدعاء:
            <strong id="dua-volume-value-${prayer.id}">
              ${s.duaVolume}%
            </strong>
          </label>

          <input type="range"
            id="dua-volume-${prayer.id}"
            min="0" max="100"
            value="${s.duaVolume}"
            data-prayer="${prayer.id}"
            data-setting="duaVolume">

          <label for="offset-${prayer.id}">
            تصحيح وقت الصلاة بالدقائق
          </label>

          <input type="number"
            id="offset-${prayer.id}"
            min="-60" max="60"
            step="1"
            value="${s.timeOffsetMinutes}"
            data-prayer="${prayer.id}"
            data-setting="timeOffsetMinutes">

          <button type="button"
            data-test-prayer="${prayer.id}">
            ▶ تجربة الأذان
          </button>

          <button type="button"
            data-test-dua="${prayer.id}">
            ▶ تجربة الدعاء
          </button>

        </div>
      `;
    }).join("");

    container.querySelectorAll("[data-setting]")
      .forEach(control => {

        const saveControl = () => {
          const prayerId = control.dataset.prayer;
          const setting = control.dataset.setting;

          let value;

          if (control.type === "checkbox") {
            value = control.checked;

          } else if ([
            "iqamaMinutes",
            "adhanVolume",
            "duaVolume",
            "timeOffsetMinutes"
          ].includes(setting)) {

            if (control.value.trim() === "") return;

            value = Number(control.value);

            if (!Number.isFinite(value)) return;

            if (setting === "adhanVolume" || setting === "duaVolume") {
              value = clampNumber(value, 0, 100, 80);
            }

            if (setting === "timeOffsetMinutes") {
              value = clampNumber(value, -60, 60, 0);
            }

            if (setting === "iqamaMinutes") {
              value = clampNumber(value, 1, 180, 15);
            }

          } else {
            value = control.value;
          }

          settings[prayerId][setting] = value;

          if (
            setting === "adhanVolume" ||
            setting === "duaVolume"
          ) {
            const prefix = setting === "adhanVolume"
              ? "volume-value-"
              : "dua-volume-value-";

            const output = document.getElementById(
              prefix + prayerId
            );

            if (output) {
              output.textContent = value + "%";
            }

            if (
              currentAudio &&
              currentAudio.dataset.prayer === prayerId
            ) {
              if (setting === "adhanVolume" &&
                  currentAudio.dataset.type === "adhan") {
                currentAudio.volume = value / 100;
              }

              if (setting === "duaVolume" &&
                  currentAudio.dataset.type === "dua") {
                currentAudio.volume = value / 100;
              }
            }
          }

          saveSettings();

          if (
            setting === "timeOffsetMinutes" &&
            prayerTimes
          ) {
            displayPrayerTimes();
            updateNextPrayer();
          }
        };

        control.addEventListener("change", saveControl);

        if (control.type === "range") {
          control.addEventListener("input", saveControl);
        }
      });

    container.querySelectorAll("[data-test-prayer]")
      .forEach(button => {
        button.addEventListener("click", () => {
          playAdhan(button.dataset.testPrayer, true);
        });
      });

    container.querySelectorAll("[data-test-dua]")
      .forEach(button => {
        button.addEventListener("click", () => {
          playDua(button.dataset.testDua, true);
        });
      });
  }

  // ==========================================
  // التاريخ والوقت
  // ==========================================

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getApiDate(date = new Date()) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  function cleanTime(value) {
    if (!value) return null;

    const match = String(value).match(/(\d{1,2}):(\d{2})/);

    if (!match) return null;

    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  function getPrayerDateTime(time, date = new Date()) {
    const [hours, minutes] = time.split(":").map(Number);

    const result = new Date(date);

    result.setHours(hours, minutes, 0, 0);

    return result;
  }

  function formatTime(time) {
    if (!time) return "--:--";

    const [hour, minute] = time.split(":").map(Number);

    const period = hour >= 12 ? "م" : "ص";
    const formattedHour = hour % 12 || 12;

    return `${formattedHour}:${String(minute).padStart(2, "0")} ${period}`;
  }

  // ==========================================
  // حساب مواقيت الصلاة بعد التصحيح
  // ==========================================

  function getAdjustedPrayerDateTime(prayerId, date = new Date()) {
    const prayer = PRAYERS.find(item => item.id === prayerId);

    if (!prayer || !prayerTimes) return null;

    const baseTime = prayerTimes[prayerId];

    if (!baseTime) return null;

    const result = getPrayerDateTime(baseTime, date);

    result.setMinutes(
      result.getMinutes() +
      (settings[prayerId].timeOffsetMinutes || 0)
    );

    return result;
  }

  // ==========================================
  // الصوت
  // ==========================================

  function stopAudio(updateStatus = true) {
    if (currentAudio) {
      const oldAudio = currentAudio;
      currentAudio = null;

      oldAudio.pause();
      oldAudio.removeAttribute("src");
      oldAudio.load();
    }

    const status = document.getElementById(
      "prayer-audio-status"
    );

    if (status && updateStatus) {
      status.textContent = "تم إيقاف صوت الأذان والدعاء";
    }
  }

  // ==========================================
  // دعاء الشيخ الشعراوي
  // ==========================================

  async function playDua(prayerId, isTest = false) {
    const s = settings[prayerId];

    if (!s || (!isTest && !s.duaEnabled)) return;

    stopAudio(false);

    const status = document.getElementById(
      "prayer-audio-status"
    );

    const audio = new Audio();

    currentAudio = audio;

    audio.dataset.prayer = prayerId;
    audio.dataset.type = "dua";
    audio.preload = "auto";
    audio.volume = s.duaVolume / 100;

    audio.src = new URL(DUA_FILE, AUDIO_BASE).href;

    if (status) {
      status.textContent = "جارٍ تشغيل دعاء الشيخ الشعراوي...";
    }

    audio.addEventListener("ended", () => {
      if (currentAudio !== audio) return;

      currentAudio = null;

      if (status) {
        status.textContent = "انتهى دعاء الشيخ الشعراوي.";
      }
    });

    audio.addEventListener("error", () => {
      if (currentAudio !== audio) return;

      currentAudio = null;

      console.error("تعذر تحميل الدعاء:", audio.src);

      if (status) {
        status.textContent = "تعذر تحميل ملف دعاء الشعراوي.";
      }
    });

    try {
      audio.load();
      await audio.play();

      if (currentAudio === audio && status) {
        status.textContent = "يعمل الآن دعاء الشيخ الشعراوي.";
      }

    } catch (error) {
      console.error("تعذر تشغيل الدعاء:", error);

      if (currentAudio === audio) {
        currentAudio = null;
      }

      if (status) {
        status.textContent = "تعذر تشغيل الدعاء.";
      }
    }
  }

  async function playAfterAdhanDua(prayerId) {
    if (!settings[prayerId]?.duaEnabled) {
      const status = document.getElementById(
        "prayer-audio-status"
      );

      if (status) {
        status.textContent = "انتهى الأذان.";
      }

      return;
    }

    await playDua(prayerId, false);
  }

  // ==========================================
  // تشغيل الأذان
  // ==========================================

  async function playAdhan(prayerId, isTest = false) {
    const s = settings[prayerId];

    if (!s || (!isTest && !s.adhanEnabled)) return;

    const selected = ADHANS[s.adhanVoice];

    if (!selected) return;

    const prayer = PRAYERS.find(
      item => item.id === prayerId
    );

    if (!prayer) return;

    stopAudio(false);

    const status = document.getElementById(
      "prayer-audio-status"
    );

    const audio = new Audio();

    currentAudio = audio;

    audio.dataset.prayer = prayerId;
    audio.dataset.type = "adhan";
    audio.preload = "auto";
    audio.volume = s.adhanVolume / 100;

    audio.src = new URL(selected.file, AUDIO_BASE).href;

    if (status) {
      status.textContent =
        "جارٍ تشغيل أذان " + prayer.name +
        " بصوت " + selected.name;
    }

    audio.addEventListener("ended", () => {
      if (currentAudio !== audio) return;

      currentAudio = null;

      if (status) {
        status.textContent = "انتهى أذان " + prayer.name;
      }

      playAfterAdhanDua(prayerId);
    });

    audio.addEventListener("error", () => {
      if (currentAudio !== audio) return;

      currentAudio = null;

      console.error("خطأ تحميل ملف الأذان:", audio.src);

      if (status) {
        status.textContent =
          "تعذر تحميل ملف الأذان. تحقق من اسم الملف ومساره.";
      }
    });

    try {
      audio.load();
      await audio.play();

      if (currentAudio === audio && status) {
        status.textContent =
          "يعمل الآن أذان " + prayer.name +
          " بصوت " + selected.name;
      }

    } catch (error) {
      console.error("تعذر تشغيل الأذان:", error);

      if (currentAudio === audio) {
        currentAudio = null;
      }

      if (status) {
        status.textContent =
          error.name === "NotAllowedError"
            ? "المتصفح منع التشغيل التلقائي. اضغط تجربة الأذان أولًا."
            : "تعذر تشغيل الصوت. تحقق من ملفات الأذان.";
      }
    }
  }

  // ==========================================
  // جلب مواقيت الصلاة
  // ==========================================

  async function fetchTimings(date) {
    const url =
      `https://api.aladhan.com/v1/timings/${getApiDate(date)}` +
      `?latitude=${locationData.latitude}` +
      `&longitude=${locationData.longitude}` +
      `&method=${METHOD}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("فشل الاتصال بخدمة مواقيت الصلاة");
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data?.timings) {
      throw new Error("بيانات مواقيت الصلاة غير صحيحة");
    }

    return result.data.timings;
  }

  async function loadPrayerTimes() {
    if (isLoading) return;

    isLoading = true;

    try {
      const today = new Date();

      const tomorrow = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const [todayTimes, nextDayTimes] = await Promise.all([
        fetchTimings(today),
        fetchTimings(tomorrow)
      ]);

      const cleaned = {};

      PRAYERS.forEach(prayer => {
        cleaned[prayer.id] = cleanTime(
          todayTimes[prayer.id]
        );
      });

      if (Object.values(cleaned).some(value => !value)) {
        throw new Error("بعض مواقيت الصلاة غير متاحة");
      }

      prayerTimes = cleaned;
      tomorrowFajr = cleanTime(nextDayTimes.Fajr);

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          date: getLocalDateString(),
          times: prayerTimes,
          tomorrowFajr
        })
      );

      displayPrayerTimes();
      updateNextPrayer();

    } catch (error) {
      console.error("خطأ في تحميل المواقيت:", error);

      loadCachedTimes();

      const city = document.getElementById("city-name");

      if (city && !prayerTimes) {
        city.textContent =
          "تعذر تحديث المواقيت. تحقق من الاتصال بالإنترنت.";
      }

    } finally {
      isLoading = false;
    }
  }

  function loadCachedTimes() {
    try {
      const cached = JSON.parse(
        localStorage.getItem(CACHE_KEY) || "null"
      );

      if (
        cached &&
        cached.date === getLocalDateString() &&
        cached.times
      ) {
        prayerTimes = cached.times;
        tomorrowFajr = cached.tomorrowFajr || null;

        displayPrayerTimes();
        updateNextPrayer();
      }

    } catch (error) {
      console.error("خطأ في قراءة المواقيت المحفوظة:", error);
    }
  }

  // ==========================================
  // عرض المواقيت
  // ==========================================

  function displayPrayerTimes() {
    if (!prayerTimes) return;

    PRAYERS.forEach(prayer => {
      const element = document.getElementById(
        prayer.element
      );

      if (element) {
        const adjusted = getAdjustedPrayerDateTime(
          prayer.id
        );

        element.textContent = adjusted
          ? formatTime(
              `${String(adjusted.getHours()).padStart(2, "0")}:` +
              `${String(adjusted.getMinutes()).padStart(2, "0")}`
            )
          : formatTime(prayerTimes[prayer.id]);
      }
    });

    ["city-name", "prayer-city", "prayer-location-name"]
      .forEach(id => {
        const element = document.getElementById(id);

        if (element) {
          element.textContent = locationData.city;
        }
      });
  }

  // ==========================================
  // الصلاة القادمة والعد التنازلي
  // ==========================================

  function updateNextPrayer() {
    if (!prayerTimes) return;

    const now = new Date();

    const upcoming = PRAYERS.map(prayer => ({
      ...prayer,
      date: getAdjustedPrayerDateTime(prayer.id)
    })).find(prayer => prayer.date && prayer.date > now);

    let nextPrayer = upcoming;

    if (!nextPrayer && tomorrowFajr) {
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      const fajrDate = getPrayerDateTime(
        tomorrowFajr,
        tomorrow
      );

      fajrDate.setMinutes(
        fajrDate.getMinutes() +
        (settings.Fajr.timeOffsetMinutes || 0)
      );

      nextPrayer = {
        id: "Fajr",
        name: "الفجر",
        date: fajrDate
      };
    }

    if (!nextPrayer) return;

    const nameElement = document.getElementById(
      "next-prayer-name"
    );

    const countdownElement = document.getElementById(
      "countdown"
    );

    if (nameElement) {
      nameElement.textContent = nextPrayer.name;
    }

    if (countdownElement) {
      const difference = Math.max(
        0,
        nextPrayer.date.getTime() - now.getTime()
      );

      const hours = Math.floor(difference / 3600000);
      const minutes = Math.floor((difference % 3600000) / 60000);
      const seconds = Math.floor((difference % 60000) / 1000);

      countdownElement.textContent =
        `${String(hours).padStart(2, "0")}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;
    }
  }

  // ==========================================
  // سجل التنبيهات ومنع التكرار
  // ==========================================

  function getAlertKey(prayerId, date) {
    return `${date}_${prayerId}`;
  }

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
    const keys = Object.keys(history);

    keys.slice(
      0,
      Math.max(0, keys.length - 100)
    ).forEach(key => delete history[key]);

    try {
      localStorage.setItem(
        ALERTS_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error("تعذر حفظ سجل التنبيهات:", error);
    }
  }

  // ==========================================
  // النطق الصوتي
  // ==========================================

  function speakAlert(message) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.lang = "ar-SA";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  function getArabicMaleVoice() {
    if (!("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();

    const arabicVoices = voices.filter(voice =>
      /^ar([-_]|$)/i.test(voice.lang)
    );

    const maleNames =
      /hamed|hamid|nayef|fahd|saleh|shakir|hisham|tariq|mohammed|mohammad|ahmed|ahmad|omar|youssef|abdul|khalid|rashid|nasser|طارق|هشام|فهد|صالح|محمد|أحمد|خالد|راشد|ناصر|ماجد|يوسف|عمر|حامد|شاكر|باسل/i;

    const femaleNames =
      /hoda|houda|amira|layla|leila|fatima|salma|sara|maryam|female|هدى|أميرة|ليلى|فاطمة|سلمى|سارة|مريم/i;

    const maleVoice = arabicVoices.find(voice =>
      maleNames.test(voice.name) &&
      !femaleNames.test(voice.name)
    );

    if (maleVoice) return maleVoice;

    return arabicVoices.find(voice =>
      !femaleNames.test(voice.name)
    ) || arabicVoices[0] || null;
  }

  function speakMalePrayerAlert(message) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.lang = "ar-SA";
    utterance.rate = 0.88;
    utterance.pitch = 0.82;
    utterance.volume = 1;

    const voice = getArabicMaleVoice();

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    window.speechSynthesis.speak(utterance);
  }

  function announcePrayer(title, message, voiceMessage) {
    sendNotification(title, message);
    speakAlert(voiceMessage);
  }

  // ==========================================
  // تنبيه قبل الصلاة بـ15 دقيقة
  // ==========================================

  function checkPrayerAlerts() {
    if (!prayerTimes) return;

    const now = new Date();
    const history = loadAlertHistory();

    const upcomingPrayers = PRAYERS.map(prayer => ({
      ...prayer,
      prayerDate: getAdjustedPrayerDateTime(prayer.id)
    }));

    if (tomorrowFajr) {
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      const fajrDate = getPrayerDateTime(
        tomorrowFajr,
        tomorrow
      );

      fajrDate.setMinutes(
        fajrDate.getMinutes() +
        (settings.Fajr.timeOffsetMinutes || 0)
      );

      upcomingPrayers.push({
        ...PRAYERS[0],
        prayerDate: fajrDate
      });
    }

    upcomingPrayers.forEach(prayer => {
      const s = settings[prayer.id];

      if (!s || !s.alertEnabled || !prayer.prayerDate) {
        return;
      }

      const alertDate = new Date(
        prayer.prayerDate.getTime() - 15 * 60000
      );

      const difference = now.getTime() - alertDate.getTime();

      const key = getAlertKey(
        prayer.id,
        getLocalDateString(prayer.prayerDate)
      );

      if (
        difference >= 0 &&
        difference < 60000 &&
        !history[key]
      ) {
        history[key] = true;

        sendNotification(
          "تطبيق يقين 🕌",
          `اقتربت صلاة ${prayer.name}، متبقي 15 دقيقة.`
        );

        speakMalePrayerAlert(
          `اقتربت صلاة ${prayer.name}، باقي خمس عشرة دقيقة.`
        );
      }
    });

    saveAlertHistory(history);
  }

  // ==========================================
  // تنبيه الإقامة
  // ==========================================

  function checkIqamaAlerts() {
    if (!prayerTimes) return;

    const now = new Date();
    const today = getLocalDateString();
    const history = loadAlertHistory();

    PRAYERS.forEach(prayer => {
      const s = settings[prayer.id];

      if (!s.iqamaEnabled) return;

      const prayerDate = getAdjustedPrayerDateTime(
        prayer.id
      );

      if (!prayerDate) return;

      const iqamaDate = new Date(prayerDate);

      iqamaDate.setMinutes(
        iqamaDate.getMinutes() + s.iqamaMinutes
      );

      const difference = now.getTime() - iqamaDate.getTime();

      const key = `iqama_${prayer.id}_${today}`;

      if (
        difference >= 0 &&
        difference < 60000 &&
        !history[key]
      ) {
        history[key] = true;

        announcePrayer(
          "موعد الإقامة 🕌",
          `حان موعد إقامة صلاة ${prayer.name}.`,
          `حان الآن موعد إقامة صلاة ${prayer.name}`
        );
      }
    });

    saveAlertHistory(history);
  }

  // ==========================================
  // الأذان التلقائي
  // ==========================================

  function checkAdhan() {
    if (!prayerTimes) return;

    const now = new Date();
    const today = getLocalDateString();
    const history = loadAlertHistory();

    PRAYERS.forEach(prayer => {
      const s = settings[prayer.id];

      if (
        !s.adhanEnabled ||
        s.adhanMode !== "auto"
      ) {
        return;
      }

      const prayerDate = getAdjustedPrayerDateTime(
        prayer.id
      );

      if (!prayerDate) return;

      const difference = now.getTime() - prayerDate.getTime();

      const key = `adhan_${prayer.id}_${today}`;

      if (
        difference >= 0 &&
        difference < 60000 &&
        !history[key]
      ) {
        history[key] = true;
        playAdhan(prayer.id, false);
      }
    });

    saveAlertHistory(history);
  }

  // ==========================================
  // تحديث اليوم
  // ==========================================

  async function checkNewDay() {
    const today = getLocalDateString();

    if (today !== lastDate) {
      lastDate = today;

      prayerTimes = null;
      tomorrowFajr = null;

      await loadPrayerTimes();
    }
  }

  // ==========================================
  // تشغيل نظام متابعة الصلاة
  // ==========================================

  function startPrayerSystem() {
    if (timer) {
      clearInterval(timer);
    }

    timer = setInterval(() => {
      checkNewDay();
      updateNextPrayer();
      checkPrayerAlerts();
      checkAdhan();
      checkIqamaAlerts();
    }, 1000);
  }

  // ==========================================
  // بدء التطبيق
  // ==========================================

  async function init() {
    createPrayerInterface();

    lastDate = getLocalDateString();

    loadCachedTimes();

    const locationUpdated = await getLocation();

    if (!locationUpdated) {
      updateLocationLabel();
    }

    await loadPrayerTimes();

    startPrayerSystem();

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden) {
          checkNewDay();
          updateNextPrayer();
          checkPrayerAlerts();
          checkAdhan();
          checkIqamaAlerts();
        }
      }
    );

    window.addEventListener(
      "online",
      loadPrayerTimes
    );
  }

  // ==========================================
  // تشغيل النظام
  // ==========================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
