---
title: 咩咩的直播间
date: 2022-02-21 22:29:13
layout: page-without-sidebar
---
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.css">
<script src="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js"></script>
<!-- <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script> -->
<script src="https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js"></script>
<!-- <script src="https://cdn.jsdelivr.net/npm/shaka-player/dist/shaka-player.compiled.js"></script> -->
<!-- <script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script> -->
<script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js"></script>
<!-- <script src="https://cdn.jsdelivr.net/gh/u2sb/Danmu.Server@gh-pages/js/livedanmu.js"></script> -->
<script>
const liveDan = function (url, group, onMessage) {
    var connection = new signalR.HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build();
    connection.start().then(function () {
        connection.invoke('Connection', group).catch(err => console.error(err));
    }).catch(err => console.error(err));
    connection.on("ReceiveMessage", function (user, message) {
        onMessage(JSON.parse(message));
    });
    return {
        read: function (options) {
            options.success();
        },
        send: function (options) {
            var mess = options.data;
            connection.invoke('SendMessage', group, "user", JSON.stringify(mess)).catch(err => console.error(err));
            options.success();
        }
    };
}
</script>

这里是咩咩的直播间，正在施工。预计 4 月正式开播！

<div id="dplayer"></div>

打钱！
---

<img src="receive-alipay.png" alt="" width=360 />

<img src="receive-wechat.png" alt="" width=360 />

---
TODO:

- ~~解决线路切换问题~~
- ~~降低延迟~~
- ~~改用 DASH，不再使用 HLS~~
- ~~加入弹幕~~
- 加入聊天框显示最近的弹幕，以免错过
- 后台记录发送的弹幕
- 显示在线人数

不换 DASH，改用 FLV 了，虽然不能自动切换清晰度，但是延迟低。dplayer 切换清晰度时，原来清晰度的文件下载不会停止，所以就提供一个清晰度/线路得了。

<script>
    const dp = new DPlayer({
        container: document.getElementById('dplayer'),
        live: true,
        autoplay: true,
        screenshot: true,
        volume:1,
        video: {
            //url: '@ViewBag.Url',
            // quality: @Html.Raw(ViewBag.Quality),
            quality: [
                // {
                //     name: 'IPv4',
                //     url: 'https://live4.b11p.com/live.mpd',
                //     type: 'dashJS',
                // },
                // {
                //     name: 'Dual Stack',
                //     url: 'https://live.b11p.com/live.mpd',
                //     type: 'dashJS',
                // },
                {
                    name: 'FLV',
                    url: 'https://live-flv.b11p.com/live/movie.flv',
                    type: 'flv',
                },
            ],
            defaultQuality: 0,
            // type: 'splr',
            customType: {
                'splr': function (video, player) {
                    var src = video.src;

                    var playerShaka = new shaka.Player(video);
                    playerShaka.configure({
                        streaming: {
                            bufferingGoal: 60,
                            bufferBehind: 30,
                            retryParameters: {
                                timeout: 0,       // timeout in ms, after which we abort; 0 means never
                                maxAttempts: 200,   // the maximum number of requests before we fail
                                baseDelay: 100,  // the base delay in ms between retries
                                // backoffFactor: 2, // the multiplicative backoff factor between retries
                                // fuzzFactor: 0.5,  // the fuzz factor to apply to each retry delay
                            },
                            smallGapLimit: 0
                        },
                        abr: {
                            defaultBandwidthEstimate: 2000000, // bits per second.
                            switchInterval: 1
                        }
                    });

                    // Listen for error events.
                    // playerShaka.addEventListener('error', onErrorEvent);

                    // // Try to load a manifest.
                    // // This is an asynchronous process.
                    // playerShaka.load(src).then(function () {
                    //     // This runs if the asynchronous load is successful.
                    //     console.log('The video has now been loaded!');
                    // }).catch(onError);  // onError is executed if the asynchronous load fails.

                    playerShaka.load(src);
                },
                'dashJS': function (video, player) {
                    var src = video.src;

                    var sPlayer = dashjs.MediaPlayer().create();
                    sPlayer.initialize();
                    sPlayer.updateSettings({
                        'debug': {
                        },
                        'streaming': {
                            'buffer': {
                                'bufferTimeAtTopQualityLongForm': 240,
                                'fastSwitchEnabled': true       // enables buffer replacement when switching bitrates for faster switching
                            },
                            'gaps': {
                                jumpGaps: false,
                            }
                        }
                    });
                    //sPlayer.setAutoPlay(false); // remove this line if you want the player to start automatically on load
                    sPlayer.attachView(video); // tell the player which videoElement it should use
                    sPlayer.attachSource(src); // provide the manifest source
                }
            }
        },
        danmaku: true,
        apiBackend: liveDan(
            "https://live-danmaku.b11p.com/danmakuHub",
            "4463403c-aff8-c16d-0933-4636405ff116",
            function (dan) {
                dp.danmaku.draw(dan);
            }
        ),
    });
</script>