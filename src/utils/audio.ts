class AudioManager {
  private bgMusic: HTMLAudioElement;
  private bgMusicGameless: HTMLAudioElement;
  private hasPermission: boolean = false;

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
    // Initialize background music
    this.bgMusic = new Audio(
      `${process.env.PUBLIC_URL}/sounds/background-music.mp3`
    );
    this.bgMusic.loop = true;

    this.bgMusicGameless = new Audio(
      `${process.env.PUBLIC_URL}/sounds/background-music-gameless.mp3`
    );
    this.bgMusicGameless.loop = true

    // Initialize sound effects with proper error handling
    this.sounds = {
      buttonClick: this.createAudio("button-click.wav"),
      correct: this.createAudio("correct.mp3"),
      incorrect: this.createAudio("incorrect.mp3"),
      obstacleHit: this.createAudio("obstacle-hit.wav"),
      gameOver: this.createAudio("game-over.wav"),
      levelComplete: this.createAudio("level-complete.wav"),
      coinPickup: this.createAudio("coin.mp3"),
      
    };

    // Load mute preference from localStorage
    const storedMute = localStorage.getItem("gameMuted");
    this.isMuted = storedMute === "true";
    this.bgMusic.muted = this.isMuted;

    // Set mute state for all sound effects
    Object.values(this.sounds).forEach((sound) => {
      sound.muted = this.isMuted;
    });
    this.checkAudioPermission();

  }

  private async checkAudioPermission() {
    try {
      // Try to play a silent audio to check permission
      const silentAudio = new Audio();
      silentAudio.volume = 0;
      await silentAudio.play();
      this.hasPermission = true;
      silentAudio.remove();
    } catch (error) {
      this.hasPermission = false;
      console.warn('Audio permission not granted:', error);
    }
  }

  async requestPermission() {
    if (this.hasPermission) return true;

    try {
      // Try to play any sound on user interaction
      await this.bgMusic.play();
      this.bgMusic.pause();
      this.hasPermission = true;
      return true;
    } catch (error) {
      console.error('Failed to get audio permission:', error);
      return false;
    }
  }

  private createAudio(filename: string): HTMLAudioElement {
    const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/${filename}`);
    audio.addEventListener("error", (e) => {
      console.error(`Error loading sound ${filename}:`, e);
    });
    return audio;
  }

  async preloadSounds() {

    const loadPromises = Object.values(this.sounds).map((sound, index) => {
      return new Promise((resolve, reject) => {
        const soundName = Object.keys(this.sounds)[index];

        sound.addEventListener(
          "canplaythrough",
          () => {
            console.log(`Sound loaded successfully: ${soundName}`);
            resolve(soundName);
          },
          { once: true }
        );

        sound.addEventListener(
          "error",
          (e) => {
            console.error(`Failed to load sound ${soundName}:`, {
              error: e,
              src: sound.src,
              readyState: sound.readyState,
            });
            // Resolve instead of reject to prevent blocking other sounds
            resolve(`Failed: ${soundName}`);
          },
          { once: true }
        );

        // Trigger the load
        sound.load();
      });
    });

    try {
      const results = await Promise.all(loadPromises);
      console.log("Sound loading results:", results);
    } catch (error) {
      console.error("Error during sound preloading:", error);
    }
  }

  async playBackgroundMusic() {
    if (!this.hasPermission) {
      await this.requestPermission();
    }
    
    if (this.isMuted) return;

    try {
      await this.bgMusic.play();
    } catch (error) {
      console.warn('Background music playback failed:', error);
    }
  }

  playButtonSound() {
    this.playSound(this.sounds.buttonClick);
  }

  playBackgroundMusicGameless() {
    if (this.isMuted) return;

    this.bgMusicGameless.volume = 0.3; // Set volume to 30%
    this.bgMusicGameless.play().catch((error) => {
      console.warn("Background music playback failed:", error);
    });
  }

  pauseBackgroundMusicGameless() {
    this.bgMusicGameless.pause();
  }

  pauseBackgroundMusic() {
    this.bgMusic.pause();
  }

  private async playSound(sound: HTMLAudioElement) {
    if (this.isMuted) {
      console.log("Sound not played - game is muted");
      return;
    }

    try {
      sound.currentTime = 0;
      await sound.play();
      console.log("Sound played successfully:", sound.src);
    } catch (error) {
      console.warn("Sound playback failed:", error, "Source:", sound.src);
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
