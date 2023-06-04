window.addEventListener("DOMContentLoaded", async (_event) => {
  const form = document.getElementById('options');

  form.addEventListener('input', function(event) {
    const key = event.target.name;
    if (!key) {
      return;
    }
    if (event.target.type === 'checkbox') {
      setSetting(key, event.target.checked);
    } else if (event.target.value === "") {
      clearSetting(key);
    } else {
      setSetting(key, event.target.value);
    }
  });

  const settings = await browser.storage.sync.get(
    Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, undefined])),
  );

  for (const [key, value] of Object.entries(settings)) {
    const element = form.elements[key];
    if (element.type == 'checkbox') {
      element.checked = value ?? DEFAULTS[key];
    } else {
      element.placeholder = DEFAULTS[key];
      if (value != null) {
        element.value = value;
      }
    }
  }
});
