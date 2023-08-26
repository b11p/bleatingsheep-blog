---
title: 咩咩的直播间
date: 2022-02-21 22:29:13
layout: page-without-sidebar
---
<link rel="stylesheet" href="/css/DPlayer.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/dplayer/1.26.0/DPlayer.min.js"></script>
<script src="/live/mpegts.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/6.0.5/signalr.min.js"></script>
<script src="https://live-flv.b11p.com/players/js/srs.sdk.js"></script>

<script src="/live/danmaku.js"></script>

这里是咩咩的直播间。

<div id="dplayer"></div>

<p id="userName" hidden>你的用户名是：<span id="userNameSpan"></span> <a href="javascript:clearUserName();">清除用户名</a></p>

<script>
(function() {
    let userName = window.localStorage.getItem("danmakuUserName");
    if (userName) {
        let elem = document.getElementById('userName');
        elem.hidden = false;
        let spanElem = document.getElementById('userNameSpan');
        spanElem.textContent = userName;
    }
})();

function clearUserName() {
    window.localStorage.removeItem('danmakuUserName');
    window.alert("清除成功，发送弹幕即可重新设置用户名。");
    let elem = document.getElementById('userName');
    elem.hidden = true;
}
</script>

<details id="danmakuHistory">
<summary>弹幕历史</summary>
</details>

---

<script>
var needReload = false;
var latency = 3.0;
</script>

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
            console.log(currentDan);
            addDanmakuHistory(currentDan.user, currentDan.data.text, currentDan.time_stamp);
        }
    },
);
danmakuSingleton.connection.on("ReceiveMessage", function (user, message) {
    addDanmakuHistory(user, JSON.parse(message).text);
});
var useWebRtc = false;
var quality = useWebRtc ? {
    name: 'WebRTC',
    url: 'webrtc://live-flv.b11p.com:443/live/livestream',
    type: 'webrtc'
} : {
    name: 'FLV',
    url: 'https://live-flv.b11p.com/live/livestream.flv',
    type: 'mpegts',
};
var destroyCallback = null;
function createPlayer() {
    latency = 10;
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
                quality,
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
                'mpegts': function (video, player) {
                    var src = video.src;
                    if (mpegts.getFeatureList().mseLivePlayback) {
                        var videoElement = video;
                        var mpegtsplayer = mpegts.createPlayer({
                            enableWorker: true,
                            type: 'mse',  // could also be mpegts, m2ts, flv
                            isLive: true,
                            url: src,
                            liveBufferLatencyChasing: true,
                        });
                        mpegtsplayer.attachMediaElement(videoElement);
                        mpegtsplayer.load();
                        mpegtsplayer.play();
                        player.events.on('destroy', function () {
                            mpegtsplayer.destroy();
                        });
                        mpegtsplayer.on(mpegts.Events.ERROR, (t, u, v) => {
                            console.error({ t, u, v });
                            dp.destroy();
                            createPlayer();
                        });
                    }
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
        pluginOptions: {
            flv: {
                config: {
                    // enableStashBuffer: false, // may cause audio delay and not sync with video
                    // stashInitialSize: 128,
                    isLive: true,
                    // lazyLoad: true, // not working at live streaming?
                    // lazyLoadMaxDuration: 30, // default may be 300-600s at live streaming.
                    // lazyLoadRecoverDuration: 10,
                },
                // mediaDataSource: {
                //     isLive: true,
                // }
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

    if (!useWebRtc) {
        // Configure auto connect
        dp.video.onended = () => {
            dp.destroy();
            createPlayer();
            // dp.play();
        };

        // // flvjs error
        // dp.plugins.flvjs.on(flvjs.Events.ERROR, (t, u, v) => {
        //     console.error({ t, u, v });
        //     dp.destroy();
        //     createPlayer();
        // });
    }
}
createPlayer();

// This event often fires, so it can be used for lower latency.
// dp.video.oncanplaythrough = () => console.log("canplaythrough");
dp.video.onsuspended = () => console.log("suspended");
dp.video.onsuspend = () => console.log("suspend");
dp.video.onerror = () => console.log("error");
dp.video.onstalled = () => console.log("stalled");

</script>
