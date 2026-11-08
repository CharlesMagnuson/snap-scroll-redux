/**
 * Snap Scroll Redux Popup Script
 * Handles the popup interface for the extension
 */

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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        this.updateUI(response?.enabled ?? true);
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
        this.updateUI(response?.enabled ?? isEnabled);
        this.showStatusChange();
      }
    } catch (error) {
      console.log('Could not toggle extension:', error);
      // Revert toggle if action failed
      this.enableToggle.checked = !isEnabled;
      this.showError();
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