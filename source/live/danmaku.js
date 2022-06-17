const liveDan = function (url, group, onMessage) {
    var connection = new signalR.HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build();
    connection.onreconnected(function () {
        connection.invoke('JoinGroup', group).catch(err => console.error(err));
    });
    var tryStart = () => {
        connection.start().then(function () {
            connection.invoke('JoinGroup', group).catch(err => console.error(err));
        }).catch(err => {
            console.log({m: "Connection failed. Retrying in 5 seconds.", e: err});
            window.setTimeout(tryStart, 5000);
        });
    };
    tryStart();
    connection.on("ReceiveMessage", function (user, message) {
        onMessage(user, JSON.parse(message));
    });
    connection.onclose(t => {
        console.log({m: "Connection closed. Reconnecting.", t});
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
            connection.invoke('SendMessage', group, userName, JSON.stringify(mess)).catch(err => {
                console.error(err);
                window.alert("发送失败");
            });
        },
        connection,
    };
}