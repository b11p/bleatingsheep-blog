---
title: iOS兼容模式
date: 2022-02-21 22:29:13
layout: page-without-sidebar
---
<link rel="stylesheet" href="/css/DPlayer.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/dplayer/1.26.0/DPlayer.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.1.5/hls.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.6.2/flv.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/6.0.5/signalr.min.js"></script>

<script src="/live/danmaku.js"></script>

这里是咩咩的直播间。

<div id="dplayer"></div>

<details id="danmakuHistory">
<summary>弹幕历史</summary>
</details>

---
iOS 兼容模式，延迟较大。

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

<script>
var dp;
var danmakuSingleton = liveDan(
    "https://live-danmaku.b11p.com/danmakuHub",
    "4463403c-aff8-c16d-0933-4636405ff116",
    function (user, dan) {
        dp.danmaku.draw(dan);
    },
    function (danmakuList) {
        for (let currentDan of danmakuList) {
            addDanmakuHistory(currentDan.user, currentDan.data.text, currentDan.time_stamp)
        }
    },
);
danmakuSingleton.connection.on("ReceiveMessage", function (user, message) {
    addDanmakuHistory(user, JSON.parse(message).text);
});
function createPlayer() {
    dp = new DPlayer({
        container: document.getElementById('dplayer'),
        live: true,
        autoplay: true,
        screenshot: true,
        volume:1,
        video: {
            //url: '@ViewBag.Url',
            // quality: @Html.Raw(ViewBag.Quality),
            quality: [
                {
                    name: 'HLS',
                    url: 'https://live-flv.b11p.com/live/livestream.m3u8',
                    type: 'hls',
                }
            ],
            defaultQuality: 0,
            // type: 'splr',
            customType: {
                'webrtc': function (video, player) {
                    let url = video.src;
                    let sdk = new SrsRtcPlayerAsync();
                    video.srcObject = sdk.stream;
                    sdk.play(url).catch(function (reason) {
                        sdk.close();
                        $('#rtc_media_player').hide();
                        console.error(reason);
                    });
                    player.events.on('destroy', function () {
                        sdk.close();
                    });
                },
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
        apiBackend: {
            read: function (options) {
                options.success();
            }, 
            send: options => {
                danmakuSingleton.send(options.data);
                options.success();
                addDanmakuHistory("我", options.data.text);
            },
        },
    });
}
createPlayer();

</script>
