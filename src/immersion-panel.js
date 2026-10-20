import { IMMERSION_MODULES, normalizeModules } from "./immersion-modules.js?v=5.2.1";

const STORAGE_KEY = "card-analyzer-5-optionals";
export function restoreSelections(raw) {
  let saved;
  try { saved = JSON.parse(raw || "{}"); } catch {}
  return Object.fromEntries(["single", "compareA", "compareB"].map(key => [key,
    Array.isArray(saved?.[key]) ? normalizeModules(saved[key]) : key === "single" ? ["datingProfile", "shoppingList"] : []
  ]));
}

export function mountImmersionPanel({onStorageError = () => {}, onChange = () => {}} = {}) {
  const panel = document.getElementById("immersionSettings");
  const list = document.getElementById("immersionChoices");
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch {}
  const selections = restoreSelections(raw);
  let mode = "single";
  const columns = () => mode === "compare" ? ["compareA", "compareB"] : ["single"];
  const caption = key => key === "single" ? "Include" : key === "compareA" ? "Card A" : "Card B";
  function render() {
    // Text comes only from the static module catalog; model/card text never enters this markup.
    list.replaceChildren();
    for (const mod of IMMERSION_MODULES) {
      const row = document.createElement("div"); row.className = "immersion-choice";
      const copy = document.createElement("div"); copy.className = "immersion-description";
      const title = document.createElement("strong"); title.id = "optional-" + mod.id; title.textContent = mod.label;
      const blurb = document.createElement("p"); blurb.textContent = mod.blurb;
      copy.append(title, blurb);
      if (mod.warning) {
        const warning = document.createElement("p"); warning.className = "immersion-warning"; warning.textContent = mod.warning; copy.append(warning);
      }
      row.append(copy);
      const controls = document.createElement("div"); controls.className = "immersion-toggles";
      for (const key of columns()) {
        const label = document.createElement("label");
        const input = document.createElement("input"); input.type = "checkbox";
        input.dataset.module = mod.id; input.dataset.selection = key; input.checked = selections[key].includes(mod.id);
        input.setAttribute("aria-label", mod.label + " — " + caption(key));
        label.append(input, document.createTextNode(caption(key))); controls.append(label);
      }
      row.append(controls); list.append(row);
    }
    updateCount();
  }
  function updateCount() {
    document.getElementById("immersionCount").textContent = mode === "single" ? selections.single.length + " active" :
      "A: " + selections.compareA.length + " · B: " + selections.compareB.length;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selections)); }
    catch { onStorageError("Optional selections work for this session, but browser storage could not save them."); }
    updateCount();onChange();
  }
  list.addEventListener("change", e => {
    const {module, selection} = e.target.dataset;
    if (!columns().includes(selection) || !normalizeModules([module]).length) return;
    selections[selection] = e.target.checked ? normalizeModules([...selections[selection], module]) : selections[selection].filter(id => id !== module);
    save();
  });
  panel.querySelectorAll("[data-optional-action]").forEach(button => button.addEventListener("click", () => {
    for (const key of columns()) selections[key] = button.dataset.optionalAction === "all" ? IMMERSION_MODULES.map(m => m.id) : [];
    save(); render();
  }));
  render();
  return {
    setMode(next) { mode = next; render(); },
    snapshot() { return {modules:[...selections.single], modulesA:[...selections.compareA], modulesB:[...selections.compareB]}; }
  };
}
