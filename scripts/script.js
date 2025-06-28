document.addEventListener('DOMContentLoaded', () => {
  const csvURL = '/.netlify/functions/fetchSheet';
  const audio = document.getElementById('audioPlayer');
  const playBtn = document.getElementById('playButton');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const currentTime = document.getElementById('currentTime');
  const duration = document.getElementById('duration');
  const lyricsInner = document.getElementById('lyricsInner');
  const playlistToggleButton = document.getElementById('togglePlaylist');
  const playlistPanel = document.getElementById('playlistPanel');
  const playlistEntries = document.getElementById('playlistEntries');
  const skinButton = document.getElementById("toggleSkin");
  const themeLink = document.getElementById('theme-link');

  // Skins
  const skins = [
    "styles/styles",
    "styles/skin-retro",
    "styles/skin-angel",
    "styles/skin-haunted",
    "styles/skin-metal",
    "styles/skin-steel",
    "styles/skin-storytellerz"
  ];
  let currentSkinIndex = 0;

  if (skinButton) {
    skinButton.addEventListener("click", () => {
      currentSkinIndex = (currentSkinIndex + 1) % skins.length;
      themeLink.href = `${skins[currentSkinIndex]}.css`;
    });
  }

  // Playlist toggle
  if (playlistToggleButton) {
    playlistToggleButton.addEventListener('click', () => {
      if (playlistPanel.classList.contains('visible')) {
        playlistPanel.classList.remove('visible');
        playlistPanel.classList.add('fadeout');
        setTimeout(() => playlistPanel.style.display = 'none', 300);
      } else {
        playlistPanel.classList.remove('fadeout');
        playlistPanel.style.display = 'flex';
        playlistPanel.classList.add('visible');
      }
    });
  }

  // Time formatting
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Play/pause control
  playBtn.addEventListener('click', () => {
    audio.paused ? audio.play() : audio.pause();
  });

  audio.ontimeupdate = () => {
    const percent = (audio.currentTime / audio.duration) * 100;
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

  audio.onplay = () => {
    playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/00ff00/pause--v1.png")';
  };

  audio.onpause = () => {
    playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/00ff00/play--v1.png")';
  };

  // Utilities
  function convertCoverArtUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([\-\w]{25,})/);
      return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : '';
    }
    if (url.includes('dropbox.com')) {
      return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('&dl=0', '');
    }
    return url;
  }

  function convertDropboxAudio(url) {
    return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('&dl=0', '');
  }

  // Lyrics Handling
  let parsedLyrics = [];
  let hasTimestamps = false;

  function parseLyrics(raw) {
    const lines = raw.split('\n');
    const parsed = lines.map((line) => {
      const match = line.match(/\[(\d+)\.(\d+)]\s*(.+)/);
      if (match) {
        const time = parseInt(match[1]) + parseInt(match[2]) / 100;
        return { time, text: match[3] };
      } else {
        return { time: null, text: line.trim() };
      }
    }).filter(l => l.text);
    hasTimestamps = parsed.some(l => l.time !== null);
    return parsed;
  }

  function updateLyricsBox(currentTime) {
    if (!hasTimestamps) {
      lyricsInner.innerHTML = '';
      parsedLyrics.forEach(l => {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        const len = l.text.length;
        if (len < 25) div.classList.add('large');
        else if (len < 50) div.classList.add('medium');
        div.textContent = l.text;
        lyricsInner.appendChild(div);
      });
      return;
    }

    let activeIndex = parsedLyrics.findIndex((l, i) =>
      currentTime >= l.time && (!parsedLyrics[i + 1] || currentTime < parsedLyrics[i + 1].time)
    );
    if (activeIndex === -1) activeIndex = 0;

    lyricsInner.innerHTML = '';
    for (let i = activeIndex - 2; i <= activeIndex + 2; i++) {
      if (i < 0 || i >= parsedLyrics.length) continue;
      const div = document.createElement('div');
      div.classList.add('lyric-line');
      const len = parsedLyrics[i].text.length;
      if (len < 25) div.classList.add('large');
      else if (len < 50) div.classList.add('medium');
      div.textContent = parsedLyrics[i].text;
      if (i === activeIndex) div.classList.add('active');
      lyricsInner.appendChild(div);
    }
  }

  // Load CSV
  Papa.parse(csvURL, {
    download: true,
    header: true,
    complete: (res) => {
      const songs = res.data.filter(r => r['Song title'] && r['Lyrics']);
      if (songs.length === 0) return;

      songs.forEach((row) => {
        const entry = document.createElement('div');
        entry.className = 'playlist-entry';
        entry.textContent = `${row['Song title']} – ${row['Artist name']}`;
        entry.addEventListener('click', () => loadTrack(row));
        playlistEntries.appendChild(entry);
      });

      loadTrack(songs[songs.length - 1]);
    }
  });

  function loadTrack(row) {
    document.getElementById('songTitle').textContent = row['Song title'] || 'Unknown Title';
    document.getElementById('artistName').textContent = row['Artist name'] || 'Unknown Artist';
    audio.src = convertDropboxAudio(row['Direct download link'] || '');

    parsedLyrics = parseLyrics(row['Lyrics'] || '');
    updateLyricsBox(0);

    audio.pause();
    playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/00ff00/play--v1.png")';

    const coverArt = document.getElementById('coverArt');
    const aiLink = row['AI music link'] || '';
    const imageCell = row['Image'];

    if (imageCell && !aiLink.includes('/s/')) {
      coverArt.src = convertCoverArtUrl(imageCell);
    } else if (aiLink.includes('/s/')) {
      fetch(`/.netlify/functions/sunoImage?link=${encodeURIComponent(aiLink)}`)
        .then(res => res.json())
        .then(data => {
          if (data.imageUrl) {
            coverArt.src = data.imageUrl;
          } else {
            coverArt.src = '';
          }
        })
        .catch(() => {
          coverArt.src = '';
        });
    } else {
      coverArt.src = '';
    }
  }
});
