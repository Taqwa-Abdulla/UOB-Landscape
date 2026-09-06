//=======================================
// Youtube Script
//=======================================
function getYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

let currentProjectId = new URLSearchParams(window.location.search).get('id') || '';
let cachedDbVideo = null; 

async function loadProjectAndChannelVideos(direction = '') {
    const playerDiv = document.getElementById('project-player');
    const channelGrid = document.getElementById('channel-grid');
    const titleEl = document.getElementById('project-title');
    const yearEl = document.getElementById('project-year');

    try {
        let url = `/api/improvments/youtube.php?project_id=${currentProjectId}`;
        if (direction) {
            url += `&direction=${direction}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            currentProjectId = data.current_id;
            const newUrl = `${window.location.pathname}?id=${currentProjectId}`;
            window.history.replaceState({ path: newUrl }, '', newUrl);

            
            if (data.project_video && data.project_video.video_link) {
                cachedDbVideo = {
                    videoId: getYouTubeId(data.project_video.video_link),
                    title: data.project_video.title || 'Project Proposal Video',
                    year: data.project_video.year
                };

                if (titleEl) titleEl.textContent = cachedDbVideo.title;
                if (yearEl) yearEl.textContent = cachedDbVideo.year ? `Year: ${cachedDbVideo.year}` : '';

                if (cachedDbVideo.videoId && playerDiv) {
                    playerDiv.innerHTML = `
                        <iframe class="absolute inset-0 w-full h-full rounded-lg" 
                            src="https://www.youtube.com/embed/${cachedDbVideo.videoId}" 
                            title="${cachedDbVideo.title}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen></iframe>
                    `;
                } else if (playerDiv) {
                    playerDiv.innerHTML = `<p class="text-gray-400 p-4 text-center">Invalid format for link.</p>`;
                }
            } else {
                if (titleEl) titleEl.textContent = 'No Project Available';
                if (yearEl) yearEl.textContent = '';
                if (playerDiv) playerDiv.innerHTML = `<p class="text-gray-400 p-4 text-center">No projects found in database.</p>`;
            }

            
            if (channelGrid) {
                channelGrid.innerHTML = '';
                if (data.channel_videos && data.channel_videos.length > 0) {
                    data.channel_videos.forEach(vid => {
                        const safeTitle = vid.title.replace(/"/g, '&quot;');
                        channelGrid.innerHTML += `
                            <div onclick="playChannelVideo('${vid.video_id}', '${safeTitle}')" class="flex-shrink-0 w-64 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg p-2 hover:bg-slate-100 hover:border-red-400 transition group flex flex-col gap-2">
                                <div class="relative w-full aspect-video rounded overflow-hidden bg-black">
                                    <img src="https://img.youtube.com/vi/${vid.video_id}/hqdefault.jpg" alt="${safeTitle}" class="w-full h-full object-cover">
                                    <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition flex items-center justify-center">
                                        <i class="bi bi-play-circle-fill text-white text-3xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition"></i>
                                    </div>
                                </div>
                                <p class="text-xs font-medium text-slate-800 group-hover:text-red-600 line-clamp-2">${vid.title}</p>
                            </div>
                        `;
                    });
                } else {
                    channelGrid.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No channel videos found.</p>`;
                }
            }
        }
    } catch (error) {
        console.error('Failed to load video data:', error);
        if (playerDiv) playerDiv.innerHTML = `<p class="text-red-400 p-4 text-center">Can't load videos now.</p>`;
    }
}


function playChannelVideo(videoId, title) {
    const playerDiv = document.getElementById('project-player');
    const titleEl = document.getElementById('project-title');
    const yearEl = document.getElementById('project-year');

    if (titleEl) titleEl.textContent = title || 'YouTube Channel Video';
    if (yearEl) yearEl.textContent = 'Channel Feed';
    if (playerDiv) {
        playerDiv.innerHTML = `
            <iframe class="absolute inset-0 w-full h-full rounded-lg" 
                src="https://www.youtube.com/embed/${videoId}" 
                title="${title}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen></iframe>
        `;
    }
}

function switchProject(dirValue) {
    const direction = (dirValue === 1 || dirValue === 'next') ? 'next' : 'prev';
    loadProjectAndChannelVideos(direction);
}

document.addEventListener('DOMContentLoaded', () => loadProjectAndChannelVideos());