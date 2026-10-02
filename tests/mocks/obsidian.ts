export class TFile {
  path: string; name: string; basename: string; extension: string;
  constructor(path = "Note.md") {
    this.path = path; this.name = path.split("/").pop()!;
    this.extension = this.name.split(".").pop()!; this.basename = this.name.slice(0, -(this.extension.length + 1));
  }
}
export class TFolder { constructor(public path = "Folder", public name = "Folder", public children: (TFile | TFolder)[] = []) {} }
export class App {}
export class Component { load() {} unload() {} }
export class MarkdownView {}
export class MarkdownRenderer { static render() {} static postProcess() {} }
export const notices: string[] = [];
export class Notice { constructor(message: string) { notices.push(message); } }
export async function requestUrl() { throw new Error("Network disabled in tests"); }
// Small DOM adapter for rendering the actual settings component in browser tests.
export class Setting {
  settingEl: HTMLElement;
  controlEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  constructor(container: HTMLElement) {
    this.settingEl = document.createElement("div"); this.settingEl.className = "setting-item";
    const info = document.createElement("div"); info.className = "setting-item-info";
    this.nameEl = document.createElement("div"); this.nameEl.className = "setting-item-name";
    this.descEl = document.createElement("div"); this.descEl.className = "setting-item-description";
    info.append(this.nameEl, this.descEl);
    this.controlEl = document.createElement("div"); this.controlEl.className = "setting-item-control";
    this.settingEl.append(info, this.controlEl); container.append(this.settingEl);
  }
  setName(value: string) { this.nameEl.textContent = value; return this; }
  setDesc(value: string) { this.descEl.textContent = value; return this; }
  setHeading() { return this; }
  addDropdown(callback) {
    const el = document.createElement("select"); this.controlEl.append(el);
    const component = { addOptions: (options) => { Object.entries(options).forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = String(label); el.append(option); }); return component; },
      setValue: (value) => { el.value = value; return component; }, onChange: (handler) => { el.addEventListener("change", () => handler(el.value)); return component; } };
    callback(component); return this;
  }
  addToggle(callback) {
    const el = document.createElement("input"); el.type = "checkbox"; this.controlEl.append(el);
    const component = { setTooltip: (value) => { el.title = value; return component; }, setValue: (value) => { el.checked = value; return component; },
      onChange: (handler) => { el.addEventListener("change", () => handler(el.checked)); return component; } };
    callback(component); return this;
  }
  addSlider(callback) {
    const el = document.createElement("input"); el.type = "range"; this.controlEl.append(el);
    const component = { setLimits: (min, max, step) => { el.min = min; el.max = max; el.step = step; return component; },
      setValue: (value) => { el.value = value; return component; }, showTooltip: () => component,
      onChange: (handler) => { el.addEventListener("input", () => handler(Number(el.value))); return component; } };
    callback(component); return this;
  }
  addButton(callback) {
    const buttonEl = document.createElement("button"); this.controlEl.append(buttonEl);
    const component = { buttonEl, setButtonText: (value) => { buttonEl.textContent = value; return component; }, setDisabled: (value) => { buttonEl.disabled = value; return component; },
      setCta: () => component, onClick: (handler) => { buttonEl.addEventListener("click", handler); return component; } };
    callback(component); return this;
  }
  addText(callback) {
    const inputEl = document.createElement("input"); this.controlEl.append(inputEl);
    const component = { inputEl, setValue: (value) => { inputEl.value = value; return component; }, setPlaceholder: (value) => { inputEl.placeholder = value; return component; },
      onChange: (handler) => { inputEl.addEventListener("input", () => handler(inputEl.value)); return component; } };
    callback(component); return this;
  }
}
export const setIcon = (element: HTMLElement, icon: string) => { element.textContent = icon; };
export const debounce = (callback: (...args: any[]) => void) => callback;
