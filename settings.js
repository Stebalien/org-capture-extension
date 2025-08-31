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
  const { [key]: result } = await chrome.storage.sync.get({ [key]: DEFAULTS[key] });
  return result;
}

async function setSetting(key, value) {
  return chrome.storage.sync.set({ [key]: value });
}

async function clearSetting(key) {
  return chrome.storage.sync.remove(key);
}

export { getSetting, setSetting, clearSetting, DEFAULTS };
