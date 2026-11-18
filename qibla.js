
(function () {
  "use strict";

  // تطبيق يقين - نظام تحديد اتجاه القبلة
  // المرحلة الأولى: الموقع وحساب اتجاه القبلة فقط

  const KAABA = {
    latitude: 21.422487,
    longitude: 39.826206
  };

  function calculateQibla(latitude, longitude) {
    const toRadians = degrees => degrees * Math.PI / 180;
    const toDegrees = radians => radians * 180 / Math.PI;

    const lat1 = toRadians(latitude);
    const lat2 = toRadians(KAABA.latitude);
    const deltaLon = toRadians(
      KAABA.longitude - longitude
    );

    const y = Math.sin(deltaLon) * Math.cos(lat2);

    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) *
      Math.cos(deltaLon);

    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
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
      Math.round(degrees / 45) % 8
    ];
  }

  function renderQibla() {
    const cards = document.querySelectorAll(
      "#more .content-card"
    );

    let card = null;

    cards.forEach(item => {
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

    card.innerHTML = `
      <h3>🧭 اتجاه القبلة</h3>

      <p>حدد موقعك لمعرفة اتجاه الكعبة المشرفة</p>

      <button
        id="qibla-location-btn"
        type="button"
        style="
          width:100%;
          padding:14px;
          margin-top:15px;
          border:0;
          border-radius:12px;
          background:#087f70;
          color:white;
          font-size:16px;
          cursor:pointer;
        "
      >
        📍 تحديد موقعي وحساب القبلة
      </button>

      <div
        id="qibla-result"
        style="display:none; margin-top:20px; text-align:center;"
        aria-live="polite"
      >
        <div style="font-size:45px;">🕋</div>

        <p>اتجاه القبلة بالنسبة للشمال الحقيقي</p>

        <strong
          id="qibla-degree"
          style="font-size:30px;color:#d6b56d;"
        >--°</strong>

        <p id="qibla-direction"></p>

        <p style="color:#999;font-size:13px;">
          تم حساب اتجاه القبلة حسب موقعك
        </p>
      </div>

      <p
        id="qibla-status"
        style="margin-top:12px;font-size:14px;"
        aria-live="polite"
      ></p>
    `;

    const button = document.getElementById(
      "qibla-location-btn"
    );

    const status = document.getElementById(
      "qibla-status"
    );

    button.addEventListener("click", function () {
      if (!navigator.geolocation) {
        status.textContent =
          "متصفحك لا يدعم تحديد الموقع.";

        return;
      }

      if (!window.isSecureContext) {
        status.textContent =
          "يجب فتح التطبيق عبر HTTPS لتحديد الموقع.";

        return;
      }

      button.disabled = true;
      button.textContent = "⏳ جارٍ تحديد موقعك...";

      status.textContent =
        "يرجى السماح للتطبيق بالوصول إلى موقعك.";

      navigator.geolocation.getCurrentPosition(
        function (position) {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const bearing = calculateQibla(
            latitude,
            longitude
          );

          const roundedBearing =
            Number(bearing.toFixed(1));

          document.getElementById(
            "qibla-degree"
          ).textContent = roundedBearing + "°";

          document.getElementById(
            "qibla-direction"
          ).textContent = getDirection(bearing);

          document.getElementById(
            "qibla-result"
          ).style.display = "block";

          // حفظ بيانات المرحلة الأولى للمرحلة الثانية
          window.qiblaData = {
            latitude: latitude,
            longitude: longitude,
            bearing: bearing
          };

          status.textContent =
            "تم تحديد موقعك وحساب اتجاه القبلة بنجاح 💚";

          button.textContent =
            "↻ إعادة تحديد الموقع";

          button.disabled = false;
        },

        function (error) {
          const errors = {
            1: "لم تسمح بالوصول إلى الموقع. يرجى تفعيل الإذن.",
            2: "تعذر تحديد موقعك حاليًا.",
            3: "انتهى وقت طلب الموقع. حاول مرة أخرى."
          };

          status.textContent =
            errors[error.code] ||
            "حدث خطأ أثناء تحديد الموقع.";

          button.textContent =
            "📍 حاول مرة أخرى";

          button.disabled = false;
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderQibla();
  });

  console.log("تم تحميل نظام القبلة - يقين 🧭");

})();
