---
title: 咩咩的直播间
date: 2022-02-21 22:29:13
layout: page-without-sidebar
---
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.css">
<script src="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

这里是咩咩的直播间，正在施工。预计 4 月正式开播！

<div id="dplayer"></div>

<script>
    const dp = new DPlayer({
        container: document.getElementById('dplayer'),
        live: true,
        screenshot: true,
        volume:1,
        video: {
            //url: '@ViewBag.Url',
            // quality: @Html.Raw(ViewBag.Quality),
            quality: [
                {
                    name: 'dual stack',
                    url: 'https://live.b11p.com/live/movie.m3u8',
                    type: 'hls',
                },
                {
                    name: 'v4',
                    url: 'https://live4.b11p.com/live/movie.m3u8',
                    type: 'hls',
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
                            'bufferTimeAtTopQualityLongForm': 240,
                            jumpGaps: false,
                            'fastSwitchEnabled': true       // enables buffer replacement when switching bitrates for faster switching
                        }
                    });
                    //sPlayer.setAutoPlay(false); // remove this line if you want the player to start automatically on load
                    sPlayer.attachView(video); // tell the player which videoElement it should use
                    sPlayer.attachSource(src); // provide the manifest source
                }
            }
        }
    });
</script>