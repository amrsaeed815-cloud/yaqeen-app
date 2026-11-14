
(function () {
  "use strict";

  // =========================================
  // إعدادات رمضان - تطبيق يقين
  // =========================================

  const API = "https://api.aladhan.com/v1";
  const METHOD = 5;

  const CACHE_KEY = "yaqeen_ramadan_calendar_v1";
  const SETTINGS_KEY = "yaqeen_ramadan_settings_v1";

  const SUHOOR_DEFAULT = 30;
  const IMSAK_DEFAULT = 10;

  const HIJRI_MONTH = 9;
  const RAMADAN_GREGORIAN_YEAR = 2027;

  const prayerNames = {
    Fajr: "الفجر",
    Sunrise: "الشروق",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء"
  };

  // =========================================
  // حالة التطبيق
  // =========================================

  let location = null;
  let timeZone = null;

  let ramadanDays = [];
  let ramadanHijriYear = null;

  let loading = false;
  let countdownTimer = null;
  let notificationTimer = null;

  let settings = {
    suhoorMinutes: SUHOOR_DEFAULT,
    imsakMinutes: IMSAK_DEFAULT,
    notificationsEnabled: false
  };

  let notifiedEvents = new Set();

  // =========================================
  // أدوات عامة
  // =========================================

  function getElement(id) {
    return document.getElementById(id);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function getLocalDate(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);

    const values = {};

    parts.forEach(function (part) {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });

    return (
      values.year + "-" +
      values.month + "-" +
      values.day
    );
  }

  function dateTime(dateString, timeString) {
    const match = String(timeString || "").match(
      /^(\d{1,2}):(\d{2})/
    );

    if (!match) return null;

    const parts = dateString.split("-").map(Number);

    const target = Date.UTC(
      parts[0],
      parts[1] - 1,
      parts[2],
      Number(match[1]),
      Number(match[2])
    );

    let guess = target;

    for (let i = 0; i < 4; i++) {
      const formatted = new Intl.DateTimeFormat("en-GB", {
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

      formatted.forEach(function (part) {
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

  function formatTime(value) {
    if (!value) return "--:--";

    const match = String(value).match(
      /^(\d{1,2}):(\d{2})/
    );

    if (!match) return "--:--";

    const hour = Number(match[1]);

    return (
      pad(hour % 12 || 12) +
      ":" + match[2] +
      " " +
      (hour < 12 ? "صباحًا" : "مساءً")
    );
  }

  function formatDuration(milliseconds) {
    const seconds = Math.max(
      0,
      Math.floor(milliseconds / 1000)
    );

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;

    if (days > 0) {
      return (
        days + " يوم " +
        pad(hours) + ":" +
        pad(minutes) + ":" +
        pad(remaining)
      );
    }

    return (
      pad(hours) + ":" +
      pad(minutes) + ":" +
      pad(remaining)
    );
  }

  // =========================================
  // حفظ واسترجاع الإعدادات
  // =========================================

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(SETTINGS_KEY)
      );

      if (saved && typeof saved === "object") {
        settings.suhoorMinutes = Math.min(
          120,
          Math.max(5, Number(saved.suhoorMinutes) || SUHOOR_DEFAULT)
        );

        settings.imsakMinutes = Math.min(
          60,
          Math.max(1, Number(saved.imsakMinutes) || IMSAK_DEFAULT)
        );

        settings.notificationsEnabled =
          saved.notificationsEnabled === true;
      }
    } catch (error) {
      console.warn("Ramadan settings error:", error);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.warn("Ramadan settings save error:", error);
    }
  }

  // =========================================
  // تحديد الموقع
  // =========================================

  function useCoordinates(latitude, longitude) {
    location = {
      latitude: Number(latitude),
      longitude: Number(longitude)
    };

    if (
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude) ||
      Math.abs(location.latitude) > 90 ||
      Math.abs(location.longitude) > 180
    ) {
      throw new Error("Invalid coordinates");
    }

    timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC";
  }

  function detectLocation() {
    return new Promise(function (resolve, reject) {
      // الاستفادة من موقع ملف الصلاة إذا كان محفوظًا
      try {
        const saved = JSON.parse(
          localStorage.getItem("yaqeen_prayer_times_v2")
        );

        if (
          saved &&
          saved.location &&
          Number.isFinite(saved.location.latitude) &&
          Number.isFinite(saved.location.longitude)
        ) {
          useCoordinates(
            saved.location.latitude,
            saved.location.longitude
          );

          resolve();
          return;
        }
      } catch (error) {
        console.warn("Prayer location cache error:", error);
      }

      if (!navigator.geolocation) {
        reject(new Error("Geolocation unavailable"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (position) {
          try {
            useCoordinates(
              position.coords.latitude,
              position.coords.longitude
            );

            resolve();
          } catch (error) {
            reject(error);
          }
        },

        function (error) {
          reject(error);
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 600000
        }
      );
    });
  }

  // =========================================
  // الاتصال بواجهة المواقيت
  // =========================================

  async function requestAPI(url) {
    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("API error: " + response.status);
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data) {
      throw new Error("Invalid API response");
    }

    return result.data;
  }

  function getLocationParams() {
    const params = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      method: String(METHOD),
      timezonestring: timeZone,
      latitudeAdjustmentMethod: "3"
    });

    return params.toString();
  }

  // =========================================
  // معرفة السنة الهجرية لرمضان
  // =========================================

  async function getRamadanHijriYear(year) {
    const result = await requestAPI(
      API + "/islamicYearFromGregorianForRamadan/" + year
    );

    const hijriYear = Number(result);

    if (!Number.isInteger(hijriYear)) {
      throw new Error("Invalid Hijri year");
    }

    return hijriYear;
  }

  // =========================================
  // جلب إمساكية رمضان كاملة
  // =========================================

  async function fetchRamadanCalendar(year) {
    const hijriYear = await getRamadanHijriYear(year);

    const url =
      API +
      "/hijriCalendar/" +
      hijriYear +
      "/" +
      HIJRI_MONTH +
      "?" +
      getLocationParams();

    const data = await requestAPI(url);

    if (!Array.isArray(data) || !data.length) {
      throw new Error("Ramadan calendar is empty");
    }

    const days = data
      .filter(function (item) {
        return (
          item.date &&
          item.date.hijri &&
          Number(item.date.hijri.month.number) === HIJRI_MONTH &&
          item.timings
        );
      })
      .map(function (item) {
        return {
          hijriDay: Number(item.date.hijri.day),
          hijriDate: item.date.hijri.date,
          gregorianDate: item.date.gregorian.date,
          date: item.date.gregorian.date.split("-").reverse().join("-"),
          timings: item.timings
        };
      })
      .filter(function (day) {
        return (
          day.hijriDay >= 1 &&
          day.timings.Fajr &&
          day.timings.Maghrib
        );
      })
      .sort(function (a, b) {
        return a.hijriDay - b.hijriDay;
      });

    if (days.length < 29) {
      throw new Error("Incomplete Ramadan calendar");
    }

    return {
      hijriYear: hijriYear,
      days: days
    };
  }

  // =========================================
  // التخزين المؤقت للإمساكية
  // =========================================

  function saveCalendar() {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          timeZone: timeZone,
          hijriYear: ramadanHijriYear,
          days: ramadanDays
        })
      );
    } catch (error) {
      console.warn("Ramadan cache error:", error);
    }
  }

  function loadCalendarCache() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(CACHE_KEY)
      );

      if (
        !saved ||
        !Array.isArray(saved.days) ||
        saved.days.length < 29 ||
        !saved.hijriYear ||
        !saved.latitude ||
        !saved.longitude
      ) {
        return false;
      }

      const distance =
        Math.abs(saved.latitude - location.latitude) +
        Math.abs(saved.longitude - location.longitude);

      if (distance > 0.01 || saved.timeZone !== timeZone) {
        return false;
      }

      ramadanDays = saved.days;
      ramadanHijriYear = saved.hijriYear;

      return true;

    } catch (error) {
      return false;
    }
  }

  // =========================================
  // واجهة قسم رمضان
  // =========================================

  function createInterface() {
    const section = getElement("ramadan");

    if (!section) return;

    const calendarCard = getElement("ramadan-calendar");

    if (!calendarCard) return;

    if (!getElement("ramadan-status")) {
      const status = document.createElement("p");
      status.id = "ramadan-status";
      status.className = "ramadan-status";
      status.textContent = "جاري تجهيز إمساكية رمضان...";
      calendarCard.parentElement.insertBefore(
        status,
        calendarCard
      );
    }

    if (!getElement("ramadan-countdown")) {
      const countdown = document.createElement("div");

      countdown.id = "ramadan-countdown";
      countdown.className = "content-card";

      countdown.innerHTML = `
        <h3 id="ramadan-event-title">🌙 العد التنازلي</h3>
        <div id="ramadan-event-timer"
          style="font-size:30px;font-weight:bold;text-align:center;padding:15px">
          --:--:--
        </div>
        <p id="ramadan-event-description" style="text-align:center">
          جاري حساب الموعد القادم
        </p>
      `;

      calendarCard.parentElement.parentElement.insertBefore(
        countdown,
        calendarCard.parentElement
      );
    }

    if (!getElement("ramadan-settings")) {
      const settingsCard = document.createElement("div");

      settingsCard.id = "ramadan-settings";
      settingsCard.className = "content-card";

      settingsCard.innerHTML = `
        <h3>⚙️ إعدادات تنبيهات رمضان</h3>

        <label for="ramadan-imsak-minutes">
          التنبيه قبل الإمساك بـ
        </label>

        <input
          type="number"
          id="ramadan-imsak-minutes"
          min="1"
          max="60"
          value="${settings.imsakMinutes}"
        >

        <span>دقيقة</span>

        <br><br>

        <label>
          <input
            type="checkbox"
            id="ramadan-notifications"
            ${settings.notificationsEnabled ? "checked" : ""}
          >
          تفعيل تنبيهات رمضان
        </label>

        <br><br>

        <button
          type="button"
          id="ramadan-notification-permission"
          class="feature-card"
        >
          🔔 السماح بالإشعارات
        </button>

        <p id="ramadan-notification-status">
          التنبيهات تعمل عند فتح التطبيق والسماح بالإشعارات
        </p>
      `;

      section.appendChild(settingsCard);
    }

    const suhoorInput = getElement("suhoor-minutes");

    if (suhoorInput) {
      suhoorInput.value = settings.suhoorMinutes;
    }

    const imsakInput = getElement("ramadan-imsak-minutes");

    if (imsakInput) {
      imsakInput.value = settings.imsakMinutes;
    }

    bindSettings();
  }

  // =========================================
  // ربط إعدادات المستخدم
  // =========================================

  function bindSettings() {
    const suhoor = getElement("suhoor-minutes");
    const imsak = getElement("ramadan-imsak-minutes");

    const notifications = getElement("ramadan-notifications");
    const permissionButton = getElement(
      "ramadan-notification-permission"
    );

    if (suhoor && !suhoor.dataset.bound) {
      suhoor.dataset.bound = "true";

      suhoor.addEventListener("change", function () {
        settings.suhoorMinutes = Math.min(
          120,
          Math.max(5, Number(this.value) || SUHOOR_DEFAULT)
        );

        this.value = settings.suhoorMinutes;

        saveSettings();
        updateCountdown();
      });
    }

    if (imsak && !imsak.dataset.bound) {
      imsak.dataset.bound = "true";

      imsak.addEventListener("change", function () {
        settings.imsakMinutes = Math.min(
          60,
          Math.max(1, Number(this.value) || IMSAK_DEFAULT)
        );

        this.value = settings.imsakMinutes;

        saveSettings();
      });
    }

    if (notifications && !notifications.dataset.bound) {
      notifications.dataset.bound = "true";

      notifications.addEventListener("change", function () {
        settings.notificationsEnabled = this.checked;
        saveSettings();
        updateNotificationStatus();
      });
    }

    if (permissionButton && !permissionButton.dataset.bound) {
      permissionButton.dataset.bound = "true";

      permissionButton.addEventListener("click", requestNotifications);
    }

    updateNotificationStatus();
  }

  // =========================================
  // عرض الإمساكية
  // =========================================

  function renderCalendar() {
    const container = getElement("ramadan-calendar");

    if (!container || !ramadanDays.length) return;

    const today = getLocalDate(new Date());

    const rows = ramadanDays.map(function (day) {
      const isToday = day.date === today;

      return `
        <tr ${isToday ? 'class="ramadan-today"' : ""}>
          <td>${day.hijriDay}</td>
          <td>${escapeHTML(day.gregorianDate)}</td>
          <td>${formatTime(day.timings.Fajr)}</td>
          <td>${formatTime(day.timings.Sunrise)}</td>
          <td>${formatTime(day.timings.Dhuhr)}</td>
          <td>${formatTime(day.timings.Asr)}</td>
          <td>${formatTime(day.timings.Maghrib)}</td>
          <td>${formatTime(day.timings.Isha)}</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="ramadan-table-wrapper"
        style="overflow-x:auto;width:100%">

        <table class="ramadan-table"
          style="width:100%;border-collapse:collapse;min-width:650px">

          <thead>
            <tr>
              <th>اليوم</th>
              <th>التاريخ</th>
              <th>الفجر</th>
              <th>الشروق</th>
              <th>الظهر</th>
              <th>العصر</th>
              <th>الإفطار</th>
              <th>العشاء</th>
            </tr>
          </thead>

          <tbody>${rows}</tbody>
        </table>
      </div>

      <p style="margin-top:12px">
        الإمساك قبل الفجر بـ ${settings.imsakMinutes} دقيقة.
        مواعيد الإمساكية حسابية وقد تختلف عن إعلان رؤية الهلال المحلي.
      </p>
    `;
  }

  // =========================================
  // حساب الحدث القادم
  // =========================================

  function getUpcomingEvent() {
    const now = new Date();

    const events = [];

    ramadanDays.forEach(function (day) {
      const fajr = dateTime(day.date, day.timings.Fajr);
      const maghrib = dateTime(day.date, day.timings.Maghrib);

      if (!fajr || !maghrib) return;

      if (fajr > now) {
        events.push({
          time: fajr,
          title: "🌙 موعد السحور والفجر",
          description: "استعد للسحور وصلاة الفجر"
        });
      }

      if (maghrib > now) {
        events.push({
          time: maghrib,
          title: "💥 مدفع الإفطار",
          description: "اقترب موعد أذان المغرب والإفطار"
        });
      }
    });

    events.sort(function (a, b) {
      return a.time - b.time;
    });

    return events[0] || null;
  }

  function updateCountdown() {
    if (!ramadanDays.length) return;

    const now = new Date();

    const firstDay = ramadanDays[0];
    const firstFajr = dateTime(
      firstDay.date,
      firstDay.timings.Fajr
    );

    const today = getLocalDate(now);

    const currentDay = ramadanDays.find(function (day) {
      return day.date === today;
    });

    let event;

    if (!currentDay && firstFajr && now < firstFajr) {
      event = {
        time: firstFajr,
        title: "🌙 اقترب رمضان",
        description: "باقي على بداية أول يوم من رمضان"
      };
    } else {
      event = getUpcomingEvent();
    }

    const title = getElement("ramadan-event-title");
    const timer = getElement("ramadan-event-timer");
    const description = getElement("ramadan-event-description");

    if (!event) {
      if (title) title.textContent = "🌙 انتهى رمضان";
      if (timer) timer.textContent = "تقبل الله منا ومنكم";
      if (description) description.textContent = "كل عام وأنتم بخير";
      return;
    }

    const difference = event.time.getTime() - now.getTime();

    if (title) title.textContent = event.title;

    if (timer) {
      timer.textContent = formatDuration(difference);
    }

    if (description) {
      description.textContent = event.description;
    }
  }

  // =========================================
  // تنبيهات المتصفح
  // =========================================

  async function requestNotifications() {
    const status = getElement("ramadan-notification-status");

    if (!("Notification" in window)) {
      if (status) {
        status.textContent = "المتصفح لا يدعم الإشعارات";
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        settings.notificationsEnabled = true;

        const checkbox = getElement("ramadan-notifications");

        if (checkbox) checkbox.checked = true;

        saveSettings();

        if (status) {
          status.textContent = "تم السماح بإشعارات رمضان";
        }

        updateNotificationStatus();

      } else {
        if (status) {
          status.textContent = "لم يتم السماح بالإشعارات";
        }
      }

    } catch (error) {
      console.error("Notification permission error:", error);
    }
  }

  function updateNotificationStatus() {
    const status = getElement("ramadan-notification-status");

    if (!status) return;

    if (!("Notification" in window)) {
      status.textContent = "الإشعارات غير مدعومة في هذا المتصفح";
      return;
    }

    if (Notification.permission !== "granted") {
      status.textContent = "اضغط السماح بالإشعارات لتفعيل التنبيهات";
      return;
    }

    status.textContent = settings.notificationsEnabled
      ? "إشعارات رمضان مفعّلة"
      : "الإشعارات مسموح بها لكنها متوقفة";
  }

  function sendNotification(title, body, key) {
    if (
      !settings.notificationsEnabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    if (notifiedEvents.has(key)) return;

    notifiedEvents.add(key);

    try {
      const notification = new Notification(title, {
        body: body,
        icon: "icons/icon-192.png",
        tag: key
      });

      notification.onclick = function () {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.warn("Notification error:", error);
    }
  }

  function checkNotifications() {
    if (!ramadanDays.length) return;

    const now = new Date();

    ramadanDays.forEach(function (day) {
      const fajr = dateTime(day.date, day.timings.Fajr);
      const maghrib = dateTime(day.date, day.timings.Maghrib);

      if (!fajr || !maghrib) return;

      const fajrKey = day.date + "-fajr";
      const imsakKey = day.date + "-imsak";
      const suhoorKey = day.date + "-suhoor";
      const iftarKey = day.date + "-iftar";

      const imsakTime = new Date(
        fajr.getTime() - settings.imsakMinutes * 60000
      );

      const suhoorTime = new Date(
        fajr.getTime() - settings.suhoorMinutes * 60000
      );

      if (now >= suhoorTime && now < new Date(suhoorTime.getTime() + 60000)) {
        sendNotification(
          "🍲 تذكير السحور",
          "اقترب موعد الفجر. لا تنسَ السحور.",
          suhoorKey
        );
      }

      if (now >= imsakTime && now < new Date(imsakTime.getTime() + 60000)) {
        sendNotification(
          "🌙 موعد الإمساك",
          "حان موعد الإمساك قبل الفجر.",
          imsakKey
        );
      }

      if (now >= fajr && now < new Date(fajr.getTime() + 60000)) {
        sendNotification(
          "🕌 أذان الفجر",
          "حان وقت صلاة الفجر.",
          fajrKey
        );
      }

      if (now >= maghrib && now < new Date(maghrib.getTime() + 60000)) {
        sendNotification(
          "💥 مدفع الإفطار",
          "حان موعد أذان المغرب والإفطار. تقبل الله صيامكم.",
          iftarKey
        );
      }
    });

    // الاحتفاظ بمفاتيح اليوم الحالي فقط
    const today = getLocalDate(now);

    if (notifiedEvents.size > 100) {
      notifiedEvents = new Set(
        Array.from(notifiedEvents).filter(function (key) {
          return key.startsWith(today);
        })
      );
    }
  }

  // =========================================
  // تشغيل العدادات والتنبيهات
  // =========================================

  function startTimers() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    if (notificationTimer) {
      clearInterval(notificationTimer);
    }

    updateCountdown();

    countdownTimer = setInterval(function () {
      updateCountdown();
    }, 1000);

    checkNotifications();

    notificationTimer = setInterval(function () {
      checkNotifications();
    }, 15000);
  }

  // =========================================
  // تحديث الإمساكية عند تغير اليوم
  // =========================================

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      updateCountdown();
      checkNotifications();
    }
  });

  window.addEventListener("online", function () {
    if (location && !ramadanDays.length) {
      init();
    }
  });

  // =========================================
  // تحميل رمضان
  // =========================================

  async function init() {
    if (loading) return;

    loading = true;

    const status = getElement("ramadan-status");

    try {
      loadSettings();
      createInterface();

      if (status) {
        status.textContent = "جاري تحديد موقعك...";
      }

      await detectLocation();

      if (status) {
        status.textContent = "جاري تحميل إمساكية رمضان...";
      }

      let hasCache = loadCalendarCache();

      if (!hasCache) {
        const currentYear = new Date().getFullYear();

        let result = await fetchRamadanCalendar(
          RAMADAN_GREGORIAN_YEAR
        );

        const today = getLocalDate(new Date());

        const firstDay = result.days[0];

        // لو رمضان السنة المطلوبة انتهى، انتقل إلى السنة التالية
        if (firstDay && firstDay.date < today) {
          result = await fetchRamadanCalendar(
            currentYear + 1
          );
        }

        ramadanHijriYear = result.hijriYear;
        ramadanDays = result.days;

        saveCalendar();
      }

      renderCalendar();
      startTimers();

      if (status) {
        status.textContent =
          "تم تحميل إمساكية رمضان حسب موقعك بنجاح 🌙";
      }

      console.log("Ramadan loaded:", ramadanDays.length);

    } catch (error) {
      console.error("Ramadan error:", error);

      if (status) {
        status.textContent =
          "تعذر تحميل إمساكية رمضان. تحقق من إذن الموقع والإنترنت ثم أعد تحميل الصفحة.";
      }

      const calendar = getElement("ramadan-calendar");

      if (calendar && !ramadanDays.length) {
        calendar.innerHTML =
          "<p>تعذر تحميل الإمساكية حاليًا.</p>";
      }

    } finally {
      loading = false;
    }
  }

  // =========================================
  // تشغيل الملف
  // =========================================

  function boot() {
    createInterface();
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
