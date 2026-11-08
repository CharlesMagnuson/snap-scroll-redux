/**
 * Snap Scroll Redux Popup Script
 * Handles the popup interface for the extension
 * Firefox-compatible version
 */

// Use browser API if available, fallback to chrome for compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class SnapScrollReduxPopup {
  constructor() {
    this.enableToggle = document.getElementById('enableToggle');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.toggleLabel = document.getElementById('toggleLabel');
    
    this.init();
  }

  async init() {
    // Load current status
    await this.loadStatus();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.enableToggle.addEventListener('change', this.handleToggle.bind(this));
  }

  async loadStatus() {
    try {
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (tab?.id) {
        try {
          const response = await browserAPI.tabs.sendMessage(tab.id, { action: 'getStatus' });
          this.updateUI(response?.enabled ?? true);
        } catch (messageError) {
          // Content script might not be loaded yet
          console.log('Content script not ready:', messageError);
          this.updateUI(true);
        }
      }
    } catch (error) {
      console.log('Could not load status:', error);
      // Default to enabled if we can't get status
      this.updateUI(true);
    }
  }

  async handleToggle() {
    const isEnabled = this.enableToggle.checked;
    
    try {
      const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (tab?.id) {
        try {
          const response = await browserAPI.tabs.sendMessage(tab.id, { action: 'toggle' });
          this.updateUI(response?.enabled ?? isEnabled);
          this.showStatusChange();
        } catch (messageError) {
          console.log('Could not send message to content script:', messageError);
          // Try to inject content script if it's not loaded
          await this.injectContentScriptIfNeeded(tab.id);
          // Retry the message
          try {
            const response = await browserAPI.tabs.sendMessage(tab.id, { action: 'toggle' });
            this.updateUI(response?.enabled ?? isEnabled);
            this.showStatusChange();
          } catch (retryError) {
            console.log('Retry failed:', retryError);
            this.enableToggle.checked = !isEnabled;
            this.showError();
          }
        }
      }
    } catch (error) {
      console.log('Could not toggle extension:', error);
      // Revert toggle if action failed
      this.enableToggle.checked = !isEnabled;
      this.showError();
    }
  }

  async injectContentScriptIfNeeded(tabId) {
    // Try to inject content script for Firefox compatibility
    try {
      await browserAPI.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
    } catch (error) {
      console.log('Could not inject content script:', error);
    }
  }

  updateUI(isEnabled) {
    this.enableToggle.checked = isEnabled;
    
    if (isEnabled) {
      this.statusIndicator.classList.remove('disabled');
      this.toggleLabel.textContent = 'Extension Enabled';
    } else {
      this.statusIndicator.classList.add('disabled');
      this.toggleLabel.textContent = 'Extension Disabled';
    }
  }

  showStatusChange() {
    this.statusIndicator.classList.add('changed');
    setTimeout(() => {
      this.statusIndicator.classList.remove('changed');
    }, 300);
  }

  showError() {
    // Could add error UI here if needed
    console.log('Error occurred while toggling extension');
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SnapScrollReduxPopup();
  });
} else {
  new SnapScrollReduxPopup();
}