const config = require("./config.json")

module.exports = {
  config,
  getToday: () => {
    let date = new Date();
    date.setHours(date.getHours() + config.hourOffset);
    return date;
  },
  getWeek: (dt) => { // https://www.w3resource.com/javascript-exercises/javascript-date-exercise-24.php
    var tdt = new Date(dt.valueOf());
    var dayn = (dt.getDay() + 6) % 7;
    tdt.setDate(tdt.getDate() - dayn + 3);
    var firstThursday = tdt.valueOf();
    tdt.setMonth(0, 1);
    if (tdt.getDay() !== 4) tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
    return 1 + Math.ceil((firstThursday - tdt) / 604800000);
  }
}