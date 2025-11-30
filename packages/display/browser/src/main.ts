import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

import * as Guacamole from "guacamole-common-js";

// Get display div from document
var display = document.getElementById("display")!;

// Instantiate client, using an HTTP tunnel for communications.
var guac = new Guacamole.Client(
  new Guacamole.HTTPTunnel("tunnel")
);

// Add client to display div
display.appendChild(guac.getDisplay().getElement());

// Error handler
guac.onerror = function(error) {
  alert(error);
};

// Connect
guac.connect();

// Disconnect on close
window.onunload = function() {
  guac.disconnect();
}

// Mouse
var mouse = new Guacamole.Mouse(guac.getDisplay().getElement());

mouse.onEach(['mousedown', 'mouseup', 'mousemove'], function sendMouseEvent(e) {
  guac.sendMouseState((e as Guacamole.Mouse.Event).state);
});

// Keyboard
var keyboard = new Guacamole.Keyboard(document);

keyboard.onkeydown = function (keysym) {
    guac.sendKeyEvent(1, keysym);
};

keyboard.onkeyup = function (keysym) {
    guac.sendKeyEvent(0, keysym);
};