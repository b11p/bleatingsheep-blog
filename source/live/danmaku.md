---
title: 直播间弹幕
date: 2022-03-27 10:54:49
layout: page-without-sidebar
---

<div id="danmakuHistory">
</div>

<script>
function addDanmakuHistory(user, text, time) {
    if (time) {
        time = new Date(time);
    }
    else {
        time = new Date();
    }
    let post = document.querySelector("#danmakuHistory");
    let p = document.createElement("p");
    p.innerText = "(" +  time.toLocaleTimeString() + ") " + user + ": " + text;
    post.appendChild(p);
}
</script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/6.0.5/signalr.min.js"></script>

<script src="/live/danmaku.js"></script>

<script>
var lastDanmakuData;

var danmakuSingleton = liveDan(
    "https://live-danmaku.b11p.com/danmakuHub",
    "4463403c-aff8-c16d-0933-4636405ff116",
    function (user, message) {
        console.log(message);
        lastDanmakuData = message;
        addDanmakuHistory(user, message.text);
    },
    function (danmakuList) {
        for (let currentDan of danmakuList) {
            addDanmakuHistory(currentDan.user, currentDan.data.text, currentDan.time_stamp)
        }
    },
);
</script>