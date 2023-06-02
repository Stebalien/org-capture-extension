const DEFAULTS = {
  selectionTemplate: "s",
  mediaTemplate: "m",
  linkTemplate: "l",
  defaultAction: "store",
  downloadMedia: true,
};

async function getSetting(key) {
  const { [key]: result } = await browser.storage.sync.get({ [key]: DEFAULTS[key] });
  return result;
}

async function loadSettings() {
  return browser.storage.sync.get(DEFAULTS);
}


async function storeSettings(settings) {
  return browser.storage.sync.set(settings);
}
