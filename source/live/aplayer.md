---
title: Aplayer
layout: page-without-sidebar
---
<script src="https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js"></script>

<script src="https://cdn.jsdelivr.net/npm/artplayer@4.4.0/dist/artplayer.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/artplayer-plugin-danmuku@4.4.0/dist/artplayer-plugin-danmuku.js"></script>
<style>
.artplayer-app {
    width: 1280px;
    height: 720px;
}
</style>


<div class="artplayer-app"></div>

<script>
var dispose = null;

var art = new Artplayer({
    container: '.artplayer-app',
    url: 'https://live-flv.b11p.com/live/livestream.flv',
    type: 'flv',
    isLive: true,
    autoplay: true,
    autoSize: true,
    fullscreen: true,
    autoMini: true,
    setting: true,
    quality: [
        {
            default: true,
            html: 'Dual Stack',
            url: 'https://live-flv.b11p.com/live/livestream.flv',
        },
        {
            html: 'IPv4',
            url: 'https://live4.b11p.com/live/livestream.flv',
        },
    ],
    customType: {
        flv: function (video, url) {
            if (dispose) dispose();
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
        },
    },
    plugins: [
        artplayerPluginDanmuku({
            // 弹幕数组
            danmuku: [
                {
                    text: '111', // 弹幕文本
                    time: 1, // 发送时间，单位秒
                    color: '#fff', // 弹幕局部颜色
                    border: false, // 是否显示描边
                    mode: 0, // 弹幕模式: 0表示滚动、1静止
                },
                {
                    text: '222',
                    time: 2,
                    color: 'red',
                    border: true,
                    mode: 0,
                },
                {
                    text: '333',
                    time: 3,
                    color: 'green',
                    border: false,
                    mode: 1,
                },
            ],
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
art.on('play', (...args) => {
    console.info(args);
});
art.on('artplayerPluginDanmuku:emit', (danmu) => {
    console.info('新增弹幕', danmu);
});
art.plugins.artplayerPluginDanmuku.emit({text: "test text", color: "#FFFFFF", border: false})
</script>
