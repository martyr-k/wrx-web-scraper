const Bree = require("bree");

// set config for cron
const bree = new Bree({
  jobs: [{ name: "scrape-vehicles", interval: "10m", timeout: "5s" }],
});

// execute cron
(async () => {
  await bree.start();
})();
