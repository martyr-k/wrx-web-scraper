const Bree = require("bree");

const bree = new Bree({
  jobs: [{ name: "scrape-vehicles", interval: "30m", timeout: "5s" }],
});

(async () => {
  await bree.start();
})();
