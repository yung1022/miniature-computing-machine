(() => {
  const START_DELAY_MS = 300;
  
  // === CONFIGURABLE INTERVALS (in milliseconds) & SETTINGS ===
  const INTERVAL_ITEM19_MS = 6050;   // How often Item 19 runs
  const INTERVAL_BOOST_MS = 302500;   // How often Boost runs (e.g., every 2 seconds)
  const INTERVAL_COLLAB_MS = 300500;  // How often Collab runs (e.g., every 1 second)
  const TARGET_CHANNEL_ID = 'UCjrii0S-8k6sfc_ds3V-mRg'; // Change this to your target channel ID
  // =========================================================

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

  // 1. Fetch Item 19 definition
  function getItem19() {
    if (window.CONTENT_COMMANDS && Array.isArray(window.CONTENT_COMMANDS)) {
      if (window.CONTENT_COMMANDS[19]) return window.CONTENT_COMMANDS[19];
    }
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const content = extractConst('CONTENT_COMMANDS', scriptsText) || [];
    return content[19] || null;
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

  // 3. Fetch COLLAB_COMMAND definition
  function getCollabCommand() {
    if (window.COLLAB_COMMAND && typeof window.COLLAB_COMMAND === 'object' && !Array.isArray(window.COLLAB_COMMAND)) {
      return window.COLLAB_COMMAND;
    }
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const collab = extractConst('COLLAB_COMMAND', scriptsText);
    return (collab && typeof collab === 'object' && !Array.isArray(collab)) ? collab : null;
  }

  const item19Def = getItem19();
  const boostDef = getBoostCommand();
  const collabDef = getCollabCommand();

  if (!item19Def && !boostDef && !collabDef) {
    console.error('No commands found (Item 19, BOOST_COMMAND, or COLLAB_COMMAND) — run this after the page has fully loaded.');
    return;
  }

  // Clear any existing independent intervals/timeouts to prevent collisions
  if (window._autoGrindItem19Interval) clearInterval(window._autoGrindItem19Interval);
  if (window._autoGrindItem19Timeout) clearTimeout(window._autoGrindItem19Timeout);
  if (window._autoGrindBoostInterval) clearInterval(window._autoGrindBoostInterval);
  if (window._autoGrindBoostTimeout) clearTimeout(window._autoGrindBoostTimeout);
  if (window._autoGrindCollabInterval) clearInterval(window._autoGrindCollabInterval);
  if (window._autoGrindCollabTimeout) clearTimeout(window._autoGrindCollabTimeout);
  if (window.stopAutoGrind) delete window.stopAutoGrind;

  // Standard command executor for Item 19 and Boost
  function executeStandardCommand(def) {
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

  // Start Item 19 Loop
  if (item19Def) {
    window._autoGrindItem19Timeout = setTimeout(() => {
      window._autoGrindItem19Interval = setInterval(() => {
        executeStandardCommand(item19Def);
      }, INTERVAL_ITEM19_MS);
      console.log(`Item 19 loop started (${INTERVAL_ITEM19_MS}ms).`);
    }, START_DELAY_MS);
  }

  // Start Boost Loop
  if (boostDef) {
    window._autoGrindBoostTimeout = setTimeout(() => {
      window._autoGrindBoostInterval = setInterval(() => {
        executeStandardCommand(boostDef);
      }, INTERVAL_BOOST_MS);
      console.log(`Boost loop started (${INTERVAL_BOOST_MS}ms).`);
    }, START_DELAY_MS);
  }

  // Start Collab Loop using the custom Object.assign structure
  if (collabDef) {
    window._autoGrindCollabTimeout = setTimeout(() => {
      window._autoGrindCollabInterval = setInterval(() => {
        if (typeof window.doCommand !== 'function') {
          console.error('doCommand() not present on this page yet.');
          return;
        }

        try {
          const collabObj = Object.assign({}, collabDef, { extra: { to: TARGET_CHANNEL_ID } });
          const collabButton = document.createElement('button');
          const labelEl = document.createElement('span');
          labelEl.textContent = collabDef.label || 'Collab';
          collabButton.appendChild(labelEl);

          window.doCommand(collabObj, collabButton);
        } catch (err) {
          console.error('doCommand (collab) threw:', err);
        }
      }, INTERVAL_COLLAB_MS);
      console.log(`Collab loop started (${INTERVAL_COLLAB_MS}ms) for target channel ID: ${TARGET_CHANNEL_ID}`);
    }, START_DELAY_MS);
  }

  // Unified stop function to clear all loops cleanly
  window.stopAutoGrind = () => {
    if (window._autoGrindItem19Timeout) clearTimeout(window._autoGrindItem19Timeout);
    if (window._autoGrindItem19Interval) clearInterval(window._autoGrindItem19Interval);
    if (window._autoGrindBoostTimeout) clearTimeout(window._autoGrindBoostTimeout);
    if (window._autoGrindBoostInterval) clearInterval(window._autoGrindBoostInterval);
    if (window._autoGrindCollabTimeout) clearTimeout(window._autoGrindCollabTimeout);
    if (window._autoGrindCollabInterval) clearInterval(window._autoGrindCollabInterval);
    
    delete window._autoGrindItem19Timeout;
    delete window._autoGrindItem19Interval;
    delete window._autoGrindBoostTimeout;
    delete window._autoGrindBoostInterval;
    delete window._autoGrindCollabTimeout;
    delete window._autoGrindCollabInterval;
    delete window.stopAutoGrind;
    
    console.log('All auto-grind loops stopped.');
  };
})();
