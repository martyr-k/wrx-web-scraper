require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const { readFile, writeFile } = require("node:fs/promises");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const selectors = {
  list: [
    ".vehicle-list-cell",
    ".vehicle-year-make-model span[itemprop=model]",
    "td[itemprop=color]",
    "td[itemprop=sku]",
  ],
  grid: [
    ".vehicle-grid-cell",
    ".vehicle-year-make-model-1 span[itemprop=model]",
    null,
    "div.vehicle-information-grid",
  ],
  maple: [
    ".vehicle-card-details-container",
    ".vehicle-card-title span.ddc-font-size-small",
    "li.exteriorColor",
  ],
};

const URLs = [
  {
    location: "markham",
    url: "https://www.markhamsubaru.com/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "scarboro",
    url: "https://www.scarborosubaru.ca/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "richmond hill",
    url: "https://www.rhsubaru.com/new/model/WRX",
    selectors: selectors.grid,
  },
  {
    location: "ogilve",
    url: "https://www.ogilviesubaru.com/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "willowdale",
    url: "https://www.willowdalesubaru.ca/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "whitby",
    url: "https://www.whitbysubaru.com/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "pfaff",
    url: "https://www.pfaffsubaru.com/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "newmarket",
    url: "https://www.nrsubaru.ca/new/WRX.html",
    selectors: selectors.list,
  },
  //   {
  //     location: "maple",
  //     url: "https://www.subaruofmaple.com/new-inventory/index.htm?model=Ascent",
  //     selectors: selectors.maple,
  //   },
];

async function scrape({ url, location, selectors }) {
  try {
    // fetch html
    const { data } = await axios.get(url);

    // load html
    const $ = cheerio.load(data);

    // select items
    const items = $(selectors[0]);

    return items
      .map((i, el) => {
        const name = $(el).find(selectors[1]).text();
        const color = $(el).find(selectors[2]).text();
        const sku = $(el).find(selectors[3]).text();
        return { name, color, location, sku };
      })
      .toArray();
  } catch (e) {
    return "error";
  }
}

const foundVehiclesPromise = URLs.map((l) => scrape(l));

(async () => {
  try {
    const foundVehiclesList = (await Promise.all(foundVehiclesPromise)).flat();

    console.log(foundVehiclesList);

    const writeStream = fs.createWriteStream("./logs/new-vehicles.txt");
    foundVehiclesList.forEach(({ name, color, location, sku }) => {
      writeStream.write(`${location}: ${color} ${name} ${sku} \n`);
    });
    writeStream.end();

    // compare new scrape against control
    const oldFile = await readFile("./logs/vehicles.txt", { encoding: "utf8" });
    const newFile = await readFile("./logs/new-vehicles.txt", {
      encoding: "utf8",
    });

    if (newFile !== oldFile) {
      await writeFile("./logs/vehicles.txt", newFile);

      const message = {
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
        subject: "WRX Scraper Update",
        text: newFile,
        html: `<p>${newFile}</p>`,
      };

      await sgMail.send(message);
    }
  } catch (e) {
    console.log(e);
  }
})();
