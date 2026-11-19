
(function () {
  "use strict";

  // ==========================================
  // تطبيق يقين - البوصلة واتجاه القبلة
  // ==========================================

  const KAABA = {
    latitude: 21.422487,
    longitude: 39.826206
  };

  let qiblaBearing = null;
  let deviceHeading = null;
  let orientationStarted = false;

  let locationButton;
  let compassButton;
  let statusElement;
  let degreeElement;
  let directionElement;
  let headingElement;
  let needleElement;
  let dialElement;

  // ==========================================
  // حساب اتجاه القبلة
  // ==========================================

  function calculateQibla(latitude, longitude) {
    const rad = degrees => degrees * Math.PI / 180;
    const deg = radians => radians * 180 / Math.PI;

    const lat1 = rad(latitude);
    const lat2 = rad(KAABA.latitude);
    const deltaLon = rad(KAABA.longitude - longitude);

    const y = Math.sin(deltaLon) * Math.cos(lat2);

    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) *
      Math.cos(deltaLon);

    return (deg(Math.atan2(y, x)) + 360) % 360;
  }

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function getDirection(degrees) {
    const directions = [
      "الشمال",
      "الشمال الشرقي",
      "الشرق",
      "الجنوب الشرقي",
      "الجنوب",
      "الجنوب الغربي",
      "الغرب",
      "الشمال الغربي"
    ];

    return directions[
      Math.round(normalizeAngle(degrees) / 45) % 8
    ];
  }

  // ==========================================
  // تصميم البوصلة
  // ==========================================

  function addCompassStyles() {
    if (document.getElementById("qibla-compass-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "qibla-compass-styles";

    style.textContent = `
      .qibla-compass-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 0;
      }

      .qibla-compass {
        position: relative;
        width: 240px;
        height: 240px;
        max-width: 75vw;
        max-height: 75vw;
        border-radius: 50%;
        border: 3px solid #b99a4c;
        background:
          radial-gradient(circle, #173b32 0%, #0b1716 68%, #080f12 100%);
        box-shadow:
          0 0 25px rgba(23,141,112,.22),
          inset 0 0 20px rgba(214,181,109,.12);
      }

      .qibla-compass-dial {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        transition: transform .25s ease-out;
      }

      .qibla-cardinal {
        position: absolute;
        color: #d6b56d;
        font-weight: bold;
        font-size: 17px;
      }

      .qibla-north {
        top: 9px;
        left: 50%;
        transform: translateX(-50%);
        color: #f0d58d;
      }

      .qibla-south {
        bottom: 9px;
        left: 50%;
        transform: translateX(-50%);
      }

      .qibla-east {
        right: 13px;
        top: 50%;
        transform: translateY(-50%);
      }

      .qibla-west {
        left: 13px;
        top: 50%;
        transform: translateY(-50%);
      }

      .qibla-compass-center {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #d6b56d;
        border: 3px solid #fff0bd;
        transform: translate(-50%, -50%);
        z-index: 3;
        box-shadow: 0 0 12px rgba(214,181,109,.6);
      }

      .qibla-needle {
        position: absolute;
        z-index: 4;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        transform-origin: center;
        transition: transform .25s ease-out;
      }

      .qibla-needle-icon {
        position: absolute;
        left: 0;
        top: -78px;
        transform: translateX(-50%);
        font-size: 31px;
        filter: drop-shadow(0 0 7px rgba(214,181,109,.6));
      }

      .qibla-compass-caption {
        text-align: center;
        color: #b5c8bf;
        font-size: 13px;
        margin-top: 8px;
      }

      .qibla-action {
        width: 100%;
        padding: 14px;
        margin-top: 12px;
        border: 0;
        border-radius: 13px;
        background: linear-gradient(135deg,#168d70,#075b4c);
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
      }

      .qibla-action:disabled {
        opacity: .6;
        cursor: wait;
      }

      .qibla-secondary {
        background: transparent;
        border: 1px solid #b99a4c;
        color: #d6b56d;
      }

      .qibla-status {
        text-align: center;
        line-height: 1.8;
        font-size: 14px;
        color: #b5c8bf;
        margin-top: 12px;
      }

      .qibla-degree {
        color: #e4c36c;
        font-size: 32px;
        font-weight: bold;
      }

      .qibla-info {
        padding: 13px;
        margin-top: 12px;
        border-radius: 13px;
        background: rgba(23,141,112,.10);
        border: 1px solid rgba(35,180,145,.2);
        text-align: center;
      }
    `;

    document.head.appendChild(style);
  }

  // ==========================================
  // إنشاء واجهة القبلة
  // ==========================================

  function renderQibla() {
    const cards = document.querySelectorAll("#more .content-card");
    let card = null;

    cards.forEach(function (item) {
      const heading = item.querySelector("h3");

      if (
        heading &&
        heading.textContent.includes("اتجاه القبلة")
      ) {
        card = item;
      }
    });

    if (!card) {
      console.warn("لم يتم العثور على بطاقة القبلة");
      return;
    }

    addCompassStyles();

    card.innerHTML = `
      <h3>🧭 اتجاه القبلة</h3>

      <p>اعرف اتجاه الكعبة المشرفة أينما كنت</p>

      <button
        id="qibla-location-btn"
        class="qibla-action"
        type="button"
      >
        📍 تحديد موقعي وحساب القبلة
      </button>

      <div id="qibla-result" style="display:none;">

        <div class="qibla-compass-wrap">
          <div class="qibla-compass">

            <div class="qibla-compass-dial" id="qibla-dial">
              <span class="qibla-cardinal qibla-north">N</span>
              <span class="qibla-cardinal qibla-south">S</span>
              <span class="qibla-cardinal qibla-east">E</span>
              <span class="qibla-cardinal qibla-west">W</span>
            </div>

            <div class="qibla-needle" id="qibla-needle">
              <span class="qibla-needle-icon">🕋</span>
            </div>

            <div class="qibla-compass-center"></div>

          </div>
        </div>

        <p class="qibla-compass-caption">
          اجعل علامة الكعبة في اتجاه القبلة
        </p>

        <div class="qibla-info">
          <p>زاوية القبلة من الشمال الحقيقي</p>
          <strong class="qibla-degree" id="qibla-degree">--°</strong>
          <p id="qibla-direction"></p>
        </div>

        <div class="qibla-info">
          <p>اتجاه جهازك الحالي</p>
          <strong id="qibla-heading" style="color:#d6b56d;">
            غير محدد
          </strong>
        </div>

        <button
          id="qibla-compass-btn"
          class="qibla-action qibla-secondary"
          type="button"
        >
          🧭 تفعيل البوصلة المتحركة
        </button>

      </div>

      <p
        id="qibla-status"
        class="qibla-status"
        aria-live="polite"
      ></p>
    `;

    locationButton = document.getElementById("qibla-location-btn");
    compassButton = document.getElementById("qibla-compass-btn");
    statusElement = document.getElementById("qibla-status");
    degreeElement = document.getElementById("qibla-degree");
    directionElement = document.getElementById("qibla-direction");
    headingElement = document.getElementById("qibla-heading");
    needleElement = document.getElementById("qibla-needle");
    dialElement = document.getElementById("qibla-dial");

    locationButton.addEventListener("click", getUserLocation);
    compassButton.addEventListener("click", enableCompass);
  }

  // ==========================================
  // تحديث شكل البوصلة
  // ==========================================

  function updateCompass() {
    if (qiblaBearing === null) return;

    if (deviceHeading === null) {
      needleElement.style.transform =
        "rotate(" + qiblaBearing + "deg)";

      dialElement.style.transform = "rotate(0deg)";
      headingElement.textContent = "غير متاح";
      return;
    }

    const relativeAngle = normalizeAngle(
      qiblaBearing - deviceHeading
    );

    needleElement.style.transform =
      "rotate(" + relativeAngle + "deg)";

    dialElement.style.transform =
      "rotate(" + (-deviceHeading) + "deg)";

    headingElement.textContent =
      deviceHeading.toFixed(0) + "° - " +
      getDirection(deviceHeading);
  }

  // ==========================================
  // قراءة اتجاه الجهاز
  // ==========================================

  function getScreenAngle() {
    if (
      window.screen &&
      window.screen.orientation &&
      typeof window.screen.orientation.angle === "number"
    ) {
      return window.screen.orientation.angle;
    }

    return typeof window.orientation === "number"
      ? window.orientation
      : 0;
  }

  function handleOrientation(event) {
    // أجهزة iPhone وبعض أجهزة Apple
    if (typeof event.webkitCompassHeading === "number") {
      deviceHeading = normalizeAngle(
        event.webkitCompassHeading
      );

    // الأجهزة التي توفر اتجاه الشمال الحقيقي
    } else if (
      event.absolute === true &&
      typeof event.alpha === "number"
    ) {
      deviceHeading = normalizeAngle(
        360 - event.alpha + getScreenAngle()
      );

    } else {
      return;
    }

    updateCompass();

    statusElement.textContent =
      "البوصلة تعمل. حرّك هاتفك لمعرفة اتجاه القبلة 🧭";
  }

  // ==========================================
  // تفعيل حساس الاتجاه
  // ==========================================

  async function enableCompass() {
    if (!window.DeviceOrientationEvent) {
      statusElement.textContent =
        "جهازك أو متصفحك لا يدعم مستشعر البوصلة.";

      return;
    }

    compassButton.disabled = true;
    compassButton.textContent = "⏳ جارٍ تفعيل البوصلة...";

    try {
      // طلب الإذن على أجهزة iPhone التي تتطلب ذلك
      if (
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const permission =
          await DeviceOrientationEvent.requestPermission();

        if (permission !== "granted") {
          throw new Error(
            "لم يتم السماح باستخدام مستشعر الاتجاه."
          );
        }
      }

      if (!orientationStarted) {
        window.addEventListener(
          "deviceorientation",
          handleOrientation,
          true
        );

        orientationStarted = true;
      }

      compassButton.textContent = "🧭 البوصلة مفعّلة";
      compassButton.disabled = false;

      statusElement.textContent =
        "حرّك هاتفك ببطء حتى يتمكن المستشعر من تحديد الاتجاه.";

    } catch (error) {
      console.error("Qibla Compass Error:", error);

      statusElement.textContent =
        error.message ||
        "تعذر تفعيل البوصلة. تحقق من إعدادات الجهاز.";

      compassButton.textContent = "↻ حاول تفعيل البوصلة مرة أخرى";
      compassButton.disabled = false;
    }
  }

  // ==========================================
  // تحديد موقع المستخدم
  // ==========================================

  function getUserLocation() {
    if (!navigator.geolocation) {
      statusElement.textContent =
        "متصفحك لا يدعم تحديد الموقع.";

      return;
    }

    if (!window.isSecureContext) {
      statusElement.textContent =
        "يجب فتح التطبيق من خلال HTTPS لتحديد الموقع.";

      return;
    }

    locationButton.disabled = true;
    locationButton.textContent = "⏳ جارٍ تحديد موقعك...";

    statusElement.textContent =
      "يرجى السماح للتطبيق بالوصول إلى موقعك.";

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        qiblaBearing = calculateQibla(
          latitude,
          longitude
        );

        window.qiblaData = {
          latitude: latitude,
          longitude: longitude,
          bearing: qiblaBearing
        };

        degreeElement.textContent =
          qiblaBearing.toFixed(1) + "°";

        directionElement.textContent =
          "اتجاه القبلة: " + getDirection(qiblaBearing);

        document.getElementById("qibla-result").style.display =
          "block";

        updateCompass();

        locationButton.disabled = false;
        locationButton.textContent =
          "↻ إعادة تحديد الموقع";

        statusElement.textContent =
          "تم تحديد موقعك وحساب اتجاه القبلة بنجاح 💚";
      },

      function (error) {
        const errors = {
          1: "لم تسمح بالوصول إلى الموقع. فعّل إذن الموقع للتطبيق.",
          2: "تعذر تحديد موقعك حاليًا. حاول مرة أخرى.",
          3: "انتهى وقت طلب الموقع. حاول مرة أخرى."
        };

        statusElement.textContent =
          errors[error.code] ||
          "حدث خطأ أثناء تحديد الموقع.";

        locationButton.disabled = false;
        locationButton.textContent = "📍 حاول مرة أخرى";
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  // ==========================================
  // بدء النظام
  // ==========================================

  function init() {
    renderQibla();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  console.log("تم تحميل بوصلة القبلة - يقين 🧭");

})();
