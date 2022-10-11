require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
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
    selectors: selectors.grid,
  },
  {
    location: "downtown",
    url: "https://www.subarudowntown.com/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "barrie",
    url: "https://www.barriesubaru.com/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "oakville",
    url: "https://www.buddssubaru.com/new/WRX.html",
    selectors: selectors.list,
  },
  {
    location: "mississauga",
    url: "https://www.subarumiss.ca/new/WRX.html",
    selectors: selectors.list,
  },
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

    let newData;

    foundVehiclesList.forEach(({ name, color, location, sku }, i) => {
      if (i === 0) {
        newData = `${location},${color},${name},${sku}`;
      } else {
        newData += `\r\n${location},${color},${name},${sku}`;
      }
    });

    // get old file
    const vehicleFile = fs.readFileSync("./logs/vehicles.csv", {
      encoding: "utf-8",
    });

    // compare old file with new scrape
    if (newData !== vehicleFile) {
      // overwrite control
      fs.writeFileSync("./logs/vehicles.csv", newData);

      const attachment = fs
        .readFileSync("./logs/vehicles.csv")
        .toString("base64");

      const message = {
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
        subject: "WRX Scraper Update",
        text: "Please find attached.",
        attachments: [
          {
            content: attachment,
            filename: "vehicles.csv",
            type: "application/csv",
            disposition: "attachment",
          },
        ],
      };

      console.log("sending email...");

      await sgMail.send(message);

      console.log("email sent...");
    }
  } catch (e) {
    console.log(e);
  }
})();
