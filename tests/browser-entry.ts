import { mount } from "svelte";
import BrowserSettings from "./BrowserSettings.svelte";
HTMLElement.prototype.empty = function () { this.replaceChildren(); };
mount(BrowserSettings, { target: document.body });
