// Core DOM elements
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
const body = document.body;
const metalBgVideo = document.getElementById('metalBackground'); // ✅ ID FIX

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

///// FORMAT TIME HELPER /////
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
  const match = cssPath.match(/skin-\w+/);
  const skinClass = match ? `theme-${match[0]}` : '';

  // Reset and apply the new skin class
  body.className = skinClass;

  // ✅ Toggle fire background video
  if (skinClass === 'theme-skin-metal') {
    if (metalBgVideo) metalBgVideo.style.display = 'block';
  } else {
    if (metalBgVideo) metalBgVideo.style.display = 'none';
  }

  // ✅ Toggle angel feathers
  if (skinClass === 'theme-skin-angel') {
    startFeathers();
  } else {
    stopFeathers();
  }
}

// ✅ On load: Set correct theme class and video/feathers
window.addEventListener('load', () => {
  updateBodySkinClass(skinSelect.value);
});

///// CSV LOADER FOR SONG DATA /////
Papa.parse('/.netlify/functions/fetchSheet', {
  download: true,
  header: true,
  complete: (res) => {
    const songs = res.data.filter(r => r['Song title'] && r['Lyrics']);
    if (songs.length === 0) return;

    playlistEntries.innerHTML = '';
    songs.forEach((row) => {
      const entry = document.createElement('div');
      entry.className = 'playlist-entry';
      entry.textContent = `${row['Song title']} – ${row['Artist name']}`;
      entry.addEventListener('click', () => loadTrack(row));
      playlistEntries.appendChild(entry);
    });

    loadTrack(songs[songs.length - 1]); // Load last track
  }
});

function loadTrack(row) {
  document.getElementById('songTitle').textContent = row['Song title'] || 'Unknown Title';
  document.getElementById('artistName').textContent = row['Artist name'] || 'Unknown Artist';
  audio.src = convertDropboxAudio(row['Direct download link'] || '');

  parsedLyrics = parseLyrics(row['Lyrics'] || '');
  updateLyricsBox(0);
  audio.pause();

  const coverArt = document.getElementById('coverArt');
  const aiLink = row['AI music link'] || '';
  const imageCell = row['Image'];

  if (imageCell && !aiLink.includes('/s/')) {
    coverArt.src = convertCoverArtUrl(imageCell);
  } else if (aiLink.includes('/s/')) {
    fetch(`/.netlify/functions/sunoImage?link=${encodeURIComponent(aiLink)}`)
      .then(res => res.json())
      .then(data => { coverArt.src = data.imageUrl || ''; })
      .catch(() => { coverArt.src = ''; });
  } else {
    coverArt.src = '';
  }
}

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

///// LYRICS /////
function parseLyrics(raw) {
  const lines = raw.split('\n');
  const parsed = lines.map(line => {
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
  if (!hasTimestamps) return;

  const activeIndex = parsedLyrics.findIndex((l, i) =>
    currentTime >= l.time && (!parsedLyrics[i + 1] || currentTime < parsedLyrics[i + 1].time)
  );

  lyricsInner.innerHTML = '';

  for (let i = -3; i <= 3; i++) {
    const idx = activeIndex + i;
    const div = document.createElement('div');
    div.classList.add('lyric-line');

    if (idx >= 0 && idx < parsedLyrics.length) {
      div.textContent = parsedLyrics[idx].text;
    } else {
      div.innerHTML = '&nbsp;';
    }

    if (i === 0) div.classList.add('active');

    const opacityLevels = { '-3': 0.25, '-2': 0.35, '-1':
