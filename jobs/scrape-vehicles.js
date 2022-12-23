require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// get css selectors for vehicle cards based on site layout
const selectors = {
  list: {
    vehicleCard: ".vehicle-list-cell",
    name: ".vehicle-year-make-model span[itemprop=model]",
    color: "td[itemprop=color]",
    sku: "td[itemprop=sku]",
  },
  grid: {
    vehicleCard: ".vehicle-grid-cell",
    name: ".vehicle-year-make-model-1 span[itemprop=model]",
    color: null,
    sku: "div.vehicle-information-grid",
  },
  // used only for maple subaru (incomplete)
  maple: {
    vehicleCard: ".vehicle-card-details-container",
    name: ".vehicle-card-title span.ddc-font-size-small",
    color: "li.exteriorColor",
  },
};

// contruct config obj for each dealer
const dealerConfig = [
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

    // select vehicles
    const items = $(selectors.vehicleCard);

    // return array of constructed vehicle information
    return items
      .map((i, el) => {
        const name = $(el).find(selectors.name).text();
        const color = $(el).find(selectors.color).text();
        const sku = $(el).find(selectors.sku).text();
        return { name, color, location, sku };
      })
      .toArray();
  } catch (e) {
    return new Error("error occured while attempting to scrape");
  }
}

// get array of promises
const foundVehiclesPromise = dealerConfig.map((c) => scrape(c));

// send spreadsheet of found vehicles
(async () => {
  try {
    // get found vehicles
    const foundVehiclesList = (await Promise.all(foundVehiclesPromise)).flat();

    // short circuit if no vehicles found
    if (foundVehiclesList.length === 0) {
      return;
    }

    // set header for spreadsheet
    let newData = "location,color,name,sku";

    // generate string of found vehicles + information
    foundVehiclesList.forEach(({ name, color, location, sku }) => {
      newData += `\r\n${location},${color},${name},${sku}`;
    });

    // retrieve data from previous scrape
    const vehicleFile = fs.readFileSync("./logs/vehicles.csv", {
      encoding: "utf-8",
    });

    // compare old data with new scrape data
    // if different, send email
    // otherwise do nothing
    if (newData !== vehicleFile) {
      // overwrite previous data
      fs.writeFileSync("./logs/vehicles.csv", newData);

      // get base64 encoding of new data in csv file
      const attachment = fs
        .readFileSync("./logs/vehicles.csv")
        .toString("base64");

      // construct email message
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

      // send email
      await sgMail.send(message);

      console.log("email sent...");
    }
  } catch (e) {
    console.log(e);
  }
})();
