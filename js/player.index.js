document.addEventListener("DOMContentLoaded", function () {
    let player = null;
    let channelData = [];

    const DEFAULT_M3U_URL = "https://raw.githubusercontent.com/Rakib49/Rakibiptv/refs/heads/main/aynaott.m3u";

    // DOM Elements
    const menuBtn = document.getElementById("menu-btn");
    const sidebarMenu = document.getElementById("sidebar-menu");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const closeSidebar = document.getElementById("close-sidebar");
    
    const addM3uLink = document.getElementById("add-m3u-link");
    const removeListLink = document.getElementById("removelist");
    const m3uForm = document.getElementById("m3u-link-form");
    const m3uInput = document.getElementById("m3u-link");
    const loadM3uBtn = document.getElementById("load-m3u");
    
    const channelsUl = document.getElementById("channels");
    const searchInput = document.getElementById("search-channel");
    const alertDialog = document.getElementById("custom-alert-dialog");
    const confirmRemove = document.getElementById("confirm-remove");
    const cancelRemove = document.getElementById("cancel-remove");

    init();

    function init() {
        // রিয়েল-টাইম সার্চ লিসেনার
        if (searchInput) {
            searchInput.addEventListener("input", filterChannels);
        }

        const savedPlaylist = localStorage.getItem("nexo_playlist");
        if (savedPlaylist) {
            channelData = JSON.parse(savedPlaylist);
            renderChannels(channelData);
        } else {
            fetchPlaylist(DEFAULT_M3U_URL);
        }
    }

    // ☰ Sidebar Controls
    if(menuBtn) {
        menuBtn.addEventListener("click", () => {
            sidebarMenu.classList.add("open");
            sidebarOverlay.style.display = "block";
        });
    }

    function hideSidebar() {
        if(sidebarMenu) sidebarMenu.classList.remove("open");
        if(sidebarOverlay) sidebarOverlay.style.display = "none";
    }

    if(closeSidebar) closeSidebar.addEventListener("click", hideSidebar);
    if(sidebarOverlay) sidebarOverlay.addEventListener("click", hideSidebar);

    addM3uLink.addEventListener("click", (e) => {
        e.preventDefault();
        m3uForm.classList.toggle("hidden");
    });

    loadM3uBtn.addEventListener("click", () => {
        const url = m3uInput.value.trim();
        if (!url) {
            alert("Please enter a valid M3U URL");
            return;
        }
        fetchPlaylist(url);
    });

    function fetchPlaylist(url) {
        loadM3uBtn.innerText = "Loading Playlist...";
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error("Network error");
                return response.text();
            })
            .then(data => {
                channelData = parseM3U(data);
                if (channelData.length === 0) {
                    alert("No channels found in this file!");
                } else {
                    localStorage.setItem("nexo_playlist", JSON.stringify(channelData));
                    if (searchInput) searchInput.value = ""; // সার্চ রিসেট
                    renderChannels(channelData);
                    m3uForm.classList.add("hidden");
                    m3uInput.value = "";
                    hideSidebar();
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to load M3U playlist. Check CORS or URL accuracy.");
            })
            .finally(() => {
                loadM3uBtn.innerText = "Load Playlist";
            });
    }

    // Advanced M3U Parser
    function parseM3U(m3uRaw) {
        const lines = m3uRaw.split("\n");
        const channels = [];
        let currentName = "";
        let currentLogo = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF:")) {
                const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/logo="([^"]+)"/);
                if (logoMatch && logoMatch[1]) {
                    currentLogo = logoMatch[1].trim();
                } else {
                    currentLogo = "";
                }

                const commaIndex = line.lastIndexOf(",");
                if (commaIndex !== -1) {
                    currentName = line.substring(commaIndex + 1).trim();
                } else {
                    currentName = "Unknown Channel";
                }
            } else if (line.startsWith("http") || line.startsWith("https")) {
                if (currentName === "") currentName = "Untitled Channel";
                channels.push({
                    name: currentName,
                    url: line,
                    logo: currentLogo
                });
                currentName = ""; 
                currentLogo = "";
            }
        }
        return channels;
    }

    // Render Channels UI
    function renderChannels(channelsToRender) {
        channelsUl.innerHTML = "";
        
        if(channelsToRender.length === 0) {
            const noResult = document.createElement("p");
            noResult.style.padding = "20px";
            noResult.style.color = "#64748b";
            noResult.style.textAlign = "center";
            noResult.textContent = "No channels matched your search.";
            channelsUl.appendChild(noResult);
            return;
        }

        channelsToRender.forEach((channel) => {
            const li = document.createElement("li");
            
            if (channel.logo && channel.logo.startsWith('http')) {
                const img = document.createElement("img");
                img.src = channel.logo;
                img.alt = "";
                img.onerror = function() {
                    createFallbackLogo(li, channel.name);
                    this.remove();
                };
                li.appendChild(img);
            } else {
                createFallbackLogo(li, channel.name);
            }

            const nameSpan = document.createElement("span");
            nameSpan.textContent = channel.name;
            li.appendChild(nameSpan);

            li.addEventListener("click", function() {
                document.querySelectorAll("#channels li").forEach(el => el.classList.remove("active-channel"));
                li.classList.add("active-channel");
                playChannel(channel.url);
            });

            channelsUl.appendChild(li);
        });

        // প্রথমবার লোডে প্রথম চ্যানেল প্লে করা (যদি প্লেয়ার আগে রেডি না থাকে)
        if (channelsToRender.length > 0 && !player) {
            channelsUl.children[0].classList.add("active-channel");
            playChannel(channelsToRender[0].url);
        }
    }

    // Live Instant Search Filter Logic
    function filterChannels() {
        const query = searchInput.value.toLowerCase().trim();
        const filtered = channelData.filter(channel => 
            channel.name.toLowerCase().includes(query)
        );
        renderChannels(filtered);
    }

    // Dynamic High-End Text Logo
    function createFallbackLogo(parentElement, channelName) {
        const logoDiv = document.createElement("div");
        logoDiv.className = "text-logo";
        logoDiv.textContent = channelName.charAt(0).toUpperCase();
        
        // Luxury Neon-Friendly Matte Colors
        const colors = ['#0f172a', '#1e1b4b', '#064e3b', '#7c2d12', '#4c1d95', '#0369a1'];
        const charCode = channelName.charCodeAt(0) || 0;
        logoDiv.style.backgroundColor = colors[charCode % colors.length];
        logoDiv.style.border = "1px solid rgba(255,255,255,0.1)";
        
        parentElement.insertBefore(logoDiv, parentElement.firstChild);
    }

    // Clappr Playback & Auto-Rotate Screen Fix for Mobile Fullscreen
    function playChannel(url) {
        if (player) { player.destroy(); }
        player = new Clappr.Player({
            source: url,
            parentId: "#player-container",
            plugins: [LevelSelector],
            width: "100%",
            height: "100%",
            autoPlay: true,
            mimeType: "application/x-mpegURL",
            events: {
                onFullscreen: function() {
                    // ফুলস্ক্রিনে মোবাইল ডিভাইস অটো-রোটেশন হয়ে ল্যান্ডস্কেপ মোডে যাওয়ার চেষ্টা করবে
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch((err) => {
                            console.log("Orientation lock not supported or allowed:", err);
                        });
                    }
                }
            }
        });
    }

    removeListLink.addEventListener("click", (e) => {
        e.preventDefault();
        hideSidebar();
        alertDialog.style.display = "flex";
    });

    cancelRemove.addEventListener("click", () => { alertDialog.style.display = "none"; });

    confirmRemove.addEventListener("click", () => {
        localStorage.removeItem("nexo_playlist");
        channelData = [];
        channelsUl.innerHTML = "";
        if (searchInput) searchInput.value = "";
        if (player) { player.destroy(); player = null; }
        alertDialog.style.display = "none";
    });
});
