export function playNotificationSound(type: 'new_lead' | 'follow_up' | 'general' = 'general') {
  if (typeof window === 'undefined') return;

  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Different sounds for different notifications
    const soundConfigs = {
      new_lead: {
        // Long, attention-grabbing sound for new leads
        frequencies: [800, 1000, 1200, 1000, 800],
        durations: [200, 200, 200, 200, 400],
        volumes: [0.3, 0.4, 0.5, 0.4, 0.3],
      },
      follow_up: {
        // Medium sound for follow-ups
        frequencies: [600, 800, 600],
        durations: [150, 150, 300],
        volumes: [0.3, 0.4, 0.3],
      },
      general: {
        // Short sound for general notifications
        frequencies: [800, 1000],
        durations: [100, 200],
        volumes: [0.3, 0.3],
      },
    };

    const config = soundConfigs[type];
    let startTime = audioContext.currentTime;

    config.frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(
        config.volumes[index],
        startTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        startTime + config.durations[index] / 1000
      );

      oscillator.start(startTime);
      oscillator.stop(startTime + config.durations[index] / 1000);

      startTime += config.durations[index] / 1000;
    });
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

export function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied');
  }

  if (Notification.permission === 'granted') {
    return Promise.resolve('granted');
  }

  if (Notification.permission !== 'denied') {
    return Notification.requestPermission();
  }

  return Promise.resolve('denied');
}

export function showDesktopNotification(
  title: string,
  options?: NotificationOptions & { playSound?: boolean; soundType?: 'new_lead' | 'follow_up' | 'general' }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported');
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Play sound if requested
    if (options?.playSound !== false) {
      playNotificationSound(options?.soundType || 'general');
    }

    return notification;
  } else {
    console.warn('Notification permission not granted');
  }
}
