---
title: 咩咩的直播间
date: 2022-02-21 22:29:13
layout: page-without-sidebar
---
<link rel="stylesheet" href="/css/DPlayer.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/dplayer/1.26.0/DPlayer.min.js"></script>
<!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.1.5/hls.min.js"></script> -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.6.2/flv.min.js"></script>
<!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.0.0/shaka-player.compiled.js"></script> -->
<!-- <script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script> -->
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

<div id="flvhint">

当前直播估计延迟 <span id="latency">10</span> 秒，网络不佳时可能估计不准确。如果暂停时数值未增加，请刷新页面。播放速率为 <span id="speed">1x</span>。

长时间暂停后可能无法继续播放，请刷新页面。

已经上 CN2 GIA 了，再卡自杀。测试中的 <a href="/live/artplayer.html">Artplayer</a> 可以切换 Cloudflare网络。

[WebRTC](/live/webrtc.html) 模式延迟更低。

</div>

<div id="webrtchint">

正在使用 WebRTC 播放。延迟约 1 秒。若推流断线，WebRTC 重连时间较长，请耐心等待或刷新页面。

已经上 CN2 GIA 了，再卡自杀。测试中的 <a href="/live/artplayer.html">Artplayer</a> 可以切换 Cloudflare网络。

若无法播放，请尝试备用 [flv.js](/live/flv.html) 播放器，延迟稍高。

</div>

iOS 若无法后台播放可以尝试 [iOS 兼容模式](/live/ios.html)，延迟较大。

若有卡顿现象请弹幕或留言反馈。

---
### 直播内容
#### 计算机网络
科普计算机网络知识。

下一节暂定某个周日晚上 8 点，会讲物理层、数据链路层，没听过第一节课也不会有影响！

课程资料（包含录播等）: https://notes.bleatingsheep.org/s/computer-network

#### 游戏直播
每次从下面的游戏里选一个播，可以留言写下想看的游戏，或者在弹幕实时互动，我会播大家喜欢的~~那不就是黄油吗，这可不兴播啊~~（x

游戏列表：

- 宝可梦 紫
- 节奏过山车
- 咩咩启示录
- 苏菲的炼金工房2
- 异度神剑3
- 奥日系列
- 八方旅人
- 三位一体4
- 马里奥系列（派对、银河、制造）
- Baba Is You
- 还有其他的小游戏
- ~~舞力全开~~没摄像头没场地

<!-- 打钱！
---

<img src="receive-alipay.png" alt="" width=360 />

<img src="receive-wechat.png" alt="" width=360 />

把抢到的 QQ 红包投喂给我吧！

<img src="receive-qq.png" alt="" width=360 /> -->

---
TODO:

- ~~解决线路切换问题~~
- ~~降低延迟~~
- ~~改用 DASH，不再使用 HLS~~
- ~~加入弹幕~~
- ~~加入聊天框显示最近的弹幕，以免错过~~以某种方式实现了……
- 后台记录发送的弹幕
- 显示在线人数
- ~~增强弹幕功能健壮性：确保自动重连、离线或发送失败时提示用户~~弹幕很久没出过问题了已经，应该差不多了。

不换 DASH，改用 FLV 了，虽然不能自动切换清晰度，但是延迟低。dplayer 切换清晰度时，原来清晰度的文件下载不会停止，所以就提供一个清晰度/线路得了。

ArtPlayer 似乎是一个很好的替代，它可以编写代码来实现在切换清晰度时正确地销毁之前的实例，但我不想在前端上花太多工夫。

### 软件

- 播放器：[DPlayer](https://dplayer.js.org/zh/)
- 直播后台：[SRS](https://github.com/ossrs/srs)
- 弹幕后台：<https://github.com/b11p/bleatingsheep.Danmaku>（自制）

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
var useWebRtc = !flvjs.isSupported();
if (useWebRtc) {
    $("#flvhint")[0].hidden = true;
} else {
    $("#webrtchint")[0].hidden = true;
}
var quality = useWebRtc ? {
    name: 'WebRTC',
    url: 'webrtc://live-flv.b11p.com:443/live/livestream',
    type: 'webrtc'
} : {
    name: 'FLV',
    url: 'https://live-flv.b11p.com/live/livestream.flv',
    type: 'flv',
};
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

        // flvjs error
        dp.plugins.flvjs.on(flvjs.Events.ERROR, (t, u, v) => {
            console.error({ t, u, v });
            dp.destroy();
            createPlayer();
        });
    }

    // buffer is too long
    dp.on('play', () => {
        if (!needReload) {
            return;
        }
        needReload = false;
        dp.destroy();
        createPlayer();
    });
}
createPlayer();

// This event often fires, so it can be used for lower latency.
// dp.video.oncanplaythrough = () => console.log("canplaythrough");
dp.video.onsuspended = () => console.log("suspended");
dp.video.onsuspend = () => console.log("suspend");
dp.video.onerror = () => console.log("error");
dp.video.onstalled = () => console.log("stalled");

</script>

<script async>
if (!useWebRtc) {
    let latencyAlleviation = {};
    latencyAlleviation.latencySpan = document.getElementById('latency');
    latencyAlleviation.speedSpan = document.getElementById('speed');

    // async function __aaaaafucklatency__() {
    //     let container = document.getElementById('dplayer');
    //     let video = container.querySelector('video');
    //     let latencySpan = document.getElementById('latency');
    //     for (;;) {
    //         await new Promise(r => setTimeout(r, 100));
    //         let bufferCount = video.buffered.length;
    //         if (bufferCount == 0) {
    //             await new Promise(r => setTimeout(r, 10000));
    //             continue;
    //         }
    //         let latency = video.buffered.end(bufferCount - 1) - video.currentTime;
    //         latencySpan.innerText = latency.toFixed(2);
    //     }
    // }
    // __aaaaafucklatency__();

    window.setInterval(() => {
        let bufferCount = dp.video.buffered.length;
        if (bufferCount == 0) {
            return;
        }

        let currentplaybackRate = dp.video.playbackRate;
        latency -= 0.2 * (currentplaybackRate - 1) + 0.02;

        let buffetLength = dp.video.buffered.end(bufferCount - 1) - dp.video.currentTime;

        if (buffetLength > 60 && dp.paused) {
            needReload = true;
            dp.plugins.flvjs.unload();
        }

        if (buffetLength + 2.5 > latency) {
            latency = buffetLength + 2.5;
        }

        latencyAlleviation.latencySpan.innerText = (latency).toFixed(0);
        if (buffetLength < 2.0 && dp.video.playbackRate > 1.0) {
            dp.video.playbackRate = 1.0;
        }
        else if (buffetLength > 12.0 && dp.video.playbackRate < 1.1) {
            dp.video.playbackRate = 1.1;
        }
        else if (buffetLength > 37.0 && dp.video.playbackRate < 1.2) {
            dp.video.playbackRate = 1.2;
        }
        latencyAlleviation.speedSpan.innerText = dp.video.playbackRate + "x";
    }, 200);
}
</script>