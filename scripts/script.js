// Core DOM elements
const audio = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playButton'); // old hidden button, keep for icon sync
const controlPlayBtn = document.getElementById('controlPlayButton'); // new play button in control area
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const lyricsInner = document.getElementById('lyricsInner');
const playlistPanel = document.getElementById('playlistPanel');
const playlistEntries = document.getElementById('playlistEntries');
const playlistToggleButton = document.getElementById('playlistToggleButton');
const themeLink = document.getElementById('theme-link');
const body = document.body;
const metalBgVideo = document.getElementById('metalBgVideo');

const skinList = document.getElementById('skinList'); // vertical skin list container

let parsedLyrics = [];
let hasTimestamps = false;

///// PLAY/PAUSE TOGGLE /////
// Old playBtn listener (hidden button)
playBtn.addEventListener('click', () => {
  if (audio.paused) audio.play();
  else audio.pause();
});

// New control area play button listener
if (controlPlayBtn) {
  controlPlayBtn.addEventListener('click', () => {
    if (audio.paused) audio.play();
    else audio.pause();
  });
}

// Sync icon on play/pause for both buttons
function updatePlayPauseIcons() {
  if (audio.paused) {
    playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/00ff00/play--v1.png")';
    if (controlPlayBtn) controlPlayBtn.classList.remove('playing');
  } else {
    playBtn.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/00ff00/pause--v1.png")';
    if (controlPlayBtn) controlPlayBtn.classList.add('playing');
  }
}

audio.addEventListener('play', updatePlayPauseIcons);
audio.addEventListener('pause', updatePlayPauseIcons);

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
    setTimeout(() => (playlistPanel.style.display = 'none'), 300);
  } else {
    playlistPanel.style.display = 'flex';
    playlistPanel.classList.remove('fadeout');
    playlistPanel.classList.add('visible');
  }
});

///// SKIN SWITCHING VIA VERTICAL LIST /////
if (skinList) {
  skinList.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LI') return;

    // Remove active class from all skins
    skinList.querySelectorAll('li').forEach(li => li.classList.remove('active'));

    // Mark clicked skin as active
    e.target.classList.add('active');

    // Get skin path from data attribute
    const skinPath = e.target.getAttribute('data-skin');
    if (!skinPath) return;

    // Update theme stylesheet
    themeLink.href = skinPath + '.css';

    // Update body skin class and effects
    updateBodySkinClass(skinPath);
  });
}

function updateBodySkinClass(cssPath) {
  const match = cssPath.match(/skin-(\w+)/);
  const skinClass = match ? `theme-${match[0]}` : '';

  // Reset and apply the new skin class
  body.className = skinClass;

  // Toggle fire background video (only for metal skin)
  if (metalBgVideo) {
    if (skinClass === 'theme-skin-metal') {
      metalBgVideo.style.display = 'block';
    } else {
      metalBgVideo.style.display = 'none';
    }
  }

  // Toggle feathers (only for angel skin)
  if (skinClass === 'theme-skin-angel') {
    startFeathers();
  } else {
    stopFeathers();
  }
}

///// CSV LOADER FOR SONG DATA /////
window.addEventListener('DOMContentLoaded', () => {
  // Set initial skin on load
  if (skinList) {
    // If none active, set first skin active
    if (!skinList.querySelector('li.active')) {
      const firstSkin = skinList.querySelector('li');
      if (firstSkin) firstSkin.classList.add('active');
    }
    // Load skin from active li
    const activeSkin = skinList.querySelector('li.active');
    if (activeSkin) updateBodySkinClass(activeSkin.getAttribute('data-skin'));
  }

  Papa.parse('/.netlify/functions/fetchSheet', {
    download: true,
    header: true,
    complete: (res) => {
      if (!res || !res.data) {
        console.error('No data returned from fetchSheet');
        return;
      }

      const songs = res.data.filter((r) => r['Song title'] && r['Lyrics']);
      if (songs.length === 0) {
        console.warn('No valid songs found in CSV');
        return;
      }

      playlistEntries.innerHTML = '';
      songs.forEach((row) => {
        const entry = document.createElement('div');
        entry.className = 'playlist-entry';
        entry.textContent = `${row['Song title']} – ${row['Artist name']}`;
        entry.addEventListener('click', () => loadTrack(row));
        playlistEntries.appendChild(entry);
      });

      loadTrack(songs[songs.length - 1]); // Load last track
    },
    error: (err) => {
      console.error('PapaParse error:', err);
    },
  });
});

function loadTrack(row) {
  const songTitle = document.getElementById('songTitle');
  const artistName = document.getElementById('artistName');

  songTitle.textContent = row['Song title'] || 'Unknown Title';
  artistName.textContent = row['Artist name'] || 'Unknown Artist';
  audio.src = convertDropboxAudio(row['Direct download link'] || '');

  parsedLyrics = parseLyrics(row['Lyrics'] || '');
  updateLyricsBox(0);
  audio.pause();

  // Auto scale after text update
  autoScaleText('.scale-wrapper .title');
  autoScaleText('.scale-wrapper .artist');

  const coverArt = document.getElementById('coverArt');
  const aiLink = row['AI music link'] || '';
  const imageCell = row['Image'];

  if (imageCell && !aiLink.includes('/s/')) {
    coverArt.src = convertCoverArtUrl(imageCell);
  } else if (aiLink.includes('/s/')) {
    fetch(`/.netlify/functions/sunoImage?link=${encodeURIComponent(aiLink)}`)
      .then((res) => res.json())
      .then((data) => {
        coverArt.src = data.imageUrl || '';
      })
      .catch(() => {
        coverArt.src = '';
      });
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
  const parsed = lines
    .map((line) => {
      const match = line.match(/\[(\d+)\.(\d+)]\s*(.+)/);
      if (match) {
        const time = parseInt(match[1]) + parseInt(match[2]) / 100;
        return { time, text: match[3] };
      } else {
        return { time: null, text: line.trim() };
      }
    })
    .filter((l) => l.text);
  hasTimestamps = parsed.some((l) => l.time !== null);
  return parsed;
}

function updateLyricsBox(currentTime) {
  if (!hasTimestamps) return;

  const activeIndex = parsedLyrics.findIndex(
    (l, i) => currentTime >= l.time && (!parsedLyrics[i + 1] || currentTime < parsedLyrics[i + 1].time)
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

    const opacityLevels = { '-3': 0.25, '-2': 0.35, '-1': 0.45, '0': 1, '1': 0.45, '2': 0.35, '3': 0.25 };
    div.style.opacity = opacityLevels[i.toString()];
    lyricsInner.appendChild(div);
  }
}

///// AUTO SCALE TEXT /////
function autoScaleText(selector, maxLines = 2, minScale = 0.6) {
  document.querySelectorAll(selector).forEach(el => {
    const parent = el.parentElement;
    el.style.transform = 'scale(1)';
    el.style.maxWidth = 'none';
    el.style.whiteSpace = 'normal';

    const parentWidth = parent.offsetWidth;
    const textWidth = el.scrollWidth;

    const parentHeight = parent.offsetHeight;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 1.2;
    const textHeight = el.scrollHeight;
    const expectedMaxHeight = lineHeight * maxLines;

    const scaleX = parentWidth / textWidth;
    const scaleY = expectedMaxHeight / textHeight;

    const scale = Math.min(scaleX, scaleY, 1);
    el.style.transform = `scale(${Math.max(scale, minScale)})`;
    el.style.transformOrigin = 'top center';
  });
}

function applyAllScaling() {
  autoScaleText('.scale-wrapper .title');
  autoScaleText('.scale-wrapper .artist');
}

window.addEventListener('load', applyAllScaling);
window.addEventListener('resize', applyAllScaling);
window.addEventListener('orientationchange', applyAllScaling);

///// FEATHERS /////
let featherInterval;
const featherCount = 15;
const featherImages = [
  'https://cdn-icons-png.flaticon.com/512/616/616408.png',
  'https://cdn-icons-png.flaticon.com/512/616/616407.png',
];

function startFeathers() {
  stopFeathers();
  for (let i = 0; i < featherCount; i++) createFeather();
  featherInterval = setInterval(() => createFeather(), 1000);
}

function stopFeathers() {
  clearInterval(featherInterval);
  document.querySelectorAll('.angel-feather').forEach((el) => el.remove());
}

function createFeather() {
  const feather = document.createElement('div');
  feather.className = 'angel-feather';
  feather.style.setProperty('--dur', `${5 + Math.random() * 10}s`);
  feather.style.width = `${20 + Math.random() * 25}px`;
  feather.style.height = 'auto';
  const imgUrl = featherImages[Math.floor(Math.random() * featherImages.length)];
  feather.style.backgroundImage = `url(${imgUrl})`;

  const startX = Math.random() * window.innerWidth;
  const startY = window.innerHeight + 50;
  feather.style.left = `${startX}px`;
  feather.style.top = `${startY}px`;

  document.body.appendChild(feather);

  const duration = parseFloat(feather.style.getPropertyValue('--dur'));
  const endX = startX + (Math.random() * 200 - 100);
  const endY = -100;

  requestAnimationFrame(() => {
    feather.style.transition = `transform ${duration}s linear, opacity ${duration}s linear`;
    feather.style.transform = `translate(${endX - startX}px, ${endY - startY}px) rotate(${Math.random() * 360}deg)`;
    feather.style.opacity = '0';
  });

  setTimeout(() => feather.remove(), duration * 1000);
}
