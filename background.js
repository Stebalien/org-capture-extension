const icons = {
  "16": "emacs.svg",
  "32": "emacs.svg"
};

async function getSelection(tab) {
  const [{ result, error }] = await browser.scripting.executeScript({
    target: {
      tabId: tab.id,
    },
    func: () => {
      const selection = document.getSelection();
      if (selection?.isCollapsed) {
        return null;
      } else {
        return selection.toString();
      }
    }
  });
  if (error) {
    throw error;
  } else {
    return result;
  }
}

async function capture(template, url, title, selection) {
  let data = { url, title, template };
  if (selection) {
    data.body = selection;
  }
  await browser.tabs.update({
    url: `org-protocol://capture?${new URLSearchParams(data)}`,
  });
}

async function storeLink(url, title) {
  const data = { url, title };
  await browser.tabs.update({
    url: `org-protocol://store-link?${new URLSearchParams(data)}`,
  });
}

async function autoCapture(tab) {
  const selection = await getSelection(tab);
  const tmpl = await getSetting(selection ? "selectionTemplate" : "linkTemplate");
  return capture(tmpl, tab.url, tab.title, selection);
}

browser.browserAction.onClicked.addListener(async (tab) => {
  const defaultAction = await getSetting("defaultAction");
  switch (defaultAction) {
    case "store":
      return storeLink(tab.url, tab.title);
    case "capture":
      return autoCapture(tab);
    default:
      throw new Error(`unknown default action ${defaultAction}`);
  }
});

browser.menus.create({
  id: "capture-selection",
  title: "Capture Selection",
  contexts: ["selection"],
  icons: icons,
});

browser.menus.create({
  id: "capture-media",
  title: "Capture Media",
  contexts: ["audio", "video", "image"],
  icons: icons,
});

browser.menus.create({
  id: "store-link",
  title: "Store Link",
  contexts: ["page", "tab"],
  icons: icons,
});

browser.menus.create({
  id: "capture-link",
  title: "Capture Link",
  contexts: ["page", "tab"],
  icons: icons,
});

browser.menus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case "store-link":
      await storeLink(tab.url, tab.title);
      return;
    case "capture-selection":
      const selectionTemplate = await getSetting("selectionTemplate");
      await capture(selectionTemplate, tab.url, tab.title, info.selectionText);
      return;
    case "capture-link":
      const linkTemplate = await getSetting("linkTemplate");
      await capture(linkTemplate, tab.url, tab.title);
      return;
    case "capture-media":
      const downloadMedia = await getSetting("downloadMedia");
      if (!downloadMedia) {
        const mediaTemplate = await getSetting("mediaTemplate");
        await capture(mediaTemplate, tab.url, tab.title, info.srcUrl);
        return;
      }
      await browser.storage.local.set({
        [`_dl.${info.srcUrl}`]: { pageUrl: tab.url, pageTitle: tab.title, mediaUrl: info.srcUrl }
      });
      await browser.downloads.download({
        cookieStoreId: tab.cookieStoreId,
        saveAs: false,
        conflictAction: "uniquify",
        url: info.srcUrl,
      });
      return;
    default:
      throw new Error(`unknown menu item ${info.menuItemId}`);
  }
});

browser.commands.onCommand.addListener(async (action) => {
  const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
  switch (action) {
    case "store":
      await storeLink(tab.url, tab.title);
      return;
    case "capture":
      await autoCapture(tab);
      return;
    default:
      throw new Error(`unknown command ${action}`);
  }
});

browser.downloads.onChanged.addListener(async (change) => {
  // We're looking for newly finished downloads.
  if (change.state.previous == 'complete' || change.state.current != 'complete') {
    return;
  }

  let [dl] = await browser.downloads.search({ id: change.id });
  if (!dl) {
    return;
  }

  if (dl.byExtensionId != browser.runtime.id) {
    return;
  }

  const key = `_dl.${dl.url}`;
  const { [key]: metadata } = await browser.storage.local.get(key);
  if (!metadata) {
    return;
  }

  const mediaTemplate = await getSetting("mediaTemplate");
  await capture(mediaTemplate, metadata.pageUrl, metadata.pageTitle, `file:${dl.filename}`);
  await browser.storage.local.remove(key);
});

(function() {
  Object.entries(browser.storage.local.get())
    .filter(([key, _]) => key.startsWith("_dl."))
    .forEach(async ([k, v]) => {
      let [dl] = await browser.downloads.search({ url: v.mediaUrl });
      if (!dl) {
        await browser.storage.local.remove(k);
        return;
      }
      if (dl.state == "complete") {
        const mediaTemplate = await getSetting("mediaTemplate");
        await capture(mediaTemplate, metadata.pageUrl, metadata.pageTitle, `file:${dl.filename}`);
        await browser.storage.local.remove(k);
      }
    });
})();
