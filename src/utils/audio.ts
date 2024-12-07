class AudioManager {
  private bgMusic: HTMLAudioElement;
  private isMuted: boolean = false;

  constructor() {
    this.bgMusic = new Audio(`${process.env.PUBLIC_URL}/sounds/background-music.mp3`);
    this.bgMusic.loop = true;
    
    // Load mute preference from localStorage
    const storedMute = localStorage.getItem('gameMuted');
    this.isMuted = storedMute === 'true';
    this.bgMusic.muted = this.isMuted;
  }

  playBackgroundMusic() {
    this.bgMusic.play().catch(error => {
      console.log('Audio playback failed:', error);
    });
  }

  pauseBackgroundMusic() {
    this.bgMusic.pause();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.bgMusic.muted = this.isMuted;
    localStorage.setItem('gameMuted', this.isMuted.toString());
    return this.isMuted;
  }

  getMuteState() {
    return this.isMuted;
  }
}

export const audioManager = new AudioManager(); 