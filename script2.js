(() => {
  const START_DELAY_MS = 300;
  const INTERVAL_MS = 6100;

  function tryFromWindow() {
    if (window.CONTENT_COMMANDS && Array.isArray(window.CONTENT_COMMANDS)) {
      const item = window.CONTENT_COMMANDS[23]; // Selects item 23
      return item ? [item] : [];
    }
    return [];
  }

  function extractConst(name, scriptsText) {
    const re = new RegExp('const\\s+' + name + '\\s*=\\s*([\\s\\S]*?);');
    const m = scriptsText.match(re);
    if (!m) return null;
    try {
      return (new Function('return ' + m[1]))();
    } catch (e) {
      return null;
    }
  }

  function getFromScripts() {
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const content = extractConst('CONTENT_COMMANDS', scriptsText) || [];
    const item = content[20]; // Selects item 23 from parsed script text
    return item ? [item] : [];
  }

  function buildList() {
    const fromWindow = tryFromWindow();
    if (fromWindow.length) return fromWindow;
    const fromScripts = getFromScripts();
    if (fromScripts.length) return fromScripts;
    return [];
  }

  const commands = buildList();
  if (!commands.length) {
    console.error('No commands found or item 23 does not exist — run this after the page has fully loaded.');
    return;
  }

  // Clear previous interval if exists
  if (window._autoGrindInterval) {
    clearInterval(window._autoGrindInterval);
    delete window._autoGrindInterval;
  }
  if (window._autoGrindTimeout) {
    clearTimeout(window._autoGrindTimeout);
    delete window._autoGrindTimeout;
  }
  if (window.stopAutoGrind) delete window.stopAutoGrind;

  let idx = 0;
  window._autoGrindTimeout = setTimeout(() => {
    window._autoGrindInterval = setInterval(() => {
      const def = commands[idx % commands.length];
      const cmd = { type: def.type, gain: def.gain, label: def.label };
      const btn = document.createElement('button');
      const labelEl = document.createElement('span');
      labelEl.textContent = cmd.label;
      btn.appendChild(labelEl);

      if (typeof window.doCommand !== 'function') {
        console.error('doCommand() not present on this page yet — stopping auto-grind.');
        clearInterval(window._autoGrindInterval);
        delete window._autoGrindInterval;
        return;
      }

      try {
        window.doCommand(cmd, btn, labelEl);
      } catch (err) {
        console.error('doCommand threw:', err);
        clearInterval(window._autoGrindInterval);
        delete window._autoGrindInterval;
      }
      idx++;
    }, INTERVAL_MS);
    console.log('Auto-grind started for item 23. Command:', commands.map(c => c.type).join(', '));
  }, START_DELAY_MS);

  window.stopAutoGrind = () => {
    if (window._autoGrindTimeout) {
      clearTimeout(window._autoGrindTimeout);
      delete window._autoGrindTimeout;
    }
    if (window._autoGrindInterval) {
      clearInterval(window._autoGrindInterval);
      delete window._autoGrindInterval;
      delete window.stopAutoGrind;
      console.log('Auto-grind stopped.');
    } else {
      console.log('No auto-grind running.');
    }
  };
})();

console.log("script2.js started on", window.location.href);

setInterval(() => {
  console.log("script2.js heartbeat", new Date().toISOString());
}, 10000);