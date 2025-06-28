const csvURL = '/.netlify/functions/fetchSheet';
const audio = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playButton');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const lyricsInner = document.getElementById('lyricsInner');
const togglePlaylist = document.getElementById('togglePlaylist');
const playlistPanel = document.getElementById('playlistPanel');
const playlistEntries = document.getElementById('playlistEntries');

// Skin Switcher
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
const skinButton = document.getElementById("toggleSkin");
if (skinButton) {
  skinButton.addEventListener("click", () => {
    currentSkinIndex = (currentSkinIndex + 1) % skins.length;
    document.getElementById("theme-link").href = `${skins[currentSkinIndex]}.css`;
  });
}

// Toggle playlist
togglePlaylist.addEventListener('click', () => {
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

// Time format helper
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Audio control
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
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

audio.onplay = () => {
  playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/000000/pause--v1.png")';
};
audio.onpause = () => {
  playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/000000/play--v1.png")';
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

// Parse lyrics
let parsedLyrics = [];
let hasTimestamps = false;

function parseLyrics(raw) {
  const lines = raw.split('\n').map(line => {
    const match = line.match(/\[(\d+)\.(\d+)]\s*(.+)/);
    if (match) {
      const time = parseInt(match[1]) + parseInt(match[2]) / 100;
      return { time, text: match[3] };
    } else {
      return { time: null, text: line.trim() };
    }
  }).filter(l => l.text);
  hasTimestamps = parsedLyrics.some(l => l.time !== null);
  return lines;
}

// Update lyrics on screen
function updateLyricsBox(currentTime) {
  if (!hasTimestamps) return;

  let activeIndex = parsedLyrics.findIndex((l, i) =>
    currentTime >= l.time && (!parsedLyrics[i + 1] || currentTime < parsedLyrics[i + 1].time)
  );
  if (activeIndex === -1) activeIndex = 0;

  const linesToShow = 7;
  const half = Math.floor(linesToShow / 2);
  const elements = [];

  for (let i = activeIndex - half; i <= activeIndex + half; i++) {
    const div = document.createElement('div');
    if (i < 0 || i >= parsedLyrics.length) {
      div.className = 'lyric-line placeholder';
      div.textContent = '';
    } else {
      div.className = `lyric-line line-${i - activeIndex + 4}`;
      div.textContent = parsedLyrics[i].text;

      if (i === activeIndex) {
        div.classList.add('line-4');
        if (parsedLyrics[i].text.length > 60) {
          div.classList.add('shrink');
        }
      }
    }
    elements.push(div);
  }

  lyricsInner.innerHTML = '';
  elements.forEach(el => lyricsInner.appendChild(el));
}

// Load track from CSV row
function loadTrack(row) {
  document.getElementById('songTitle').textContent = row['Song title'] || 'Unknown Title';
  document.getElementById('artistName').textContent = row['Artist name'] || 'Unknown Artist';
  audio.src = convertDropboxAudio(row['Direct download link'] || '');

  parsedLyrics = parseLyrics(row['Lyrics'] || '');
  updateLyricsBox(0);
  audio.pause();
  playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/000000/play--v1.png")';

  const coverArt = document.getElementById('coverArt');
  const aiLink = row['AI music link'] || '';
  const imageCell = row['Image'];

  if (imageCell && !aiLink.includes('/s/')) {
    coverArt.src = convertCoverArtUrl(imageCell);
  } else if (aiLink.includes('/s/')) {
    fetch(`/.netlify/functions/sunoImage?link=${encodeURIComponent(aiLink)}`)
      .then(res => res.json())
      .then(data => {
        coverArt.src = data.imageUrl || '';
      })
      .catch(() => {
        coverArt.src = '';
      });
  } else {
    coverArt.src = '';
  }
}

// Fetch CSV and populate playlist
Papa.parse(csvURL, {
  download: true,
  header: true,
  complete: (res) => {
    const songs = res.data.filter(r => r['Song title'] && r['Lyrics']);
    if (!songs.length) return;

    songs.forEach(row => {
      const entry = document.createElement('div');
      entry.className = 'playlist-entry';
      entry.textContent = `${row['Song title']} – ${row['Artist name']}`;
      entry.addEventListener('click', () => loadTrack(row));
      playlistEntries.appendChild(entry);
    });

    loadTrack(songs[songs.length - 1]);
  }
});
