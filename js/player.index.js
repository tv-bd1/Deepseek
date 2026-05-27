document.addEventListener("DOMContentLoaded", function () {
    let player = null;
    let channelData = [];
    let currentChannelIndex = 0; // বর্তমান প্লে হওয়া চ্যানেলের ইনডেক্স ট্র্যাক করার জন্য

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
    const skipOverlay = document.getElementById("skip-overlay");
    const skipChannelBtn = document.getElementById("skip-channel-btn");

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

        // ⏩ স্কিপ বাটন ক্লিক ইভেন্ট লিসেনার
        if (skipChannelBtn) {
            skipChannelBtn.addEventListener("click", skipToNextChannel);
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

    // চ্যানেল লিস্ট রেন্ডার
    function renderChannels(channels) {
        channelsUl.innerHTML = "";
        channels.forEach((channel, index) => {
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
                currentChannelIndex = index; // বর্তমান ইনডেক্স সেট করুন
                setActiveChannelUI(index);
                playChannel(channel.url);
            });

            channelsUl.appendChild(li);
        });

        if (channels.length > 0 && !player) {
            currentChannelIndex = 0;
            setActiveChannelUI(0);
            playChannel(channels[0].url);
        }
    }

    // অ্যাক্টিভ চ্যানেল মার্ক করার ফাংশন
    function setActiveChannelUI(index) {
        const listItems = document.querySelectorAll("#channels li");
        listItems.forEach(el => el.classList.remove("active-channel"));
        if(listItems[index]) {
            listItems[index].classList.add("active-channel");
            // স্ক্রোল পজিশন অটো-অ্যাডজাস্ট করার জন্য
            listItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // ⏩ পরবর্তী চ্যানেলে স্কিপ করার মেইন লজিক
    function skipToNextChannel() {
        if (channelData.length === 0) return;
        
        // ইনডেক্স ১ বাড়িয়ে পরবর্তী চ্যানেলে যাওয়া (লিস্ট শেষ হলে আবার প্রথমটায় ফিরে আসবে)
        currentChannelIndex = (currentChannelIndex + 1) % channelData.length;
        
        setActiveChannelUI(currentChannelIndex);
        playChannel(channelData[currentChannelIndex].url);
    }

    function createFallbackLogo(parentElement, channelName) {
        const logoDiv = document.createElement("div");
        logoDiv.className = "text-logo";
        logoDiv.textContent = channelName.charAt(0).toUpperCase();
        
        const colors = ['#e50914', '#1db954', '#00bcd4', '#ff9800', '#9c27b0', '#3f51b5'];
        const charCode = channelName.charCodeAt(0) || 0;
        logoDiv.style.backgroundColor = colors[charCode % colors.length];
        
        parentElement.insertBefore(logoDiv, parentElement.firstChild);
    }

    function playChannel(url) {
        if (player) { player.destroy(); }
        
        // প্লেয়ার চালু করার সময় স্কিপ বাটন দেখান
        if(skipOverlay) skipOverlay.classList.remove("hidden");

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
        if(skipOverlay) skipOverlay.classList.add("hidden");
        alertDialog.style.display = "none";
    });
});
