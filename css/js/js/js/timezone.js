// عرض الساعة بنظام 12 ساعة يدويًا
function getLocalTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: selectedZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const values = {};

  parts.forEach(function (part) {
    values[part.type] = part.value;
  });

  const hour = Number(values.hour);
  const minute = Number(values.minute);
  const second = Number(values.second);

  const displayHour = hour % 12 || 12;

  const number = new Intl.NumberFormat("ar-EG", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });

  const period = hour < 12 ? "صباحًا" : "مساءً";

  return (
    number.format(displayHour) + ":" +
    number.format(minute) + ":" +
    number.format(second) + " " +
    period
  );
}
