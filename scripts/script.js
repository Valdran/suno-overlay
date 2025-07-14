window.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audioPlayer');
  const playBtn = document.getElementById('playButton');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const currentTime = document.getElementById('currentTime');
  const duration = document.getElementById('duration');
  const lyricsInner = document.getElementById('lyricsInner');
  const playlistPanel = document.getElementById('playlistPanel');
  const playlistEntries = document.getElementById('playlistEntries');
  const playlistToggleButton = document.getElementById('playlistToggleButton');
  const skinSelect = document.getElementById('skinSelect');
  const themeLink = document.getElementById('theme-link');
  const easelIcon = document.getElementById('easelIcon');
  const metalBgVideo = document.getElementById('metalBackground');
  const body = document.body;

  let parsedLyrics = [];
  let hasTimestamps = false;

  ///// PLAY/PAUSE TOGGLE /////
  playBtn.addEventListener('click', () => {
    if (audio.paused) audio.play();
    else audio.pause();
  });

  audio.onplay = () => {
    playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/00ff00/pause--v1.png")';
  };

  audio.onpause = () => {
    playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/00ff00/play--v1.png")';
  };

  ///// PROGRESS BAR UPDATE /////
  audio.ontimeupdate = () => {
    const percent = (audio.currentTime / audio.duration) * 100 || 0;
    progressFill.style.width = percent + '%';
    currentTime.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration || 0);
    updateLyricsBox(audio.currentTime);
  };

  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    audio.currentTime = percent * audio.duration;
  });

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  ///// PLAYLIST TOGGLE /////
  playlistToggleButton.addEventListener('click', () => {
    if (playlistPanel.classList.contains('visible')) {
      playlistPanel.classList.remove('visible');
      playlistPanel.classList.add('fadeout');
      setTimeout(() => playlistPanel.style.display = 'none', 300);
    } else {
      playlistPanel.style.display = 'flex';
      playlistPanel.classList.remove('fadeout');
      playlistPanel.classList.add('visible');
    }
  });

  ///// SKIN DROPDOWN TOGGLE /////
  easelIcon.addEventListener('click', () => {
    skinSelect.style.display = skinSelect.style.display === 'block' ? 'none' : 'block';
  });

  ///// SKIN SWITCHER /////
  skinSelect.addEventListener('change', () => {
    themeLink.href = `${skinSelect.value}.css`;
    skinSelect.style.display = 'none';
    updateBodySkinClass(skinSelect.value);
  });

  function updateBodySkinClass(cssPath) {
    const match = cssPath.match(/skin-(\w+)/);
    const skinName = match ? match[1] : 'default';
    body.className = `theme-${skinName}`;

    // Fire background toggle
    if (skinName === 'metal') {
      if (metalBgVideo) metalBgVideo.style.display = 'block';
    } else {
      if (metalBgVideo) metalBgVideo.style.display = 'none';
    }

    // Feather toggle (assuming functions exist)
    if (skinName === 'angel') {
      startFeathers();
    } else {
      stopFeathers();
    }
  }

  window.addEventListener('load', () => {
    updateBodySkinClass(skinSelect.value);
  });

  ///// Everything else (CSV, lyrics, etc.) stays unchanged below this point
});
