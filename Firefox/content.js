/**
 * Snap Scroll Redux Content Script
 * Handles mouse interactions for snap scrolling and paragraph navigation
 * Firefox-compatible version
 */

// Use browser API if available, fallback to chrome for compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class SnapScrollRedux {
  constructor() {
    this.isLeftMouseDown = false;
    this.isEnabled = true;
    this.navBarHeight = 0;
    this.setupEventListeners();
    this.createVisualIndicator();
  }

  setupEventListeners() {
    // Track left mouse button state
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), true);
    document.addEventListener('mouseup', this.handleMouseUp.bind(this), true);
    
    // Handle context menu (right click) when left button is held
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this), true);
    
    // Handle middle mouse button for paragraph navigation
    document.addEventListener('auxclick', this.handleMiddleClick.bind(this), true);
    
    // Handle mouse leave to reset state
    document.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    // Handle visibility change to reset state
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Re-detect nav bar on scroll (in case it appears/disappears)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.detectNavBar();
      }, 150);
    });
    
    // Re-detect nav bar on resize
    window.addEventListener('resize', () => {
      this.detectNavBar();
    });
  }

  detectNavBar() {
    const elements = document.querySelectorAll('*');
    let maxNavHeight = 0;
    
    // Look for fixed or sticky elements at the top of the viewport
    for (const element of elements) {
      const style = window.getComputedStyle(element);
      const position = style.position;
      
      if (position === 'fixed' || position === 'sticky') {
        const rect = element.getBoundingClientRect();
        
        // Check if element is at the top of the viewport and visible
        if (rect.top <= 10 && rect.bottom > 0 && rect.height > 0) {
          // Also check if it's wide enough to be a nav bar (at least 50% of viewport width)
          if (rect.width >= window.innerWidth * 0.5) {
            // Check if element has reasonable height for a nav bar (not full screen)
            if (rect.height < window.innerHeight * 0.3) {
              maxNavHeight = Math.max(maxNavHeight, rect.bottom);
            }
          }
        }
      }
    }
    
    // Update the detected nav bar height
    this.navBarHeight = maxNavHeight;
    
    // Also check for common header tags that might be fixed
    const commonHeaders = ['header', 'nav', '[role="navigation"]', '[role="banner"]'];
    for (const selector of commonHeaders) {
      const headers = document.querySelectorAll(selector);
      for (const header of headers) {
        const style = window.getComputedStyle(header);
        if (style.position === 'fixed' || style.position === 'sticky') {
          const rect = header.getBoundingClientRect();
          if (rect.top <= 10 && rect.bottom > 0) {
            maxNavHeight = Math.max(maxNavHeight, rect.bottom);
          }
        }
      }
    }
    
    this.navBarHeight = maxNavHeight;
  }

  handleMouseDown(event) {
    if (event.button === 0) { // Left mouse button
      this.isLeftMouseDown = true;
      this.updateVisualIndicator();
    }
  }

  handleMouseUp(event) {
    if (event.button === 0) { // Left mouse button
      this.isLeftMouseDown = false;
      this.updateVisualIndicator();
    }
  }

  handleContextMenu(event) {
    if (this.isLeftMouseDown && this.isEnabled) {
      // Prevent default context menu
      event.preventDefault();
      event.stopPropagation();
      
      // Detect nav bar before scrolling
      this.detectNavBar();
      
      // Perform snap scroll
      this.snapScrollToPosition(event.clientY);
      
      // Reset state
      this.isLeftMouseDown = false;
      this.updateVisualIndicator();
      
      return false;
    }
  }

  handleMiddleClick(event) {
    if (event.button === 1 && this.isEnabled) { // Middle mouse button
      // Resolve the real click target. A listener on `document` sees a
      // retargeted event.target (the shadow host) for clicks inside shadow
      // DOM, so use composedPath() to get the actual node that was clicked.
      const target = this.resolveEventTarget(event);
      if (!target) {
        return;
      }
      
      // Middle-clicking a hyperlink must keep the browser's native behavior
      // (open in a background tab), so do not preventDefault in that case.
      if (this.findLinkElement(target)) {
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      
      // Find the paragraph that was clicked
      const clickedParagraph = this.findParagraphElement(target);
      
      if (clickedParagraph) {
        // Detect nav bar before scrolling
        this.detectNavBar();
        
        // Find and scroll to the next paragraph
        this.scrollToNextParagraph(clickedParagraph);
      }
      
      return false;
    }
  }
  
  resolveEventTarget(event) {
    // composedPath()[0] is the deepest node the event was dispatched on,
    // even when it lives inside an (open) shadow root.
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    let node = path.length > 0 ? path[0] : event.target;
    
    // Text nodes and the document itself are not elements; climb to one.
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode || (node.host ? node.host : null);
    }
    
    return node || null;
  }
  
  findLinkElement(element) {
    // Walk up through the element's ancestors, crossing shadow DOM
    // boundaries, looking for a real hyperlink (<a href> or <area href>).
    let current = element;
    while (current) {
      if (typeof current.closest === 'function') {
        const link = current.closest('a[href], area[href]');
        if (link) {
          return link;
        }
      }
      
      // Reached the top of this tree; if it is a shadow root, continue
      // from the host element in the containing tree.
      const root = current.getRootNode ? current.getRootNode() : null;
      current = root && root.host ? root.host : null;
    }
    
    return null;
  }

  findParagraphElement(element) {
    // Check if the clicked element itself is a paragraph
    if (this.isParagraphElement(element)) {
      return element;
    }
    
    // Traverse up the DOM tree to find a paragraph container
    let current = element.parentElement;
    while (current && current !== document.body) {
      if (this.isParagraphElement(current)) {
        return current;
      }
      current = current.parentElement;
    }
    
    return null;
  }

  isParagraphElement(element) {
    const tagName = element.tagName.toLowerCase();
    const paragraphTags = ['p', 'div', 'section', 'article', 'li', 'dd', 'blockquote'];
    
    // Check if it's a paragraph-like tag
    if (paragraphTags.includes(tagName)) {
      // Additional checks to ensure it contains meaningful text content
      const text = element.textContent.trim();
      if (text.length > 20) { // Minimum text length to be considered a paragraph
        return true;
      }
    }
    
    return false;
  }

  findNextParagraph(currentParagraph) {
    const allElements = Array.from(document.querySelectorAll('p, div, section, article, li, dd, blockquote'));
    
    // Filter to get only meaningful paragraphs
    const paragraphs = allElements.filter(el => {
      const text = el.textContent.trim();
      return text.length > 20 && this.isElementVisible(el);
    });
    
    // Find the current paragraph in the list
    const currentIndex = paragraphs.indexOf(currentParagraph);
    
    if (currentIndex !== -1 && currentIndex < paragraphs.length - 1) {
      // Return the next paragraph
      return paragraphs[currentIndex + 1];
    }
    
    // If current paragraph not found or is the last one, find the next visible paragraph after it
    const currentRect = currentParagraph.getBoundingClientRect();
    const currentTop = currentRect.top + window.pageYOffset;
    
    for (const paragraph of paragraphs) {
      const rect = paragraph.getBoundingClientRect();
      const paragraphTop = rect.top + window.pageYOffset;
      
      // Find the first paragraph that starts after the current one
      if (paragraphTop > currentTop + 10) { // 10px buffer
        return paragraph;
      }
    }
    
    return null;
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  scrollToNextParagraph(currentParagraph) {
    const nextParagraph = this.findNextParagraph(currentParagraph);
    
    if (nextParagraph) {
      const rect = nextParagraph.getBoundingClientRect();
      const absoluteTop = rect.top + window.pageYOffset;
      
      // Calculate scroll position accounting for nav bar
      const targetScrollY = absoluteTop - this.navBarHeight - 10; // 10px buffer
      
      // Ensure we don't scroll past the document boundaries
      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const finalScrollY = Math.min(Math.max(0, targetScrollY), maxScrollY);
      
      // Smooth scroll to the next paragraph
      window.scrollTo({
        top: finalScrollY,
        behavior: 'smooth'
      });
      
      // Show visual feedback
      this.showParagraphFeedback(nextParagraph);
    }
  }

  showParagraphFeedback(paragraph) {
    // Add a temporary highlight to the paragraph
    const originalBackground = paragraph.style.backgroundColor;
    const originalTransition = paragraph.style.transition;
    
    paragraph.style.transition = 'background-color 0.3s ease';
    paragraph.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
    
    setTimeout(() => {
      paragraph.style.backgroundColor = originalBackground;
      setTimeout(() => {
        paragraph.style.transition = originalTransition;
      }, 300);
    }, 300);
  }

  handleMouseLeave() {
    // Reset state when mouse leaves the document
    this.isLeftMouseDown = false;
    this.updateVisualIndicator();
  }

  handleVisibilityChange() {
    // Reset state when tab becomes hidden
    if (document.hidden) {
      this.isLeftMouseDown = false;
      this.updateVisualIndicator();
    }
  }

  snapScrollToPosition(clientY) {
    // Calculate the current scroll position
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Calculate the target scroll position
    // We want the clicked position to be at the top of the viewport (or below nav bar)
    const targetScrollY = currentScrollY + clientY - this.navBarHeight;
    
    // Add a small buffer to ensure content isn't too close to nav bar
    const buffer = this.navBarHeight > 0 ? 5 : 0;
    const finalTargetScrollY = targetScrollY - buffer;
    
    // Ensure we don't scroll past the document boundaries
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const finalScrollY = Math.min(Math.max(0, finalTargetScrollY), maxScrollY);
    
    // Smooth scroll to the target position
    window.scrollTo({
      top: finalScrollY,
      behavior: 'smooth'
    });

    // Show a brief visual feedback at the target position
    this.showScrollFeedback(this.navBarHeight);
  }

  createVisualIndicator() {
    // Create a visual indicator for when snap scroll is active
    this.indicator = document.createElement('div');
    this.indicator.id = 'snap-scroll-indicator';
    this.indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 12px;
      height: 12px;
      background: #4285f4;
      border-radius: 50%;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      border: 2px solid rgba(66, 133, 244, 0.3);
    `;
    document.body.appendChild(this.indicator);
  }

  updateVisualIndicator() {
    if (this.indicator) {
      this.indicator.style.opacity = this.isLeftMouseDown ? '1' : '0';
      
      // If nav bar is detected, show indicator below it
      if (this.navBarHeight > 0 && this.isLeftMouseDown) {
        this.indicator.style.top = (this.navBarHeight + 10) + 'px';
      } else {
        this.indicator.style.top = '10px';
      }
    }
  }

  showScrollFeedback(navBarOffset) {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #4285f4, transparent);
      z-index: 9999;
      pointer-events: none;
      opacity: 0.8;
      animation: snapScrollFade 0.6s ease-out forwards;
    `;
    
    // Position it at the top of the viewport after scroll (accounting for nav bar)
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    feedback.style.top = (scrollTop + navBarOffset) + 'px';
    
    // Add fade animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes snapScrollFade {
        0% { opacity: 0.8; transform: scaleX(0); }
        50% { opacity: 1; transform: scaleX(1); }
        100% { opacity: 0; transform: scaleX(1); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(feedback);
    
    // If nav bar is detected, show a second line to indicate the offset
    if (navBarOffset > 0) {
      const offsetIndicator = document.createElement('div');
      offsetIndicator.style.cssText = `
        position: fixed;
        left: 0;
        right: 0;
        top: ${navBarOffset}px;
        height: 1px;
        background: rgba(66, 133, 244, 0.3);
        z-index: 9998;
        pointer-events: none;
        animation: snapScrollFade 0.6s ease-out forwards;
      `;
      document.body.appendChild(offsetIndicator);
      
      setTimeout(() => {
        if (offsetIndicator.parentNode) {
          offsetIndicator.parentNode.removeChild(offsetIndicator);
        }
      }, 600);
    }
    
    // Remove feedback after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 600);
  }

  // Public method to toggle extension
  toggle() {
    this.isEnabled = !this.isEnabled;
    this.isLeftMouseDown = false;
    this.updateVisualIndicator();
    return this.isEnabled;
  }

  // Public method to check if enabled
  isActive() {
    return this.isEnabled;
  }
}

// Initialize the snap scroll redux functionality
const snapScrollRedux = new SnapScrollRedux();

// Listen for messages from popup or other extension parts
if (browserAPI && browserAPI.runtime && browserAPI.runtime.onMessage) {
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
      const isEnabled = snapScrollRedux.toggle();
      sendResponse({ enabled: isEnabled });
    } else if (request.action === 'getStatus') {
      sendResponse({ enabled: snapScrollRedux.isActive() });
    }
    // Return true to indicate we'll send a response asynchronously (Firefox compatibility)
    return true;
  });
}

// Cleanup function
window.addEventListener('beforeunload', () => {
  if (snapScrollRedux.indicator && snapScrollRedux.indicator.parentNode) {
    snapScrollRedux.indicator.parentNode.removeChild(snapScrollRedux.indicator);
  }
});