import assert from "node:assert/strict";
import { test } from "node:test";
import { createActivityShareUrl, createSharingControls } from "../src/static/sharing.js";

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.classList = {
      add: (name) => { this.className += ` ${name}`; },
      remove: (name) => {
        this.className = this.className.split(" ").filter((item) => item !== name).join(" ");
      },
    };
  }

  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(child) { this.children.push(child); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
}

globalThis.window = {
  location: { href: "https://school.example/static/index.html?activity=Old&private=value#old" },
};
globalThis.document = { createElement: (tag) => new Element(tag) };

const name = "Arts & Crafts + Friends / 音楽 #1?";
const schedule = "Monday, 3:00 PM - 4:00 PM";

test("direct links round-trip special characters and omit unrelated URL data", () => {
  const url = new URL(createActivityShareUrl(name));
  assert.equal(url.origin, "https://school.example");
  assert.equal(url.pathname, "/static/index.html");
  assert.deepEqual([...url.searchParams], [["activity", name]]);
  assert.equal(url.hash, "");
});

test("social destinations encode the exact activity link and public text", () => {
  const controls = createSharingControls(name, schedule);
  assert.equal(controls.attributes["aria-label"], `Share ${name}`);
  const links = controls.children.filter((child) => child.tagName === "a");
  assert.equal(links.length, 3);
  for (const link of links) {
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.match(link.attributes["aria-label"], /opens in a new tab/);
  }
  const whatsapp = new URL(links[0].href);
  assert.equal(whatsapp.hostname, "wa.me");
  assert.equal(
    whatsapp.searchParams.get("text"),
    `Join me at ${name} at Mergington High School! Schedule: ${schedule} ${createActivityShareUrl(name)}`
  );
  const facebook = new URL(links[1].href);
  assert.equal(facebook.hostname, "www.facebook.com");
  assert.equal(facebook.searchParams.get("u"), createActivityShareUrl(name));
  const x = new URL(links[2].href);
  assert.equal(x.hostname, "twitter.com");
  assert.equal(x.searchParams.get("url"), createActivityShareUrl(name));
  assert.ok(x.searchParams.get("text").includes(name));
  assert.ok(x.searchParams.get("text").includes(schedule));
});

test("copy link confirms successful copying", async () => {
  let copied;
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: async (value) => { copied = value; } } },
    configurable: true,
  });
  const controls = createSharingControls(name, schedule);
  const button = controls.children.find((child) => child.tagName === "button");
  await button.listeners.click();
  assert.equal(copied, createActivityShareUrl(name));
  assert.equal(controls.children.at(-1).textContent, "Link copied!");
});

test("unavailable or denied clipboard shows a selected manual link", async () => {
  for (const clipboard of [undefined, {
    writeText: async () => { throw new Error("Permission denied"); },
  }]) {
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard }, configurable: true,
    });
    const controls = createSharingControls(name, schedule);
    const button = controls.children.find((child) => child.tagName === "button");
    const input = controls.children.find((child) => child.tagName === "input");
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args);
    try {
      await button.listeners.click();
    } finally {
      console.error = originalError;
    }
    assert.equal(input.value, createActivityShareUrl(name));
    assert.equal(input.readOnly, true);
    assert.ok(!input.className.includes("hidden"));
    assert.ok(input.focused && input.selected);
    assert.match(controls.children.at(-1).textContent, /Select and copy/);
    assert.equal(errors.length, clipboard ? 1 : 0);
  }
});
