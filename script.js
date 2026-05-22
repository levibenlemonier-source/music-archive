// === CORE CONFIGURATION ===
const FILEBASE_GATEWAY = "https://ipfs.filebase.io/ipfs/YOUR_CID_OR_BUCKET_ID"; // PUT YOUR FILEBASE URL HERE
const ARTIST_NAME = "Kanye West";

// === MASTER ARCHIVE DATA ===
// Add your full folder structures here exactly as they are named on your Mac
const discography = [
    {
        album: "2018 - ye",
        tracks: [
            "01 - I Thought About Killing You.m4a",
            "02 - Yikes.m4a",
            "03 - All Mine.m4a",
            "04 - Wouldn't Leave.m4a",
            "05 - No Mistakes.m4a",
            "06 - Ghost Town.m4a",
            "07 - Violent Crimes.m4a"
        ]
    },
    {
        album: "2010 - My Beautiful Dark Twisted Fantasy",
        tracks: [
            "01 - Dark Fantasy.m4a",
            "02 - Gorgeous (feat. Kid Cudi & Raekwon).m4a"
            // Continue adding tracks
        ]
    }
];

// === SYSTEM VARIABLES ===
let currentAlbumIndex = 0;
let currentTrackIndex = 0;
let isPlaying = false;

// === DOM ELEMENTS ===
const engine = document.getElementById('audio-engine');
const tracklistEl = document.getElementById('tracklist');
const coverArt = document.getElementById('cover-art');
const trackTitle = document.getElementById('track-title');
const albumTitle = document.getElementById('album-title');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const progressBar = document.getElementById('progress-bar');
const progressWrapper = document.getElementById('progress-wrapper');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');

// === INITIALIZATION ===
function buildArchive() {
    discography.forEach((albumData, aIndex) => {
        const group = document.createElement('li');
        group.className = 'album-group';
        
        const heading = document.createElement('h3');
        heading.className = 'album-heading';
        heading.textContent = albumData.album;
        group.appendChild(heading);

        const trackContainer = document.createElement('div');

        albumData.tracks.forEach((trackFile, tIndex) => {
            const item = document.createElement('div');
            item.className = 'track-item';
            item.id = `track-${aIndex}-${tIndex}`;
            
            // Clean up UI text (removes disc/track numbers and .m4a)
            item.textContent = trackFile.replace(/^\d+-?\d*\s*-\s*/, '').replace('.m4a', '');
            
            item.addEventListener('click', () => loadTrack(aIndex, tIndex, true));
            trackContainer.appendChild(item);
        });

        group.appendChild(trackContainer);
        tracklistEl.appendChild(group);
    });
}

// === PLAYBACK LOGIC ===
function loadTrack(albumIdx, trackIdx, autoPlay = false) {
    currentAlbumIndex = albumIdx;
    currentTrackIndex = trackIdx;
    
    const album = discography[albumIdx];
    const track = album.tracks[trackIdx];

    // Encode paths for web URLs
    const safeArtist = encodeURIComponent(ARTIST_NAME);
    const safeAlbum = encodeURIComponent(album.album);
    const safeTrack = encodeURIComponent(track);

    // Predictable URL building
    const trackUrl = `${FILEBASE_GATEWAY}/${safeArtist}/${safeAlbum}/${safeTrack}`;
    const artUrl = `${FILEBASE_GATEWAY}/${safeArtist}/${safeAlbum}/cover.jpg`;

    // Update Engine & UI
    engine.src = trackUrl;
    coverArt.src = artUrl;
    trackTitle.textContent = track.replace(/^\d+-?\d*\s*-\s*/, '').replace('.m4a', '');
    albumTitle.textContent = album.album;

    // Update Active Styling in List
    document.querySelectorAll('.track-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`track-${albumIdx}-${trackIdx}`).classList.add('active');

    // Mac Lock Screen / Control Center Integration
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: trackTitle.textContent,
            artist: ARTIST_NAME,
            album: album.album,
            artwork: [{ src: artUrl, sizes: '500x500', type: 'image/jpeg' }]
        });
    }

    if (autoPlay) togglePlay(true);
}

function togglePlay(forcePlay = false) {
    if (engine.paused || forcePlay) {
        engine.play();
        isPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        engine.pause();
        isPlaying = false;
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

function playNext() {
    let nextTrackIdx = currentTrackIndex + 1;
    let nextAlbumIdx = currentAlbumIndex;

    if (nextTrackIdx >= discography[currentAlbumIndex].tracks.length) {
        nextTrackIdx = 0;
        nextAlbumIdx++;
        if (nextAlbumIdx >= discography.length) nextAlbumIdx = 0; // Loop to start
    }
    loadTrack(nextAlbumIdx, nextTrackIdx, true);
}

function playPrev() {
    // If more than 3 seconds in, restart current track
    if (engine.currentTime > 3) {
        engine.currentTime = 0;
        return;
    }

    let prevTrackIdx = currentTrackIndex - 1;
    let prevAlbumIdx = currentAlbumIndex;

    if (prevTrackIdx < 0) {
        prevAlbumIdx--;
        if (prevAlbumIdx < 0) prevAlbumIdx = discography.length - 1;
        prevTrackIdx = discography[prevAlbumIdx].tracks.length - 1;
    }
    loadTrack(prevAlbumIdx, prevTrackIdx, true);
}

// === TIME & PROGRESS BAR LOGIC ===
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

engine.addEventListener('timeupdate', () => {
    const percent = (engine.currentTime / engine.duration) * 100;
    progressBar.style.width = `${percent}%`;
    currentTimeEl.textContent = formatTime(engine.currentTime);
});

engine.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(engine.duration);
});

progressWrapper.addEventListener('click', (e) => {
    const width = progressWrapper.clientWidth;
    const clickX = e.offsetX;
    const duration = engine.duration;
    engine.currentTime = (clickX / width) * duration;
});

// === EVENT LISTENERS ===
playPauseBtn.addEventListener('click', () => togglePlay());
nextBtn.addEventListener('click', playNext);
prevBtn.addEventListener('click', playPrev);
engine.addEventListener('ended', playNext); // Auto-play next track

// Spacebar controls play/pause
document.body.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    }
});

// Start the app
buildArchive();
// Preload the first track but don't play it yet
if (discography.length > 0 && discography[0].tracks.length > 0) {
    loadTrack(0, 0, false);
}