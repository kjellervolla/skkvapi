module.exports = app => {
  app.get("/timeplan", (request, response) => response.json(timeplan))

  app.get("/timeplan/:classroom", async (request, response) => {
    const plan = timeplan[request.params.classroom.toUpperCase()];

    if (!plan) return response.status(404).json({ error: true, class: false, message: "Dette klasserommet eksisterer ikke." }) // "This classroom does not exist."
    if (plan.error) return response.status(503).json({ error: true, class: true, message: "Klasserommet er utilgjengelig, prøv igjen senere." }) // "The classroom is unavailable, try again later."

    return response.status(200).json(plan)
  })
}

const fetch = require("node-fetch"), Turndown = require("turndown"), turndownService = new Turndown(), { getWeek, getToday, config } = require("../constants.js");

let timeplan = {}, classes = ["10D", "8A", "8B", "8C", "8D", "8E", "9A", "9B", "9C", "9D", "9E", "10A", "10B", "10C", "10D", "10E"];
for (let cl of classes) timeplan[cl] = { error: true } // we first make them unavailable until we request them

async function start() {
  for (let cl of classes) {
    await update(cl)
    await new Promise(resolve => setTimeout(resolve, 5000))
  } // to prevent accidentally DDOSing their servers, we add a delay... it's happened before...

  return setInterval(() => {
    let cl = classes.shift();
    classes.push(cl); // we move the classroom to the back again

    update(cl)
  }, 800000) // around 13-14 minutes
}

async function update(cl) {
  return await fetchInfo(cl, getWeek(getToday()))
}

async function fetchInfo(cl, week) { // custom scraper to scrape off their servers for data. Bewcause they don't have an open API for this, we do it this way instead.
  try {
    const htmlRaw = await fetch("https://ukeplan.lillestrom.kommune.no/Schedule/Kjellervolla%20skole/" + cl + "/" + (new Date()).getUTCFullYear() + "/" + week).then(res => res.text());
    const markdown = turndownService.turndown(htmlRaw).split("#### Beskjeder")[1].split("Kontakt Lillestrøm kommune")[0].trim();

    await new Promise(resolve => setTimeout(resolve, 5000)) // to prevent accidentally DDOSing their servers, we add a delay... it's happened before...

    const homeworkHtmlRaw = await fetch("https://ukeplan.lillestrom.kommune.no/Schedule/Kjellervolla%20skole/" + cl + "/" + (new Date()).getUTCFullYear() + "/" + week + "?competenceAim=1").then(res => res.text());
    const homeworkMarkdown = turndownService.turndown(homeworkHtmlRaw).split("### Ukens arbeidsplan (Uke " + week + ")")[1].split("Kontakt Lillestrøm kommune")[0].trim();

    timeplan[cl] = {
      "class": cl,
      "messages": markdown.split("\n\n  \n\nUkeplan " + cl + "[Arbeidsplan " + cl + "](" + week + "?competenceAim=1 \"Se arbeidsplan\") [Åpne alle dagene](#)\n\n  \n\n##### ")[0].split("\n").map(m => m.replace("*   ", "• ")),
      "days": markdown.split("\n\n  \n\nUkeplan " + cl + "[Arbeidsplan " + cl + "](" + week + "?competenceAim=1 \"Se arbeidsplan\") [Åpne alle dagene](#)\n\n  \n\n##### ")[1].split("\n    \n\n##### ").map((day, index) => ({
        "title": day.split("\n\n*   ")[0],
        "topics": day.split("\n    \n    ##### ").splice(1).map(topic => ({
          "name": topic.split("\n    \n    ")[0],
          "time": topic.split("\n    \n    ")[1].split(" - "),
          "info": (topic.split("\n    \n    ")[2] || "").match(/(\*\*Lekse [0-9]:\*\*)|([0-9][0-9])/g) ? "" : (topic.split("\n    \n    ")[2] || ""),
          "timeStart": getTimestamp(index, topic.split("\n    \n    ")[1].split(" - ")[0]),
          "timeEnd": getTimestamp(index, topic.split("\n    \n    ")[1].split(" - ")[1]),
          "homework": topic.split(/\*\*Lekse [0-9]:\*\* /g).splice(1).map(homework => homework.split("\n    \n    ")[0])
        })).map((topic, i, topics) => { // merge topics if needed
          if (topic && topics[i - 1] && topics[i - 1].name == topic.name && topic.timeStart == topics[i - 1].timeEnd) {
            topic.timeStart = topics[i - 1].timeStart;
            topic.time[0] = topics[i - 1].time[0];
  
            for (const homework of topics[i - 1].homework) if (!topic.homework.includes(homework)) topic.homework.push(homework); // we merge the homework for this topic
  
            topics[i - 1] = null; // we remove the old one not in use filtered away
          }
          
          return topic;
        }).filter(topic => topic)
      })),
      "homework": homeworkMarkdown.replace(/#### Kompetansemål/g, "#####! Kompetansemål").replace(/#### Arbeid/g, "#####! Arbeid").replace(/##### Vurdering/g, "#####! Vurdering").replace(/\\-/g, "-").split("#### ").splice(1).map(homework => ({
        "topic": homework.split("\n\n")[0],
        "work": homework.includes("#####! Arbeid\n\n") ? homework.split("#####! Arbeid\n\n")[1].split("\n\n")[0].split("\n").map(m => m.replace("*   ", "• ")) : "",
        "evaluation": homework.includes("#####! Vurdering\n\n") ? homework.split("#####! Vurdering\n\n")[1].split("\n\n")[0].split("\n").map(m => m.replace("*   ", "• ")) : "",
        "competanceAim": homework.includes("#####! Kompetansemål\n\n") ? homework.split("#####! Kompetansemål\n\n")[1].split("\n\n")[0].split("\n").map(m => m.replace("*   ", "• ")) : ""
      })),
      "week": week
    };

    return timeplan[cl]
  } catch(e) {
    console.log(e);
  }
}

function getTimestamp(index, time) { // https://stackoverflow.com/a/4156516
  const date = getToday(), day = date.getDay() || 7, diff = date.getDate() - day + 1, stamp = new Date(date.setDate(diff + index));

  let [hours, minutes] = time.split(".");
  stamp.setHours(hours - config.hourOffset, minutes, 0, 0)

  return stamp.getTime();
}

start();