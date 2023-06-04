const DEFAULTS = {
  captureHtml: false,
  selectionCaptureTemplate: "s",
  selectionCaptureProtocol: "capture",
  mediaCaptureTemplate: "m",
  mediaCaptureProtocol: "capture",
  linkCaptureTemplate: "l",
  linkCaptureProtocol: "capture",
  defaultAction: "store",
  downloadMedia: true,
};

async function getSetting(key) {
  const { [key]: result } = await browser.storage.sync.get({ [key]: DEFAULTS[key] });
  return result;
}

async function setSetting(key, value) {
  return browser.storage.sync.set({ [key]: value });
}

async function clearSetting(key) {
  return browser.storage.sync.remove(key);
}
