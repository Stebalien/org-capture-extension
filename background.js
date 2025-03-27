import { getSetting } from "./settings.js";

async function getDescription(tab) {
  const [{ result, error }] = await chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
    },
    func: () => {
      const descriptionQuery = 'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]';
      const description = document.head.querySelector(descriptionQuery)?.getAttribute('content');
      if (!description) {
        return null;
      }
      const container = document.createElement("div");
      container.innerHTML = description;
      const text = container.innerText.trim();
      return text.length > 0 ? text : null;
    }
  });
  if (error) {
    throw error;
  } else {
    return result;
  }
}

async function getSelection(tab, html) {
  const [{ result, error }] = await chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
    },
    args: [html],
    func: (html) => {
      const selection = document.getSelection();
      if (selection?.isCollapsed) {
        return null;
      }
      if (!html) {
        return selection.toString();
      }

      // The following has been adapted (and heavily modified) from
      // https://github.com/alphapapa/org-protocol-capture-html

      // Copy out the selection.
      const container = document.createElement("div");
      for (let i = 0, len = selection.rangeCount; i < len; ++i) {
        container.appendChild(selection.getRangeAt(i).cloneContents());
      }

      // Remove invisible elements.
      for (const element of container.getElementsByTagName('*')) {
        if (window.getComputedStyle(element).display === 'none') {
          element.remove();
        }
      }

      // Make links absolute.
      var elementTypes = [
        ["a", "href"],
        ["source", "src"],
        ["video", "src"],
        ["audio", "src"],
        ["picture", "src"],
        ["img", "src"],
      ];
      for (const [tag, attr] of elementTypes) {
        for (const element of container.getElementsByTagName(tag)) {
          element.setAttribute(
            attr,
            new URL(element.getAttribute(attr), document.baseURI),
          );
        }
      }
      return container.innerHTML;
    }
  });
  if (error) {
    throw error;
  } else {
    return result;
  }
}

async function capture(which, url, title, selection) {
  const template = await getSetting(`${which}CaptureTemplate`);
  const protocol = await getSetting(`${which}CaptureProtocol`);
  let data = { url, title, template };
  if (selection) {
    data.body = selection;
  }
  await chrome.tabs.update({
    url: `org-protocol://${protocol}?${new URLSearchParams(data)}`,
  });
}

async function storeLink(url, title) {
  const data = { url, title };
  await chrome.tabs.update({
    url: `org-protocol://store-link?${new URLSearchParams(data)}`,
  });
}

async function autoCapture(tab) {
  const html = await getSetting("captureHtml");
  let body = await getSelection(tab, html);
  let which = "selection";
  if (!body) {
    which = "link";
    body = await getDescription(tab);
  }
  return capture(which, tab.url, tab.title, body);
}

chrome.action.onClicked.addListener(async (tab) => {
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

chrome.contextMenus.create({
  id: "capture-selection",
  title: "Capture Selection",
  contexts: ["selection"],
});

chrome.contextMenus.create({
  id: "capture-media",
  title: "Capture Media",
  contexts: ["audio", "video", "image"],
});

chrome.contextMenus.create({
  id: "store-link",
  title: "Store Link",
  contexts: ["link"],
});

chrome.contextMenus.create({
  id: "capture-link",
  title: "Capture Link",
  contexts: ["link"],
});

chrome.contextMenus.create({
  id: "store-page-link",
  title: "Store Page Link",
  contexts: ["page"],
});

chrome.contextMenus.create({
  id: "capture-page-link",
  title: "Capture Page Link",
  contexts: ["page"],
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case "store-link":
      await storeLink(info.linkUrl, info.linkText);
      return;
    case "store-page-link":
      await storeLink(tab.url, tab.title);
      return;
    case "capture-selection":
      const html = await getSetting("captureHtml");
      const selection = html ? await getSelection(tab, html) : info.selectionText;
      await capture("selection", tab.url, tab.title, selection, html);
      return;
    case "capture-link":
      await capture("link", info.linkUrl, info.linkText, null);
      return;
    case "capture-page-link":
      const description = await getDescription(tab);
      await capture("link", tab.url, tab.title, description);
      return;
    case "capture-media":
      const downloadMedia = await getSetting("downloadMedia");
      if (!downloadMedia) {
        await capture("media", tab.url, tab.title, info.srcUrl);
        return;
      }
      await chrome.storage.local.set({
        [`_dl.${info.srcUrl}`]: { pageUrl: tab.url, pageTitle: tab.title, mediaUrl: info.srcUrl }
      });
      await chrome.downloads.download({
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

chrome.commands.onCommand.addListener(async (action) => {
  const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
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

chrome.downloads.onChanged.addListener(async (change) => {
  // We're looking for newly finished downloads.
  if (change.state.previous == 'complete' || change.state.current != 'complete') {
    return;
  }

  let [dl] = await chrome.downloads.search({ id: change.id });
  if (!dl) {
    return;
  }

  if (dl.byExtensionId != chrome.runtime.id) {
    return;
  }

  const key = `_dl.${dl.url}`;
  const { [key]: metadata } = await chrome.storage.local.get(key);
  if (!metadata) {
    return;
  }

  await capture("media", metadata.pageUrl, metadata.pageTitle, `file:${dl.filename}`);
  await chrome.storage.local.remove(key);
});

(function() {
  Object.entries(chrome.storage.local.get())
    .filter(([key, _]) => key.startsWith("_dl."))
    .forEach(async ([k, v]) => {
      let [dl] = await chrome.downloads.search({ url: v.mediaUrl });
      if (!dl) {
        await chrome.storage.local.remove(k);
        return;
      }
      if (dl.state == "complete") {
        await capture("media", metadata.pageUrl, metadata.pageTitle, `file:${dl.filename}`);
        await chrome.storage.local.remove(k);
      }
    });
})();
