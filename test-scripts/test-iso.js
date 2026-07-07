function getISOWeek(d) {
  const date = new Date(d);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

const startDate = "2026-07-01";
const cur = new Date(startDate + "T00:00:00+08:00");
const end = new Date("2026-07-14T00:00:00+08:00");

const weekConfig = {"1":"work","2":"work","3":"work","4":"work","5":"work","6":"work","7":"rest"};
const altWeekConfig = {"1":"work","2":"work","3":"work","4":"work","5":"work","6":"rest","7":"rest"};

while (cur <= end) {
  const dow = cur.getDay() === 0 ? 7 : cur.getDay();
  let config = weekConfig;
  const weekNum = getISOWeek(cur);
  if (weekNum % 2 === 0) config = altWeekConfig;
  const status = config[String(dow)] || "work";
  const ds = cur.toISOString().slice(0, 10);
  console.log(ds, "ISO", weekNum, (weekNum%2?"odd":"even"), "dow", dow, "=", status);
  cur.setDate(cur.getDate() + 1);
}
