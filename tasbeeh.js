
(function () {
  "use strict";

  // السبحة الإلكترونية - تطبيق يقين
  const STORAGE_KEY = "yaqeen_tasbeeh_count";

  function getSavedCount() {
    const saved = Number(localStorage.getItem(STORAGE_KEY));

    return Number.isSafeInteger(saved) && saved >= 0
      ? saved
      : 0;
  }

  let count = getSavedCount();

  function initTasbeeh() {
    const container = document.getElementById("tasbeeh");

    if (!container) {
      console.warn("السبحة الإلكترونية غير موجودة في الصفحة");
      return;
    }

    const counter = container.querySelector("#tasbeeh-count");
    const tasbeehBtn = container.querySelector("#tasbeeh-btn");
    const resetBtn = container.querySelector("#tasbeeh-reset");

    if (!counter || !tasbeehBtn || !resetBtn) {
      console.error("بعض عناصر السبحة غير موجودة");
      return;
    }

    function updateCounter() {
      counter.textContent = count.toLocaleString("ar-EG");

      try {
        localStorage.setItem(STORAGE_KEY, String(count));
      } catch (error) {
        console.error("تعذر حفظ عدد التسبيحات:", error);
      }
    }

    tasbeehBtn.addEventListener("click", function () {
      if (count >= Number.MAX_SAFE_INTEGER) return;

      count++;
      updateCounter();
    });

    resetBtn.addEventListener("click", function () {
      if (count === 0) return;

      const confirmed = window.confirm(
        "هل تريد تصفير عداد التسبيح؟"
      );

      if (confirmed) {
        count = 0;
        updateCounter();
      }
    });

    updateCounter();

    console.log("تم تشغيل السبحة الإلكترونية بنجاح 📿");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTasbeeh);
  } else {
    initTasbeeh();
  }

})();
