import { html, render } from "https://cdn.jsdelivr.net/npm/lit-html/+esm";
import { classMap } from "https://cdn.jsdelivr.net/npm/lit-html/directives/class-map.js";

let recognition, synth;
let listening = false;
const messages = [{ role: "system", content: "You are a helpful assistant" }];

function listen(state) {
  listening = state ?? listening;
  render(
    html`
      <div class="text-center">
        <button class="mic btn ${classMap({ "btn-danger": listening, "btn-primary": !listening })} px-5">
          <i class="bi bi-mic-fill fs-1"></i>
          <div class="pt-2 speak-btn-text">${listening ? "Listening..." : "Click to talk"}</div>
        </button>
      </div>
    `,
    document.querySelector("#mic"),
  );
  listening ? recognition.start() : recognition.stop();
  drawChat();
}

function drawChat() {
  render(
    html`
      <div class="chat">
        ${messages.map(
          (message) => html`
            <div class="chat-message my-2 ${message.role}">
              <div class="chat-message-content"><strong>${message.role}</strong>: ${message.content}</div>
            </div>
          `,
        )}
      </div>
    `,
    document.querySelector("#output"),
  );
}

try {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  synth = window.speechSynthesis;
  recognition.lang = "en-US";
  recognition.continuous = true;
  listen(false);
  document.querySelector(".mic").addEventListener("click", () => listen(!listening));
  recognition.addEventListener("result", async (event) => {
    messages.push({ role: "user", content: event.results[event.results.length - 1][0].transcript });
    listen(false);
    const response = await fetch("https://gramener.com/llmproxy/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages }),
    });
    // Append choices[*].message to messages
    const { choices } = await response.json();
    choices.forEach((choice) => messages.push(choice.message));
    drawChat();
    if (synth) {
      const utterance = new SpeechSynthesisUtterance(choices[0].message.content);
      utterance.addEventListener("end", () => listen(true));
      synth.speak(utterance);
    }
  });
} catch (err) {
  render(
    html`<div class="alert alert-danger" role="alert">Your browser does not support speech recognition.</div>`,
    document.querySelector("#output"),
  );
  throw err;
}
