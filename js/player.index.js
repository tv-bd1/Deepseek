document.addEventListener("DOMContentLoaded", function () {
    let player = null;
    let channelData = [];

    const DEFAULT_M3U_URL = "https://raw.githubusercontent.com/Rakib49/Rakibiptv/refs/heads/main/aynaott.m3u";

    // DOM Elements
    const addM3uLink = document.getElementById("add-m3u-link");
    const removeListLink = document.getElementById("removelist");
    const m3uFormContainer = document.getElementById("m3u-form-container");
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

    // Add M3U লিঙ্কে ক্লিক করলে ইনপুট ফর্মটি টগল হবে[span_4](start_span)[span_4](end_span)
    addM3uLink.addEventListener("click", (e) => {
        e.preventDefault();
        m3uFormContainer.classList.toggle("hidden");
        m3uInput.focus();
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
                    m3uFormContainer.classList.add("hidden");
                    m3uInput.value = "";
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

    // স্ক্রিনশটের মতো আইকন ছাড়া নিখুঁত টেক্সট লিস্ট রেন্ডারিং[span_5](start_span)[span_5](end_span)[span_6](start_span)[span_6](end_span)
    function renderChannels(channels) {
        channelsUl.innerHTML = "";
        channels.forEach((channel, index) => {
            const li = document.createElement("li");
            
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

        // অটো-প্লে প্রথম চ্যানেল
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

    removeListLink.addEventListener("click", (e) => {
        e.preventDefault();
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
