document.addEventListener("DOMContentLoaded", function () {
    let player = null;
    let channelData = [];

    // আপনার দেওয়া ডিফল্ট M3U লিংক
    const DEFAULT_M3U_URL = "https://raw.githubusercontent.com/Rakib49/Rakibiptv/refs/heads/main/aynaott.m3u";

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
        // প্রথমে চেক করবে ইউজারের লোকাল স্টোরেজে কোনো প্লেলিস্ট সেভ আছে কিনা
        const savedPlaylist = localStorage.getItem("nexo_playlist");
        if (savedPlaylist) {
            channelData = JSON.parse(savedPlaylist);
            renderChannels(channelData);
            channelHeading.classList.remove("hidden");
        } else {
            // যদি না থাকে তবে আপনার দেওয়া আয়নাত্ত (AynaOTT) লিংকটি অটো-লোড করবে
            fetchPlaylist(DEFAULT_M3U_URL);
        }
    }

    // ফর্ম হাইড/শো টগল
    addM3uLink.addEventListener("click", (e) => {
        e.preventDefault();
        m3uForm.classList.toggle("hidden");
    });

    // ম্যানুয়ালি কোনো লিংক লোড করার ইভেন্ট
    loadM3uBtn.addEventListener("click", () => {
        const url = m3uInput.value.trim();
        if (!url) {
            alert("Please enter a valid M3U URL");
            return;
        }
        fetchPlaylist(url);
    });

    // প্লেলিস্ট ফেচ করার মেইন ফাংশন
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
                alert("Failed to load M3U link. Make sure it's correct and CORS enabled.");
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

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF:")) {
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
                    url: line
                });
                currentName = ""; 
            }
        }
        return channels;
    }

    // চ্যানেল লিস্ট UI তে দেখানো
    function renderChannels(channels) {
        channelsUl.innerHTML = "";
        channels.forEach((channel, index) => {
            const li = document.createElement("li");
            li.textContent = channel.name;
            li.addEventListener("click", function() {
                // অ্যাক্টিভ চ্যানেল হাইলাইট করার জন্য
                document.querySelectorAll("#channels li").forEach(el => el.classList.remove("active-channel"));
                li.classList.add("active-channel");
                
                playChannel(channel.url);
            });
            channelsUl.appendChild(li);
        });

        // প্রথম চ্যানেলটি অটোমেটিক চালু হবে
        if (channels.length > 0 && !player) {
            channelsUl.children[0].classList.add("active-channel");
            playChannel(channels[0].url);
        }
    }

    // Clappr প্লেয়ার দিয়ে লাইভ স্ট্রিম চালানো
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

    // প্লেলিস্ট রিমুভ করার লজিক
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
