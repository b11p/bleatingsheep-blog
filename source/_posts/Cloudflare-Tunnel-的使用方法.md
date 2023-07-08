---
title: Cloudflare Tunnel 的使用方法
lang: zh-CN
TimeZone: America/Toronto
date: 2023-07-01 03:37:10
updated: 2023-07-01 03:37:10
tags:
---

[日日](https://github.com/he0119)说不会用 CF Tunnel，就写一篇简单说明一下用法。

<!-- more -->

## Cloudflare Tunnel 是什么、可以用来干什么
当用户访问 CDN 需要回源时，CDN 节点会去访问服务器。尽管可以通过配置让服务器只接受 CDN IP 访问，但配置可能较为繁琐且容易出错，导致服务器仍然受到各种威胁。

[Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) 可以让服务器主动访问 Cloudflare (CF) 的 CDN 节点。这样服务器完全不需要接受任何外来连接，增强安全性。此外，Cloudflare Tunnel 也可以让服务器处于 NAT 后面，无需公网 IP 也可以提供 Web 等服务。

## 如何使用 Cloudflare Tunnel

### 前提条件
要使用 Cloudflare Tunnel，相应域名必须在 CF 解析，且服务器必须能够访问最近的 CF 节点。

本文以 Docker 为例讲解 CF Tunnel 的使用方法，但 Docker 不是必须的。

### 启动服务
本文以在 `backend` 网络中启动 [RSSHub](https://docs.rsshub.app/) 容器为例，使用的命令如下：

```sh
docker pull diygod/rsshub
docker run -d --name rsshub --restart=always \
--net backend --net-alias rsshub \
diygod/rsshub
```

这里设置 RSSHub 连接到 Docker 的 `backend` 网络（需要自行创建），设置容器的网络别名为 `rsshub`，以便访问。注意 RSSHub 默认监听 1200 端口，这里无需对外开放此端口。

### 创建并运行 Tunnel

{% asset_img 1-cf-panel-1.5x.png %}

登录 CF，在 dash 左侧找到“Zero Trust”并进入。

{% asset_img 2-zero-trust-1.5x.png %}

进入后在左侧点击“Access、Tunnels”，然后再点“Create a tunnel”。

{% asset_img 3-create-tunnel-1.5x.png %}

给 Tunnel 设置一个名字，然后继续，进入到上图的界面，选择相应的运行环境（这里选择 Docker），然后执行下面的代码。

注意，可以根据自己的需要，在命令中加入 `-d --net backend --restart always` 等参数。

{% asset_img 4-connectors-1.5x.png %}

运行后，如果一切正常，可以在网页上看到已经连接的 Connector。继续前往下一个页面。

{% asset_img 5-route-1.5x.png %}

在这个页面中，选择要使用的域名和子域，“Service”设置为 http://rsshub:1200。

之后点击保存，访问相应域名即可。

<script src="/scripts/image-scale.js"></script>