---
title: 测试
layout: page-without-sidebar
---


<script src="https://web.sdk.qcloud.com/player/tcplayerlite/release/v2.4.1/TcPlayer-2.4.1.js" charset="utf-8"></script>

<div id="id_test_video" style="width:100%; height:auto;"></div>

<script>
var player = new TcPlayer('id_test_video', {
    "webrtc": "webrtc://live-flv.b11p.com:443/live/livestream",
    "autoplay" : true,      //iOS 下 safari 浏览器，以及大部分移动端浏览器是不开放视频自动播放这个能力的
    "width" :  '480',//视频的显示宽度，请尽量使用视频分辨率宽度
    "height" : '320'//视频的显示高度，请尽量使用视频分辨率高度
});
</script>