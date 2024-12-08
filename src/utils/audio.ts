const DEBUG_AUDIO = true;
const debugAudio = (message: string, data?: any) => {
  if (DEBUG_AUDIO) {
    console.log(`🔊 [Audio]: ${message}`, data || '');
  }
};

const createSilentBuffer = (context: AudioContext) => {
  const buffer = context.createBuffer(1, 1, 22050);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  return source;
};

const unlockAudioContext = async (context: AudioContext) => {
  debugAudio('Attempting to unlock AudioContext');
  const source = createSilentBuffer(context);
  try {
    await context.resume();
    source.start(0);
    debugAudio('AudioContext unlocked successfully');
    return true;
  } catch (error) {
    debugAudio('Failed to unlock AudioContext', error);
    return false;
  }
};

class AudioManager {
  private bgMusic: HTMLAudioElement;
  private bgMusicGameless: HTMLAudioElement;
  private hasPermission: boolean = false;
  private isLoading: boolean = false;
  private permissionRetries: number = 0;
  private maxRetries: number = 3;
  private waitingForInteraction: boolean = true;
  private audioContext?: AudioContext;
  private initialized: boolean = false;

  private sounds: {
    correct: HTMLAudioElement;
    incorrect: HTMLAudioElement;
    obstacleHit: HTMLAudioElement;
    gameOver: HTMLAudioElement;
    levelComplete: HTMLAudioElement;
    coinPickup: HTMLAudioElement;
    buttonClick: HTMLAudioElement;
  };
  private isMuted: boolean = false;

  constructor() {
    // Initialize without creating Audio objects
    this.bgMusic = new Audio();
    this.bgMusicGameless = new Audio();
    
    this.sounds = {
      buttonClick: new Audio(),
      correct: new Audio(),
      incorrect: new Audio(),
      obstacleHit: new Audio(),
      gameOver: new Audio(),
      levelComplete: new Audio(),
      coinPickup: new Audio(),
    };

    const storedMute = localStorage.getItem("gameMuted");
    this.isMuted = storedMute === "true";
  }

  private async checkAudioPermission() {
    if (this.waitingForInteraction) {
      return false;
    }

    try {
      if (this.hasPermission) return true;
      
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (context.state === 'suspended') {
        await context.resume();
      }
      this.hasPermission = true;
      return true;
    } catch (error) {
      console.warn('Audio context failed to initialize:', error);
      this.hasPermission = false;
      this.permissionRetries++;
      return false;
    }
  }

  async requestPermission() {
    if (this.isLoading || this.hasPermission) return this.hasPermission;
    this.isLoading = true;
    
    try {
      // Only create AudioContext after user interaction
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Initialize audio sources after context is ready
      this.initializeAudioSources();
      
      this.hasPermission = true;
      this.initialized = true;
      await this.preloadSounds();
      
      return true;
    } catch (error) {
      console.warn('Audio permission not granted:', error);
      this.hasPermission = false;
      this.initialized = false;
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  private initializeAudioSources(): void {
    // Initialize background music
    this.bgMusic.src = `${process.env.PUBLIC_URL}/sounds/background-music.mp3`;
    this.bgMusicGameless.src = `${process.env.PUBLIC_URL}/sounds/background-music-gameless.mp3`;
    
    [this.bgMusic, this.bgMusicGameless].forEach(audio => {
      audio.loop = true;
      audio.volume = 0.3;
    });

    // Initialize sound effects
    const soundFiles: Record<keyof typeof this.sounds, string> = {
      buttonClick: "button-click.wav",
      correct: "correct.mp3",
      incorrect: "incorrect.mp3",
      obstacleHit: "obstacle-hit.wav",
      gameOver: "game-over.wav",
      levelComplete: "level-complete.wav",
      coinPickup: "coin.mp3"
    };

    Object.entries(soundFiles).forEach(([key, file]) => {
      this.sounds[key as keyof typeof this.sounds].src = 
        `${process.env.PUBLIC_URL}/sounds/${file}`;
    });
  }

  private async ensureAudioContext(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      return this.audioContext.state === 'running';
    } catch (error) {
      console.warn('Audio context error:', error);
      return false;
    }
  }

  private async initAudioContext(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        // Force webkit prefix for iOS
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContext();
      }
      
      // iOS requires resume to be called from a user interaction
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      return this.audioContext.state === 'running';
    } catch (error) {
      console.warn('Failed to initialize AudioContext:', error);
      return false;
    }
  }

  async handleUserInteraction() {
    debugAudio('Starting user interaction handler');
    if (!this.waitingForInteraction || this.initialized) {
      debugAudio('Already initialized or not waiting for interaction', {
        waitingForInteraction: this.waitingForInteraction,
        initialized: this.initialized
      });
      return this.initialized;
    }

    this.waitingForInteraction = false;
    debugAudio('User interaction detected, initializing audio...');

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    debugAudio('Browser detection', { isSafari, userAgent: navigator.userAgent });

    try {
      // Initialize audio context first
      debugAudio('Creating AudioContext');
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
      debugAudio('AudioContext state', { state: this.audioContext.state });

      // Initialize sources before attempting to play
      debugAudio('Initializing audio sources');
      this.initializeAudioSources();

      // Configure audio elements
      const audioElements = [
        this.bgMusic,
        this.bgMusicGameless,
        ...Object.values(this.sounds)
      ];

      debugAudio('Configuring audio elements');
      audioElements.forEach(audio => {
        audio.preload = 'auto';
        audio.volume = 0;
        audio.load();
      });

      if (isSafari) {
        debugAudio('Using Safari-specific initialization');
        // Create and play a very short silent sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.01; // Very low volume
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(0);
        oscillator.stop(0.1);

        // Wait a brief moment before continuing
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Resume audio context
      if (this.audioContext.state === 'suspended') {
        debugAudio('Resuming AudioContext');
        await this.audioContext.resume();
        debugAudio('AudioContext resumed', { state: this.audioContext.state });
      }

      // Restore volumes
      debugAudio('Restoring volumes');
      this.bgMusic.volume = 0.3;
      this.bgMusicGameless.volume = 0.3;
      Object.values(this.sounds).forEach(sound => {
        sound.volume = 1.0;
      });

      this.hasPermission = true;
      this.initialized = true;
      debugAudio('Audio initialization complete', {
        hasPermission: this.hasPermission,
        initialized: this.initialized,
        contextState: this.audioContext?.state
      });
      
      return true;
    } catch (error) {
      debugAudio('Audio initialization failed', error);
      this.hasPermission = false;
      this.initialized = false;
      return false;
    }
  }

  async isInitialized() {
    if (this.initialized) return true;
    if (!this.waitingForInteraction) {
      const ready = await this.ensureAudioContext();
      this.initialized = ready;
      return ready;
    }
    return false;
  }

  private createAudio(filename: string): HTMLAudioElement {
    const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/${filename}`);
    audio.addEventListener("error", (e) => {
      console.error(`Error loading sound ${filename}:`, e);
    });
    return audio;
  }

  async preloadSounds() {
    const loadAudio = async (audio: HTMLAudioElement): Promise<void> => {
      try {
        // Force load for iOS
        audio.load();
        // Try to play and immediately pause
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {
        console.warn('Failed to preload audio:', error);
      }
    };

    const loadPromises = [
      loadAudio(this.bgMusic),
      loadAudio(this.bgMusicGameless),
      ...Object.values(this.sounds).map(sound => loadAudio(sound))
    ];

    try {
      await Promise.all(loadPromises);
    } catch (error) {
      console.error("Error during audio preloading:", error);
    }
  }

  async playBackgroundMusic() {
    if (!this.hasPermission) {
      const permission = await this.requestPermission();
      if (!permission) return;
    }
    
    if (this.isMuted) return;

    try {
      // Make sure the music is ready to play
      if (this.bgMusic.readyState < 4) {
        await new Promise((resolve) => {
          this.bgMusic.addEventListener('canplaythrough', resolve, { once: true });
          this.bgMusic.load();
        });
      }
      
      this.bgMusic.currentTime = 0;
      await this.bgMusic.play();
    } catch (error) {
      console.warn('Background music playback failed:', error);
    }
  }

  playButtonSound() {
    this.playSound(this.sounds.buttonClick);
  }

  async playBackgroundMusicGameless() {
    if (!this.hasPermission) {
      const permission = await this.requestPermission();
      if (!permission) return;
    }

    if (this.isMuted) return;

    try {
      // Make sure the music is ready to play
      if (this.bgMusicGameless.readyState < 4) {
        await new Promise((resolve) => {
          this.bgMusicGameless.addEventListener('canplaythrough', resolve, { once: true });
          this.bgMusicGameless.load();
        });
      }

      this.bgMusicGameless.currentTime = 0;
      this.bgMusicGameless.volume = 0.3;
      await this.bgMusicGameless.play();
    } catch (error) {
      console.warn('Background music playback failed:', error);
    }
  }

  pauseBackgroundMusicGameless() {
    this.bgMusicGameless.pause();
  }

  pauseBackgroundMusic() {
    this.bgMusic.pause();
  }

  private async playSound(sound: HTMLAudioElement): Promise<void> {
    if (this.isMuted || !this.initialized) {
      debugAudio('Sound blocked', { muted: this.isMuted, initialized: this.initialized });
      return;
    }

    try {
      debugAudio('Attempting to play sound');
      const soundClone = sound.cloneNode(true) as HTMLAudioElement;
      soundClone.volume = sound.volume;
      
      soundClone.setAttribute('playsinline', '');
      soundClone.setAttribute('webkit-playsinline', '');
      
      // Add event listeners for debugging
      soundClone.addEventListener('play', () => debugAudio('Sound started playing'));
      soundClone.addEventListener('ended', () => debugAudio('Sound finished playing'));
      soundClone.addEventListener('error', (e) => debugAudio('Sound error', e));
      
      soundClone.load();
      await soundClone.play();
      
      soundClone.addEventListener('ended', () => {
        debugAudio('Removing sound clone');
        soundClone.remove();
      }, { once: true });
    } catch (error) {
      debugAudio('Sound playback failed', error);
    }
  }

  // Rest of the methods remain the same...
  playCorrectSound() {
    this.playSound(this.sounds.correct);
  }

  playIncorrectSound() {
    this.playSound(this.sounds.incorrect);
  }

  playObstacleHitSound() {
    this.playSound(this.sounds.obstacleHit);
  }

  playGameOverSound() {
    this.playSound(this.sounds.gameOver);
  }

  playLevelCompleteSound() {
    this.playSound(this.sounds.levelComplete);
  }

  playCoinPickupSound() {
    this.playSound(this.sounds.coinPickup);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;

    // Update mute state for background music
    this.bgMusic.muted = this.isMuted;

    // Update mute state for all sound effects
    Object.values(this.sounds).forEach((sound) => {
      sound.muted = this.isMuted;
    });

    localStorage.setItem("gameMuted", this.isMuted.toString());
    return this.isMuted;
  }

  getMuteState() {
    return this.isMuted;
  }
}

export const audioManager = new AudioManager();
