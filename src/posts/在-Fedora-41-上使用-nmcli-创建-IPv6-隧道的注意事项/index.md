---
title: 在 Fedora 41+ 上使用 nmcli 创建 IPv6 隧道的注意事项
permalink: /2026/01/31/在-Fedora-41-上使用-nmcli-创建-IPv6-隧道的注意事项/
createTime: '2026-01-31 09:06:54'
lang: zh-CN
---



我之前一直使用 [Hurricane Electric](https://tunnelbroker.net/) 的 IPv6 隧道服务为我的 VPS 添加 IPv6 支持。[Fedora Wiki](https://fedoraproject.org/wiki/IPv6_tunnel_via_Hurricane_Electric) 有具体命令。但是，自从 Fedora 41（也许是 40，记不清具体时间了）升级以来，此方法失效了，创建的隧道一直无法启用。

<!--more-->

经过研究，发现是自从 Fedora 41 以来，需要把隧道的 ipv6.addr-gen-mode 设置为 stable-privacy。参考命令如下：

```sh
sudo nmcli connection add type ip-tunnel con-name sit1 ifname sit1 mode sit   remote ${REMOTE} -- ipv4.method disabled ipv6.method manual   ipv6.address ${ADDR} ipv6.gateway ${GATEWAY}   ipv6.addr-gen-mode stable-privacy   ip-tunnel.ttl 64
```

这样设置后，就可以正常地通过此隧道访问 IPv6 网络。