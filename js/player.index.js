document.addEventListener("DOMContentLoaded", function () {
    let player = null;
    let channelData = [];

    const DEFAULT_M3U_URL = "https://raw.githubusercontent.com/Rakib49/Rakibiptv/refs/heads/main/aynaott.m3u";
    const FALLBACK_LOGO = "https://cdn-icons-png.flaticon.com/512/716/716429.png"; 

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

    // --- ☰ হ্যামবার্গার সাইডবার ওপেন/ক্লোজ লজিক ---
    menuBtn.addEventListener("click", () => {
        sidebarMenu.classList.add("open");
        sidebarOverlay.style.display = "block";
    });

    function hideSidebar() {
        sidebarMenu.classList.remove("open");
        sidebarOverlay.style.display = "none";
    }

    closeSidebar.addEventListener("click", hideSidebar);
    sidebarOverlay.addEventListener("click", hideSidebar);

    // ড্রয়ারের ভেতর ফর্ম টগল
    addM3uLink.addEventListener("click", (e) => {
        e.preventDefault();
        m3uForm.classList.toggle("hidden");
    });

    // প্লেলিস্ট লোড
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
                if (!response.ok) throw new Error("Network response error");
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
                    hideSidebar(); // সাকসেসফুলি লোড হলে সাইডবার বন্ধ হবে
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

    // --- 🛠️ উন্নত ও নিখুঁত M3U লোগো পার্সার লজিক ---
    function parseM3U(m3uRaw) {
        const lines = m3uRaw.split("\n");
        const channels = [];
        let currentName = "";
        let currentLogo = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF:")) {
                // tvg-logo খোঁজার মাল্টিপল রেগুলার এক্সপ্রেশন (যাতে কোটেশন ছাড়া বা স্পেস ওয়ালা টেক্সটও ডিটেক্ট হয়)
                const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/tvg-logo=([^,\s]+)/);
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
                    logo: currentLogo || FALLBACK_LOGO
                });
                currentName = ""; 
                currentLogo = "";
            }
        }
        return channels;
    }

    function renderChannels(channels) {
        channelsUl.innerHTML = "";
        channels.forEach((channel) => {
            const li = document.createElement("li");
            
            const img = document.createElement("img");
            img.src = channel.logo;
            img.alt = ""; 
            
            img.onerror = function() {
                this.src = FALLBACK_LOGO;
                this.onerror = null;
            };

            const nameSpan = document.createElement("span");
            nameSpan.textContent = channel.name;

            li.appendChild(img);
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

    // রিমুভ প্লেলিস্ট
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
