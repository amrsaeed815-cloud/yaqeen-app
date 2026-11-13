
(function () {
  "use strict";

  const azkar = {
    morning: [
      { text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", count: 1 },
      { text: "آية الكرسي", count: 1 },
      { text: "قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", count: 3 },
      { text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", count: 3 },
      { text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ", count: 3 },
      { text: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ", count: 1 },
      { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", count: 100 },
      { text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا", count: 3 }
    ],

    evening: [
      { text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", count: 1 },
      { text: "آية الكرسي", count: 1 },
      { text: "قُلْ هُوَ اللَّهُ أَحَدٌ", count: 3 },
      { text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", count: 3 },
      { text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ", count: 3 },
      { text: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ", count: 1 },
      { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", count: 100 }
    ],

    sleep: [
      { text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", count: 1 },
      { text: "آية الكرسي", count: 1 },
      { text: "سُبْحَانَ اللَّهِ", count: 33 },
      { text: "الْحَمْدُ لِلَّهِ", count: 33 },
      { text: "اللَّهُ أَكْبَرُ", count: 34 }
    ],

    prayer: [
      { text: "أَسْتَغْفِرُ اللَّهَ", count: 3 },
      { text: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", count: 1 },
      { text: "سُبْحَانَ اللَّهِ", count: 33 },
      { text: "الْحَمْدُ لِلَّهِ", count: 33 },
      { text: "اللَّهُ أَكْبَرُ", count: 33 }
    ]
  };

  const titles = {
    morning: "أذكار الصباح",
    evening: "أذكار المساء",
    sleep: "أذكار النوم",
    prayer: "أذكار بعد الصلاة"
  };

  let currentCategory = "morning";
  let currentList = [];
  let currentIndex = 0;
  let currentCount = 0;

  function renderAzkar() {
    const container = document.getElementById("azkar-content");
    if (!container || !currentList.length) return;

    const item = currentList[currentIndex];
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "content-card azkar-card";

    const heading = document.createElement("h3");
    heading.textContent = titles[currentCategory];

    const progress = document.createElement("p");
    progress.textContent = "الذكر " + (currentIndex + 1) + " من " + currentList.length;

    const text = document.createElement("div");
    text.className = "azkar-text";
    text.textContent = item.text;

    const counter = document.createElement("h2");
    counter.textContent = currentCount + " / " + item.count;

    const countButton = document.createElement("button");
    countButton.className = "feature-card";
    countButton.textContent = "📿 اضغط للتسبيح";

    countButton.addEventListener("click", function () {
      if (currentCount < item.count) currentCount++;
      counter.textContent = currentCount + " / " + item.count;

      if (currentCount >= item.count) {
        countButton.textContent = "✓ اكتمل الذكر";
        countButton.disabled = true;
      }
    });

    const nextButton = document.createElement("button");
    nextButton.className = "feature-card";
    nextButton.textContent = "الذكر التالي ←";

    nextButton.addEventListener("click", function () {
      if (currentIndex < currentList.length - 1) {
        currentIndex++;
        currentCount = 0;
        renderAzkar();
      } else {
        container.innerHTML = "<div class='content-card'><h3>ما شاء الله 🤍</h3><p>أتممت أذكار هذا القسم.</p></div>";
      }
    });

    card.append(heading, progress, text, counter, countButton, nextButton);
    container.appendChild(card);
  }

  window.loadAzkar = function (category) {
    if (!azkar[category]) return;

    currentCategory = category;
    currentList = azkar[category];
    currentIndex = 0;
    currentCount = 0;
    renderAzkar();
  };

})();

