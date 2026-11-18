

(function () {
  "use strict";

  // السبحة الإلكترونية - تطبيق يقين
  const STORAGE_KEY = "yaqeen_tasbeeh_count";

  let count = Number(localStorage.getItem(STORAGE_KEY)) || 0;

  function initTasbeeh() {
    const container = document.getElementById("tasbeeh");
    if (!container) return;

    const counter = container.querySelector("#tasbeeh-count");
    const tasbeehBtn = container.querySelector("#tasbeeh-btn");
    const resetBtn = container.querySelector("#tasbeeh-reset");

    if (!counter || !tasbeehBtn || !resetBtn) return;

    function updateCounter() {
      counter.textContent = count;
      localStorage.setItem(STORAGE_KEY, count);
    }

    tasbeehBtn.addEventListener("click", function () {
      count++;
      updateCounter();
    });

    resetBtn.addEventListener("click", function () {
      if (count === 0) return;

      if (confirm("هل تريد تصفير عداد التسبيح؟")) {
        count = 0;
        updateCounter();
      }
    });

    updateCounter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTasbeeh);
  } else {
    initTasbeeh();
  }
})();
