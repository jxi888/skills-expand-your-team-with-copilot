export function createActivityShareUrl(name) {
  const url = new URL("index.html", window.location.href);
  url.searchParams.set("activity", name);
  return url.href;
}

export function createSharingControls(name, schedule) {
  const url = createActivityShareUrl(name);
  const text = `Join me at ${name} at Mergington High School! Schedule: ${schedule}`;
  const controls = document.createElement("div");
  controls.className = "activity-sharing";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", `Share ${name}`);

  const label = document.createElement("span");
  label.className = "sharing-label";
  label.textContent = "Share activity:";
  controls.appendChild(label);

  const destinations = [
    ["WhatsApp", "https://wa.me/", { text: `${text} ${url}` }],
    ["Facebook", "https://www.facebook.com/sharer/sharer.php", { u: url }],
    ["X", "https://twitter.com/intent/tweet", { text, url }],
  ];

  destinations.forEach(([platform, address, parameters]) => {
    const destination = new URL(address);
    destination.search = new URLSearchParams(parameters).toString();
    const link = document.createElement("a");
    link.className = "share-link";
    link.textContent = platform;
    link.href = destination.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Share ${name} on ${platform} (opens in a new tab)`);
    controls.appendChild(link);
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-link-button";
  copyButton.textContent = "Copy link";
  copyButton.setAttribute("aria-label", `Copy link to ${name}`);
  controls.appendChild(copyButton);

  const manualLink = document.createElement("input");
  manualLink.type = "text";
  manualLink.readOnly = true;
  manualLink.value = url;
  manualLink.className = "manual-share-link hidden";
  manualLink.setAttribute("aria-label", `Link to ${name}`);
  controls.appendChild(manualLink);

  const status = document.createElement("span");
  status.className = "sharing-status";
  status.setAttribute("role", "status");
  controls.appendChild(status);

  copyButton.addEventListener("click", async () => {
    if (!navigator.clipboard?.writeText) {
      showManualLink();
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      manualLink.classList.add("hidden");
      status.textContent = "Link copied!";
    } catch (error) {
      console.error("Could not copy activity link:", error);
      showManualLink();
    }
  });

  function showManualLink() {
    status.textContent = "Couldn't copy automatically. Select and copy the displayed link.";
    manualLink.classList.remove("hidden");
    manualLink.focus();
    manualLink.select();
  }

  return controls;
}
