document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');

    // Nếu không tìm thấy trình phát nhạc trên trang, không làm gì cả
    if (!audioPlayer || !playPauseBtn) return;

    const playIcon = '<i class="fas fa-play"></i>';
    const pauseIcon = '<i class="fas fa-pause"></i>';

    // --- HÀM TIỆN ÍCH ---
    
    // Hàm định dạng thời gian (ví dụ: 125 giây -> 2:05)
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --- SỰ KIỆN CỦA AUDIO PLAYER ---

    // 1. Khi metadata (như độ dài bài hát) đã được tải
    audioPlayer.addEventListener('loadedmetadata', () => {
        progressBar.max = audioPlayer.duration;
        durationDisplay.textContent = formatTime(audioPlayer.duration);
    });

    // 2. Khi bài hát đang chạy
    audioPlayer.addEventListener('timeupdate', () => {
        progressBar.value = audioPlayer.currentTime;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    });

    // 3. Khi bài hát kết thúc
    audioPlayer.addEventListener('ended', () => {
        playPauseBtn.innerHTML = playIcon;
        progressBar.value = 0;
        currentTimeDisplay.textContent = '0:00';
    });

    // --- SỰ KIỆN CỦA NÚT BẤM ---

    // 1. Khi nhấp vào nút Play/Pause
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseBtn.innerHTML = pauseIcon;
        } else {
            audioPlayer.pause();
            playPauseBtn.innerHTML = playIcon;
        }
    });

    // 2. Khi người dùng tua (seek) trên thanh tiến trình
    progressBar.addEventListener('input', () => {
        audioPlayer.currentTime = progressBar.value;
    });
});

