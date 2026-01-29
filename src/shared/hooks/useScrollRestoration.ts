import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Custom hook to save and restore scroll position for a specific page
 * 
 * @param key - Unique identifier for the scroll position (usually the page path)
 * @param delay - Optional delay in milliseconds before restoring scroll (useful when content loads dynamically)
 */
export function useScrollRestoration(key: string, delay: number = 100) {
  const pathname = usePathname();
  const scrollKey = `scroll_position_${key}`;
  const isRestoringRef = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the scrollable container (the dashboard layout's content box)
    const getScrollContainer = (): HTMLElement | null => {
      // Return cached container if available
      if (containerRef.current && document.body.contains(containerRef.current)) {
        return containerRef.current;
      }

      // First try to find by ID (most reliable)
      const containerById = document.getElementById('dashboard-scroll-container');
      if (containerById) {
        containerRef.current = containerById;
        console.log('🎯 Found scrollable container by ID');
        return containerById;
      }

      // Fallback: Find all elements and check their computed styles
      const allElements = document.querySelectorAll('*');
      for (const element of Array.from(allElements)) {
        const el = element as HTMLElement;
        const style = window.getComputedStyle(el);
        
        // Look for the main scrollable container (overflow auto and has significant height)
        if ((style.overflow === 'auto' || style.overflowY === 'auto') && 
            el.scrollHeight > el.clientHeight &&
            el.clientHeight > 400) { // Must be a significant container
          containerRef.current = el;
          console.log('🎯 Found scrollable container by style');
          return el;
        }
      }
      return null;
    };

    // Save scroll position
    const saveScrollPosition = () => {
      if (!isRestoringRef.current) {
        const container = getScrollContainer();
        const scrollPosition = container ? container.scrollTop : window.scrollY;
        
        // Only save if scroll position is greater than 0 (avoid overwriting with 0)
        if (scrollPosition > 0) {
          sessionStorage.setItem(scrollKey, scrollPosition.toString());
          console.log(`💾 Saved scroll position: ${scrollPosition}px for ${key}`);
        } else {
          console.log(`⏭️ Skipped saving 0px scroll position for ${key}`);
        }
      }
    };

    // Restore scroll position when component mounts
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem(scrollKey);
      if (savedPosition) {
        isRestoringRef.current = true;
        
        console.log(`📍 Attempting to restore scroll position: ${savedPosition}px for ${key}`);
        
        // Try multiple times to ensure container is found and content is loaded
        let attempts = 0;
        const maxAttempts = 15;
        const attemptRestore = () => {
          const container = getScrollContainer();
          const targetScroll = parseInt(savedPosition, 10);
          
          if (container && container.scrollHeight > targetScroll) {
            // Content is loaded enough to scroll to target
            console.log(`✅ Restoring to container at ${targetScroll}px (scrollHeight: ${container.scrollHeight}px, attempt ${attempts + 1})`);
            
            // Use both methods to ensure scroll happens
            container.scrollTop = targetScroll;
            requestAnimationFrame(() => {
              container.scrollTop = targetScroll;
            });
            
            // Verify after a moment
            setTimeout(() => {
              if (Math.abs(container.scrollTop - targetScroll) > 10) {
                console.log(`⚠️ Scroll verification failed. Expected ${targetScroll}px, got ${container.scrollTop}px. Retrying...`);
                container.scrollTop = targetScroll;
              } else {
                console.log(`✅ Scroll position verified: ${container.scrollTop}px`);
              }
            }, 100);
            
            isRestoringRef.current = false;
          } else if (attempts < maxAttempts) {
            attempts++;
            console.log(`⏳ Container not ready (scrollHeight: ${container?.scrollHeight || 0}px, target: ${targetScroll}px), retrying... (attempt ${attempts})`);
            setTimeout(attemptRestore, 150);
          } else {
            console.log(`❌ Could not restore scroll after ${maxAttempts} attempts`);
            isRestoringRef.current = false;
          }
        };
        
        setTimeout(attemptRestore, delay);
      } else {
        console.log(`ℹ️ No saved scroll position found for ${key}`);
      }
    };

    // Restore scroll on mount
    restoreScrollPosition();

    // Save scroll position on scroll events (debounced)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 150);
    };

    // Save scroll position when clicking anywhere (to catch navigation clicks)
    const handleClick = () => {
      saveScrollPosition();
    };

    // Save scroll position before browser navigation
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    // Attach listeners to both window and container
    const container = getScrollContainer();
    
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true } as any);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Save scroll position before component unmounts (navigation)
    return () => {
      clearTimeout(scrollTimeout);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveScrollPosition();
      console.log(`👋 Component unmounting for ${key}, saved position before leaving`);
    };
  }, [scrollKey, delay, key]);

  // Don't clear scroll position on navigation - we want it to persist!
  // Only clear manually if needed (e.g., user logs out)
}
