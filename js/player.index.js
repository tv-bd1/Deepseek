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
    const alertDialog = document.getElementById("custom-alert-dialog");
    const confirmRemove = document.getElementById("confirm-remove");
    const cancelRemove = document.getElementById("cancel-remove");

    init();

    function init() {
        const savedPlaylist = localStorage.getItem("nexo_playlist");
        if (savedPlaylist) {
            channelData = JSON.parse(savedPlaylist);
            renderChannels(channelData);
        } else {
            fetchPlaylist(DEFAULT_M3U_URL);
        }
    }

    // ☰ সাইডবার কন্ট্রোল
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
        loadM3uBtn.innerText = "Loading...";
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error("Network error");
                return response.text();
            })
            .then(data => {
                channelData = parseM3U(data);
                if (channelData.length === 0) {
                    alert("No channels found!");
                } else {
                    localStorage.setItem("nexo_playlist", JSON.stringify(channelData));
                    renderChannels(channelData);
                    m3uForm.classList.add("hidden");
                    m3uInput.value = "";
                    hideSidebar();
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to load M3U.");
            })
            .finally(() => {
                loadM3uBtn.innerText = "Load Playlist";
            });
    }

    // এডভান্সড M3U লোগো পার্সার
    function parseM3U(m3uRaw) {
        const lines = m3uRaw.split("\n");
        const channels = [];
        let currentName = "";
        let currentLogo = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF:")) {
                // লোগো খোঁজার জন্য নিখুঁত রেগুলার এক্সপ্রেশন
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

    // চ্যানেল লিস্ট রেন্ডার
    function renderChannels(channels) {
        channelsUl.innerHTML = "";
        channels.forEach((channel) => {
            const li = document.createElement("li");
            
            // যদি লোগো থাকে তবে <img> তৈরি হবে, না থাকলে নামের ১ম অক্ষর দিয়ে টেক্সট-লোগো হবে
            if (channel.logo && channel.logo.startsWith('http')) {
                const img = document.createElement("img");
                img.src = channel.logo;
                img.alt = "";
                img.onerror = function() {
                    // ইমেজ লোড ফেল করলে টেক্সট লোগোতে কনভার্ট হবে
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

        if (channels.length > 0 && !player) {
            channelsUl.children[0].classList.add("active-channel");
            playChannel(channels[0].url);
        }
    }

    // টেক্সট লোগো বানানোর ফাংশন
    function createFallbackLogo(parentElement, channelName) {
        const logoDiv = document.createElement("div");
        logoDiv.className = "text-logo";
        logoDiv.textContent = channelName.charAt(0).toUpperCase();
        
        // ব্যাকগ্রাউন্ড কালার ডাইনামিক করার জন্য
        const colors = ['#e50914', '#1db954', '#00bcd4', '#ff9800', '#9c27b0', '#3f51b5'];
        const charCode = channelName.charCodeAt(0) || 0;
        logoDiv.style.backgroundColor = colors[charCode % colors.length];
        
        parentElement.insertBefore(logoDiv, parentElement.firstChild);
    }

    function playChannel(url) {
        if (player) { player.destroy(); }
        player = new Clappr.Player({
            source: url,
            parentId: "#player-container",
            plugins: [LevelSelector],
            width: "100%",
            height: "100%",
            autoPlay: true,
            mimeType: "application/x-mpegURL"
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
        channelsUl.innerHTML = "";
        if (player) { player.destroy(); player = null; }
        alertDialog.style.display = "none";
    });
});
