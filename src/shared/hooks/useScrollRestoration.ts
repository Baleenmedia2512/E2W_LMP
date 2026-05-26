import { useEffect, useRef } from 'react';

/**
 * Custom hook to save and restore scroll position for a specific page.
 * Uses ID-based container lookup and MutationObserver for restore — no full DOM scan.
 *
 * @param key - Unique identifier for the scroll position (usually the page path)
 * @param delay - Optional delay in milliseconds before restoring scroll
 */
export function useScrollRestoration(key: string, delay: number = 100) {
  const scrollKey = `scroll_position_${key}`;
  const containerRef = useRef<HTMLElement | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getScrollContainer = (): HTMLElement | null => {
      if (containerRef.current && document.body.contains(containerRef.current)) {
        return containerRef.current;
      }
      const el = document.getElementById('dashboard-scroll-container');
      if (el) containerRef.current = el;
      return el ?? null;
    };

    const saveScrollPosition = () => {
      const container = getScrollContainer();
      const pos = container ? container.scrollTop : window.scrollY;
      if (pos > 0) {
        sessionStorage.setItem(scrollKey, pos.toString());
      }
    };

    const restoreScrollPosition = () => {
      const saved = sessionStorage.getItem(scrollKey);
      if (!saved) return;
      const target = parseInt(saved, 10);

      const attempt = () => {
        const container = getScrollContainer();
        if (!container) return;

        if (container.scrollHeight >= target) {
          container.scrollTop = target;
          return;
        }

        // Content not yet tall enough — wait for DOM changes
        const observer = new MutationObserver(() => {
          if (container.scrollHeight >= target) {
            container.scrollTop = target;
            observer.disconnect();
          }
        });
        observer.observe(container, { childList: true, subtree: true });
        // Safety: disconnect after 3 seconds
        setTimeout(() => observer.disconnect(), 3000);
      };

      setTimeout(() => requestAnimationFrame(attempt), delay);
    };

    restoreScrollPosition();

    const handleScroll = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(saveScrollPosition, 200);
    };

    const container = getScrollContainer();
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', saveScrollPosition);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', saveScrollPosition);
      saveScrollPosition();
    };
  }, [scrollKey, delay]);
}
