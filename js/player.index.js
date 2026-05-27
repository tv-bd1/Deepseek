document.addEventListener("DOMContentLoaded", function () {
    let player = null;
    let channelData = [];

    // ডিফল্ট M3U লিংক (AynaOTT)
    const DEFAULT_M3U_URL = "https://raw.githubusercontent.com/Rakib49/Rakibiptv/refs/heads/main/aynaott.m3u";

    // ডিফল্ট লোগো (যদি কোনো চ্যানেলের লোগো M3U-তে না থাকে তবে এটি দেখাবে)
    const FALLBACK_LOGO = "images/tv_icon.png"; 

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

    // ফর্ম টগল
    addM3uLink.addEventListener("click", (e) => {
        e.preventDefault();
        m3uForm.classList.toggle("hidden");
    });

    // ম্যানুয়াল লোড
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

    // আপডেটেড M3U Parser (যা লোগো লিংক বা tvg-logo রিড করতে পারে)
    function parseM3U(m3uRaw) {
        const lines = m3uRaw.split("\n");
        const channels = [];
        let currentName = "";
        let currentLogo = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF:")) {
                // tvg-logo="URL" খোঁজার লজিক
                const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                if (logoMatch && logoMatch[1]) {
                    currentLogo = logoMatch[1];
                } else {
                    currentLogo = "";
                }

                // চ্যানেল নাম এক্সট্র্যাক্ট করা
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
                    logo: currentLogo || FALLBACK_LOGO // লোগো না থাকলে ডিফল্ট লোগো বসবে
                });
                currentName = ""; 
                currentLogo = "";
            }
        }
        return channels;
    }

    // আপডেটেড চ্যানেল লিস্ট রেন্ডার (লোগো ইমেজ সহ)
    function renderChannels(channels) {
        channelsUl.innerHTML = "";
        channels.forEach((channel, index) => {
            const li = document.createElement("li");
            
            // ১. লোগোর জন্য <img> ট্যাগ তৈরি
            const img = document.createElement("img");
            img.src = channel.logo;
            img.alt = channel.name;
            // কোনো কারণে ইমেজ লোড না হলে ডিফল্ট আইকন দেখানোর সেফটি ফিল্টার
            img.onerror = function() {
                this.src = FALLBACK_LOGO;
            };

            // ২. চ্যানেলের নামের জন্য <span> বা টেক্সট নোড তৈরি
            const nameSpan = document.createElement("span");
            nameSpan.textContent = channel.name;

            // ৩. লোগো এবং নামকে <li> এর ভেতরে পুশ করা
            li.appendChild(img);
            li.appendChild(nameSpan);

            // ক্লিক ইভেন্ট
            li.addEventListener("click", function() {
                document.querySelectorAll("#channels li").forEach(el => el.classList.remove("active-channel"));
                li.classList.add("active-channel");
                playChannel(channel.url);
            });

            channelsUl.appendChild(li);
        });

        // অটো-প্লে ফার্স্ট চ্যানেল
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

    // রিমুভ প্লেলিস্ট
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
