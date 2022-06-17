---
title: 直播间弹幕
date: 2022-03-27 10:54:49
layout: page-without-sidebar
---

<script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/6.0.5/signalr.min.js"></script>

<script src="/live/danmaku.js"></script>

<script>
var danmakuSingleton = liveDan(
    "https://live-danmaku.b11p.com/danmakuHub",
    "4463403c-aff8-c16d-0933-4636405ff116",
    function (user, message) {
        let post = document.querySelector("div.post-content");
        let p = document.createElement("p");
        p.innerText = "(" +  new Date().toLocaleTimeString() + ") " + user + ": " + message.text;
        post.appendChild(p);
    }
);
</script>