---
title: 直播间弹幕
date: 2022-03-27 10:54:49
layout: page-without-sidebar
---

<script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"></script>

<script>
(function () {
    let url = "https://live-danmaku.b11p.com/danmakuHub";
    let group = "4463403c-aff8-c16d-0933-4636405ff116";
    var connection = new signalR.HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build();
    connection.onreconnected(function () {
        connection.invoke('JoinGroup', group).catch(err => console.error(err));
    });
    connection.start().then(function () {
        connection.invoke('JoinGroup', group).catch(err => console.error(err));
    }).catch(err => console.error(err));
    connection.on("ReceiveMessage", function (user, message) {
        console.log(message);
        let post = document.querySelector("div.post-content");
        let p = document.createElement("p");
        p.innerText = "(" +  new Date().toLocaleTimeString() + ") " + user + ": " + JSON.parse(message).text;
        post.appendChild(p);
    });
})();
</script>