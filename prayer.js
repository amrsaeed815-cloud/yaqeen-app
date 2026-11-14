
async function updateNextPrayer() {
  if (!validTimings(timings) || !location) return;

  const now = new Date();
  const today = getToday();
  let nextName = null;
  let nextTime = null;

  for (const name of Object.keys(prayers)) {
    const date = localDateToUTC(today, timings[name]);

    if (date > now) {
      nextName = name;
      nextTime = date;
      break;
    }
  }

  if (!nextName) {
    try {
      if (!nextDayFajr) {
        if (!nextDayFajrPromise) {
          const tomorrow = addDays(today, 1);

          nextDayFajrPromise = fetchTimings(tomorrow)
            .then(function (data) {
              nextDayFajr = localDateToUTC(tomorrow, data.Fajr);
              return nextDayFajr;
            })
            .finally(function () {
              nextDayFajrPromise = null;
            });
        }

        await nextDayFajrPromise;
      }

      nextName = "Fajr";
      nextTime = nextDayFajr;
    } catch (error) {
      console.warn("Tomorrow Fajr error:", error);
      return;
    }
  }

  const nameElement = document.getElementById("next-prayer-name");
  const countdown = document.getElementById("countdown");

  if (nameElement) {
    nameElement.textContent = prayers[nextName].name;
  }

  if (countdown) {
    const difference = Math.max(0, nextTime - now);

    const hours = Math.floor(difference / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);

    countdown.textContent =
      String(hours).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0");
  }
}
