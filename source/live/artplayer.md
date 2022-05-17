---
title: Artplayer 测试版
layout: page-without-sidebar
---

<script src="https://cdnjs.cloudflare.com/ajax/libs/flv.js/1.6.2/flv.min.js"></script>
<script src="https://live-flv.b11p.com/players/js/srs.sdk.js"></script>

<script src="https://unpkg.com/artplayer/dist/artplayer.js"></script>
<script src="https://unpkg.com/artplayer-plugin-danmuku/dist/artplayer-plugin-danmuku.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/6.0.5/signalr.min.js"></script>
<script src="/live/danmaku.js"></script>

<style>
.artplayer-app {
    width: 100%;
    height: 613px;
}
</style>


<div class="artplayer-app"></div>

<div id="flvhint">

当前直播估计延迟 <span id="latency">10</span> 秒，网络不佳时可能估计不准确。如果暂停时数值未增加，请刷新页面。

播放速率为 <span id="speed">1x</span>。

如果播放加载缓慢，经常缓冲，可以尝试切换线路。

</div>

<script>
var dispose = null;
var playingType = '';
function disposeDanmaku() {
    if (art.plugins.artplayerPluginDanmuku) {
        art.plugins.artplayerPluginDanmuku.config({}).queue = [];
    }
}

var art = new Artplayer({
    container: '.artplayer-app',
    url: 'https://live-cf.b11p.com/live/livestream.flv',
    type: 'flv',
    isLive: true,
    autoplay: true,
    autoSize: true,
    fullscreen: true,
    autoMini: true,
    setting: true,
    quality: [
        // {
        //     default: true,
        //     html: 'Dual Stack',
        //     url: 'https://live-flv.b11p.com/live/livestream.flv',
        //     type: 'flv'
        // },
        {
            html: 'IPv4',
            url: 'https://live4.b11p.com/live/livestream.flv',
            type: 'flv'
        },
        {
            default: true,
            html: 'Cloudflare',
            url: 'https://live-cf.b11p.com/live/livestream.flv',
            type: 'flv'
        },
        // {
        //     default: true,
        //     html: 'WebRTC',
        //     url: 'webrtc://live-flv.b11p.com:443/live/livestream',
        //     type: 'webrtc'
        // }
    ],
    customType: {
        flv: function (video, sbaplayerurl) {
            let url = sbaplayerurl;
            console.log(url);

            // webrtc 兼容代码
            if (url.indexOf('webrtc://') === 0) {
                console.log("using webrtc compatible code");
                art.option.customType.webrtc(video, url);
                return;
            }

            if (dispose) dispose();
            playingType = 'flv';
            console.log("Loading flv player");
            let flvPlayer = flvjs.createPlayer({
                type: 'flv',
                url: url,
            });
            flvPlayer.attachMediaElement(video);
            flvPlayer.load();
            dispose = () => {
                flvPlayer.unload();
                flvPlayer.detachMediaElement();
                flvPlayer.destroy();
            };
            disposeDanmaku();
        },
        webrtc: function (video, url) {
            console.log(url);

            // flv 兼容代码
            if (url.endsWith('.flv')) {
                console.log("using flv compatible code");
                art.option.customType.flv(video, url);
                return;
            }

            if (dispose) dispose();
            playingType = 'webrtc';
            console.log("Loading webrtc player");
            let sdk = new SrsRtcPlayerAsync();
            video.srcObject = sdk.stream;
            sdk.play(url).catch(function (reason) {
                sdk.close();
                $('#rtc_media_player').hide();
                console.error(reason);
            });
            dispose = function () {
                sdk.close();
            };
            disposeDanmaku();
        }
    },
    plugins: [
        artplayerPluginDanmuku({
            // 弹幕数组
            // danmuku: [],
            speed: 5, // 弹幕持续时间，单位秒，范围在[1 ~ 10]
            opacity: 1, // 弹幕透明度，范围在[0 ~ 1]
            fontSize: 25, // 字体大小，支持数字和百分比
            color: '#FFFFFF', // 默认字体颜色
            mode: 0, // 默认模式，0-滚动，1-静止
            margin: ['2%', 60], // 弹幕上下边距，支持数字和百分比
            antiOverlap: true, // 是否防重叠
            useWorker: true, // 是否使用 web worker
            synchronousPlayback: false, // 是否同步到播放速度
            filter: (danmu) => danmu.text.length < 50, // 弹幕过滤函数
        }),
    ],
});
</script>

<script>
// init danmaku
var danmakuSingleton = liveDan(
    "https://live-danmaku.b11p.com/danmakuHub",
    "4463403c-aff8-c16d-0933-4636405ff116",
    function (dan) {
        // dan.border = false;
        dan.time = undefined;
        dan.color = '#FFFFFF';
        console.log(dan);
        art.plugins.artplayerPluginDanmuku.emit(dan);
    }
);
art.on('artplayerPluginDanmuku:emit', (danmu) => {
    danmakuSingleton.send({data: danmu, success: () => {}});
});
</script>

<script async>
let latencyAlleviation = {};
latencyAlleviation.latencySpan = document.getElementById('latency');
latencyAlleviation.speedSpan = document.getElementById('speed');

function getBuffered() {
    return art.attr('buffered');
}
function getPlaybackRate() {
    return art.attr('playbackRate');
}
function setPlaybackRate(rate) {
    art.attr('playbackRate', rate);
}
function getCurrentTime() {
    return art.attr('currentTime');
}

var latency = 3.0;

window.setInterval(() => {
    if (playingType !== 'flv') {
        $('#flvhint').hide();
        return;
    }
    $('#flvhint').show();

    let buffered = getBuffered();
    let bufferCount = buffered.length;
    if (bufferCount == 0) {
        return;
    }

    let currentplaybackRate = getPlaybackRate();
    latency -= 0.2 * (currentplaybackRate - 1) + 0.02;

    let buffetLength = buffered.end(bufferCount - 1) - getCurrentTime();
    if (buffetLength + 2.5 > latency) {
        latency = buffetLength + 2.5;
    }

    latencyAlleviation.latencySpan.innerText = (latency).toFixed(0);
    if (buffetLength < 2.0 && currentplaybackRate > 1.0) {
        setPlaybackRate(1.0);
        latencyAlleviation.speedSpan.innerText = '1x';
    }
    else if (buffetLength > 12.0 && currentplaybackRate < 1.1) {
        setPlaybackRate(1.1);
        latencyAlleviation.speedSpan.innerText = '1.1x';
    }
    else if (buffetLength > 37.0 && currentplaybackRate < 1.2) {
        setPlaybackRate(1.2);
        latencyAlleviation.speedSpan.innerText = '1.2x';
    }
}, 200);
</script>