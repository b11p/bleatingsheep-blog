const liveDan = function (url, group, onMessage) {
    var connection = new signalR.HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build();
    connection.onreconnected(function () {
        connection.invoke('JoinGroup', group).catch(err => console.error(err));
    });
    connection.start().then(function () {
        connection.invoke('JoinGroup', group).catch(err => console.error(err));
    }).catch(err => console.error(err));
    connection.on("ReceiveMessage", function (user, message) {
        onMessage(JSON.parse(message));
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
            connection.invoke('SendMessage', group, userName, JSON.stringify(mess)).catch(err => console.error(err));
        },
        connection,
    };
}