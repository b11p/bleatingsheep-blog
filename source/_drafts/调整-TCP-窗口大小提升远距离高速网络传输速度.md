---
title: 调整 TCP 窗口大小提升远距离高速网络传输速度
lang: zh-CN
TimeZone: America/Toronto
tags:
---
tl; dr: 内存足够的话，在 `/etc/sysctl.conf` 中添加以下内容

```
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
net.ipv4.tcp_rmem=8192 262144 1073741824
net.ipv4.tcp_wmem=4096 16384 1073741824
net.ipv4.tcp_adv_win_scale=-2
```

然后执行 `sudo sysctl -p`，并重启相关进程生效。

<!--more-->

## 前置优化介绍：BBR 控制算法

## BBR 效果测试：未能跑满带宽，但是丢包和延迟都未提高，且多线程可以提升速度

## iperf3 测试：发现瓶颈

## 优化窗口大小：Cloudflare 的测试

CF 测试

## 内存消耗测试
cf 那个参数未明显提高内存占用

解释那个参数的意义：设置数值不代表实际内存占用，只限制最大窗口大小

## 结论：
1G buffer 够用