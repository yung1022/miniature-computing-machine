(() => {
  const START_DELAY_MS = 300;
  
  // === CONFIGURABLE INTERVALS (in milliseconds) ===
  const INTERVAL_ITEM23_MS = 6075;   // How often Item 23 runs
  const INTERVAL_BOOST_MS = 303750;   // How often Boost runs (e.g., 2 seconds)
  // ===============================================

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

  // 1. Fetch Item 23 definition
  function getItem23() {
    if (window.CONTENT_COMMANDS && Array.isArray(window.CONTENT_COMMANDS)) {
      if (window.CONTENT_COMMANDS[20]) return window.CONTENT_COMMANDS[20];
    }
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const content = extractConst('CONTENT_COMMANDS', scriptsText) || [];
    return content[20] || null;
  }

  // 2. Fetch BOOST_COMMAND definition
  function getBoostCommand() {
    if (window.BOOST_COMMAND && typeof window.BOOST_COMMAND === 'object' && !Array.isArray(window.BOOST_COMMAND)) {
      return window.BOOST_COMMAND;
    }
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const boost = extractConst('BOOST_COMMAND', scriptsText);
    return (boost && typeof boost === 'object' && !Array.isArray(boost)) ? boost : null;
  }

  const item23Def = getItem23();
  const boostDef = getBoostCommand();

  if (!item23Def && !boostDef) {
    console.error('No commands found (Item 23 or BOOST_COMMAND) — run this after the page has fully loaded.');
    return;
  }

  // Clear any existing independent intervals/timeouts to prevent collisions
  if (window._autoGrindItem23Interval) clearInterval(window._autoGrindItem23Interval);
  if (window._autoGrindItem23Timeout) clearTimeout(window._autoGrindItem23Timeout);
  if (window._autoGrindBoostInterval) clearInterval(window._autoGrindBoostInterval);
  if (window._autoGrindBoostTimeout) clearTimeout(window._autoGrindBoostTimeout);
  if (window.stopAutoGrind) delete window.stopAutoGrind;

  // Helper executor function
  function executeCommand(def) {
    if (!def) return;
    const cmd = { type: def.type, gain: def.gain, label: def.label };
    const btn = document.createElement('button');
    const labelEl = document.createElement('span');
    labelEl.textContent = cmd.label;
    btn.appendChild(labelEl);

    if (typeof window.doCommand !== 'function') {
      console.error('doCommand() not present on this page yet.');
      return;
    }

    try {
      window.doCommand(cmd, btn, labelEl);
    } catch (err) {
      console.error('doCommand threw:', err);
    }
  }

  // Start Item 23 independent loop
  if (item23Def) {
    window._autoGrindItem23Timeout = setTimeout(() => {
      window._autoGrindItem23Interval = setInterval(() => {
        executeCommand(item23Def);
      }, INTERVAL_ITEM23_MS);
      console.log(`Item 23 loop started (${INTERVAL_ITEM23_MS}ms interval).`);
    }, START_DELAY_MS);
  }

  // Start Boost independent loop
  if (boostDef) {
    window._autoGrindBoostTimeout = setTimeout(() => {
      window._autoGrindBoostInterval = setInterval(() => {
        executeCommand(boostDef);
      }, INTERVAL_BOOST_MS);
      console.log(`Boost loop started (${INTERVAL_BOOST_MS}ms interval).`);
    }, START_DELAY_MS);
  }

  // Unified stop function to clear everything cleanly
  window.stopAutoGrind = () => {
    if (window._autoGrindItem23Timeout) clearTimeout(window._autoGrindItem23Timeout);
    if (window._autoGrindItem23Interval) clearInterval(window._autoGrindItem23Interval);
    if (window._autoGrindBoostTimeout) clearTimeout(window._autoGrindBoostTimeout);
    if (window._autoGrindBoostInterval) clearInterval(window._autoGrindBoostInterval);
    
    delete window._autoGrindItem23Timeout;
    delete window._autoGrindItem23Interval;
    delete window._autoGrindBoostTimeout;
    delete window._autoGrindBoostInterval;
    delete window.stopAutoGrind;
    
    console.log('All auto-grind loops stopped.');
  };
})();
