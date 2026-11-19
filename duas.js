
(function () {
  "use strict";

  const duasData = {
    quran: [
      {
        text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        source: "سورة البقرة: 201"
      },
      {
        text: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ الْوَهَّابُ",
        source: "سورة آل عمران: 8"
      },
      {
        text: "رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي",
        source: "سورة طه: 25-26"
      },
      {
        text: "رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
        source: "سورة الأعراف: 23"
      }
    ],

    sunnah: [
      {
        text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى",
        source: "رواه مسلم"
      },
      {
        text: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
        source: "رواه أبو داود والنسائي"
      },
      {
        text: "يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ",
        source: "رواه الترمذي"
      }
    ],

    rizq: [
      {
        text: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
        source: "رواه الترمذي"
      },
      {
        text: "رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
        source: "سورة القصص: 24"
      }
    ],

    healing: [
      {
        text: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا",
        source: "متفق عليه"
      }
    ],

    parents: [
      {
        text: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        source: "سورة الإسراء: 24"
      },
      {
        text: "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
        source: "سورة إبراهيم: 41"
      }
    ],

    repentance: [
      {
        text: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
        source: "رواه أبو داود والترمذي"
      },
      {
        text: "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا",
        source: "سورة آل عمران: 147"
      }
    ]
  };

  const categoryNames = {
    quran: "أدعية القرآن",
    sunnah: "أدعية السنة",
    rizq: "الرزق والفرج",
    healing: "الشفاء",
    parents: "الوالدين والأهل",
    repentance: "التوبة والاستغفار"
  };

  let currentCategory = "quran";

  let favorites = [];

  try {
    favorites = JSON.parse(
      localStorage.getItem("yaqeen_duas_favorites") || "[]"
    );
  } catch (error) {
    favorites = [];
  }

  const content = document.getElementById("duas-content");
  const searchInput = document.getElementById("duas-search");

  if (!content) return;

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

  function saveFavorites() {
    try {
      localStorage.setItem(
        "yaqeen_duas_favorites",
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.warn("تعذر حفظ المفضلة", error);
    }
  }

  function getAllDuas() {
    return Object.keys(duasData).flatMap(function (category) {
      return duasData[category].map(function (dua, index) {
        return {
          ...dua,
          category: category,
          index: index
        };
      });
    });
  }

  function renderDuas(list) {
    if (!list.length) {
      content.innerHTML =
        '<div class="content-card"><p>لا توجد أدعية مطابقة للبحث.</p></div>';
      return;
    }

    content.innerHTML = list.map(function (dua) {
      const key = dua.category + "-" + dua.index;
      const isFavorite = favorites.includes(key);

      return `
        <div class="content-card dua-card">
          <p class="dua-text">${escapeHTML(dua.text)}</p>
          <small>${escapeHTML(dua.source)}</small>

          <div class="dua-actions">
            <button type="button" data-copy="${key}">📋 نسخ</button>
            <button type="button" data-share="${key}">📤 مشاركة</button>
            <button type="button" data-favorite="${key}">
              ${isFavorite ? "⭐" : "☆"} المفضلة
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function loadDuas(category) {
    if (!duasData[category]) return;

    currentCategory = category;

    renderDuas(
      duasData[category].map(function (dua, index) {
        return { ...dua, category: category, index: index };
      })
    );
  }

  window.loadDuas = loadDuas;

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const query = searchInput.value.trim().toLowerCase();

      const results = getAllDuas().filter(function (dua) {
        return dua.text.toLowerCase().includes(query) ||
          dua.source.toLowerCase().includes(query);
      });

      renderDuas(results);
    });
  }

  content.addEventListener("click", async function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const key =
      button.dataset.copy ||
      button.dataset.share ||
      button.dataset.favorite;

    if (!key) return;

    const parts = key.split("-");
    const category = parts[0];
    const index = Number(parts[1]);

    const dua = duasData[category]?.[index];
    if (!dua) return;

    const fullText = dua.text + "\n" + dua.source;

    if (button.dataset.copy) {
      try {
        await navigator.clipboard.writeText(fullText);
        button.textContent = "✅ تم النسخ";
      } catch (error) {
        alert("تعذر النسخ. حاول مرة أخرى.");
      }
    }

    if (button.dataset.share) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "دعاء من تطبيق يقين",
            text: fullText
          });
        } catch (error) {
          if (error.name !== "AbortError") {
            alert("تعذرت المشاركة.");
          }
        }
      } else {
        try {
          await navigator.clipboard.writeText(fullText);
          alert("تم نسخ الدعاء. يمكنك مشاركته الآن.");
        } catch (error) {
          alert("المشاركة غير متاحة في هذا المتصفح.");
        }
      }
    }

    if (button.dataset.favorite) {
      if (favorites.includes(key)) {
        favorites = favorites.filter(function (item) {
          return item !== key;
        });
      } else {
        favorites.push(key);
      }

      saveFavorites();

      if (searchInput && searchInput.value.trim()) {
        searchInput.dispatchEvent(new Event("input"));
      } else {
        loadDuas(currentCategory);
      }
    }
  });

  loadDuas("quran");

})();
