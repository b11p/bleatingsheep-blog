const liveDan = function (url, group, onMessage, onBacklogMessages) {
    let recentReceivedDanmaku = new Date(new Date().getTime() - 14400000); // recent 5 hours
    var connection = new signalR.HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build();
    connection.onreconnected(function () {
        connection.invoke('JoinGroup', group).catch(err => console.error(err))
            .then(() => connection.invoke("GetRecentDanmaku", "4463403c-aff8-c16d-0933-4636405ff116", recentReceivedDanmaku))
            .then(r => {
                if (new Date() > recentReceivedDanmaku) {
                    recentReceivedDanmaku = new Date();
                }
                if (onBacklogMessages) {
                    onBacklogMessages(r);
                }
                for (let currentDan of danmakuList) {
                    addDanmakuHistory(currentDan.user, currentDan.data.text, currentDan.time_stamp)
                }
            })
            .catch(err => console.error(err));
    });
    var tryStart = () => {
        connection.start()
            .then(function () {
                connection.invoke('JoinGroup', group).catch(err => console.error(err));
            })
            .then(() => connection.invoke("GetRecentDanmaku", "4463403c-aff8-c16d-0933-4636405ff116", recentReceivedDanmaku))
            .then(r => {
                if (onBacklogMessages) {
                    onBacklogMessages(r);
                }
            }).catch(err => {
                console.log({ m: "Connection failed. Retrying in 5 seconds.", e: err });
                window.setTimeout(tryStart, 5000);
            });
    };
    tryStart();
    connection.on("ReceiveMessage", function (user, message) {
        if (new Date() > recentReceivedDanmaku) {
            recentReceivedDanmaku = new Date();
        }
        onMessage(user, JSON.parse(message));
    });
    connection.onclose(t => {
        console.log({ m: "Connection closed. Reconnecting.", t });
        tryStart();
    });

    return {
        send: function (message) {
            var mess = message;
            let userName = window.localStorage.getItem("danmakuUserName");
            if (!userName) {
                userName = window.prompt("请输入昵称，留空将使用 IP 地址。");
                if (!userName) {
                    userName = "";
                }
                else {
                    window.localStorage.setItem("danmakuUserName", userName);
                }
            }
            connection.send('SendMessage', group, userName, JSON.stringify(mess))
                .then(() => {
                    if (new Date() > recentReceivedDanmaku) {
                        recentReceivedDanmaku = new Date();
                    }
                }).catch(err => {
                    console.error(err);
                    window.alert("发送失败");
                });
        },
        connection,
    };
}