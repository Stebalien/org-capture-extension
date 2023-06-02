async function loadOptions(form) {
  const settings = await loadSettings();

  for (const [key, value] of Object.entries(settings)) {
    const element = form.elements[key];
    if (element.type == 'checkbox') {
      element.checked = value;
    } else {
      element.value = value;
    }
  }
}

async function storeOptions(form) {
  const newSettings = Array.from(form.elements)
    .filter((el) => el.name)
    .map((el) => [el.name, el.type === 'checkbox' ? el.checked : el.value]);
  return storeSettings(Object.fromEntries(newSettings));
}

window.addEventListener("DOMContentLoaded", (_event) => {
  const form = document.getElementById('options');

  form.addEventListener('reset', function(_event) {
    loadOptions(this);
  });

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    storeOptions(this);
  });

  loadOptions(form);
});
