document.addEventListener("DOMContentLoaded", function () {
    let player = null;
    let channelData = [];

    // ডিফল্ট M3U লিংক (AynaOTT)
    const DEFAULT_M3U_URL = "https://raw.githubusercontent.com/Rakib49/Rakibiptv/refs/heads/main/aynaott.m3u";

    // একটি সচল অনলাইন ডিফল্ট ইমেজ (যদি কোনো চ্যানেলের লোগো লোড না হতে পারে তবে এটি ব্যাকআপ হিসেবে কাজ করবে)
    const FALLBACK_LOGO = "https://cdn-icons-png.flaticon.com/512/716/716429.png"; 

    // DOM Elements
    const addM3uLink = document.getElementById("add-m3u-link");
    const removeListLink = document.getElementById("removelist");
    const m3uForm = document.getElementById("m3u-link-form");
    const channelHeading = document.getElementById("channel-heading");
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
            channelHeading.classList.remove("hidden");
        } else {
            fetchPlaylist(DEFAULT_M3U_URL);
        }
    }

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
                if (!response.ok) throw new Error("Network response was not ok");
                return response.text();
            })
            .then(data => {
                channelData = parseM3U(data);
                if (channelData.length === 0) {
                    alert("No valid channels found in this M3U file.");
                } else {
                    localStorage.setItem("nexo_playlist", JSON.stringify(channelData));
                    renderChannels(channelData);
                    m3uForm.classList.add("hidden");
                    channelHeading.classList.remove("hidden");
                    m3uInput.value = "";
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to load M3U link.");
            })
            .finally(() => {
                loadM3uBtn.innerText = "Load Playlist";
            });
    }

    // M3U Parser
    function parseM3U(m3uRaw) {
        const lines = m3uRaw.split("\n");
        const channels = [];
        let currentName = "";
        let currentLogo = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF:")) {
                // tvg-logo এক্সট্র্যাক্ট করা
                const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                if (logoMatch && logoMatch[1]) {
                    currentLogo = logoMatch[1];
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

    // চ্যানেল রেন্ডারার (লোগো স্ট্যাবিলাইজার সহ)
    function renderChannels(channels) {
        channelsUl.innerHTML = "";
        channels.forEach((channel) => {
            const li = document.createElement("li");
            
            // লোগো ইমেজ তৈরি
            const img = document.createElement("img");
            img.src = channel.logo;
            img.alt = ""; // লাফানো বন্ধ করতে অল্টারনেটিভ টেক্সট খালি রাখা হয়েছে
            
            // ইমেজ লোড হতে এরর আসলে সাথে সাথে ব্যাকআপ লোগো সেট হবে এবং লাফাবে না
            img.onerror = function() {
                this.src = FALLBACK_LOGO;
                this.onerror = null; // ইনফিনিট লুপ বন্ধ করতে
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
        if (player) {
            player.destroy(); 
        }

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
        alertDialog.style.display = "flex";
    });

    cancelRemove.addEventListener("click", () => {
        alertDialog.style.display = "none";
    });

    confirmRemove.addEventListener("click", () => {
        localStorage.removeItem("nexo_playlist");
        channelsUl.innerHTML = "";
        channelHeading.classList.add("hidden");
        m3uForm.classList.remove("hidden");
        if (player) {
            player.destroy();
            player = null;
        }
        alertDialog.style.display = "none";
    });
});
