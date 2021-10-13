---
title: 解决 OpenWrt 无法在内网中开启 NAT-PMP 的问题
lang: zh-CN
TimeZone: Asia/Shanghai
date: 2021-10-13 21:39:13
updated: 2021-10-13 21:39:13
tags:
---

最近在路由器上刷了 OpenWrt，但是 OpenWrt 默认没有集成 UPnP 和 NAT-PMP 功能。我手动开启时遇到了一些问题，在此记录以帮助可能遇到同样问题的朋友。

## 开启 UPnP 和 NAT-PMP
首先说明一下我开启 UPnP 和 NAT-PMP 的步骤。

1. 执行以下命令安装对应的软件：
   ```sh
   opkg update
   opkg install miniupnpd luci-app-upnp
   ```
2. 编辑 `/etc/config/upnpd` 文件，修改下面几行
   ```
   	option enabled          1
   	option enable_natpmp    1
   	option enable_upnp      1
   ```
3. 执行下列命令
   ```sh
   /etc/init.d/miniupnpd enable
   /etc/init.d/miniupnpd start
   /etc/init.d/firewall restart
   ```

## 出现错误
然而，完成配置，打开软件后，在 Web 控制台却找不到映射记录。查看日志却发现了错误信息。

```
root@OpenWrt:/etc/init.d# logread | grep -i "\-pmp"
Wed Oct 13 08:49:37 2021 daemon.notice miniupnpd[1942]: Listening for NAT-PMP/PCP traffic on port 5351
Wed Oct 13 08:49:45 2021 daemon.notice miniupnpd[2717]: Listening for NAT-PMP/PCP traffic on port 5351
Wed Oct 13 08:58:23 2021 daemon.err miniupnpd[2717]: Failed to add NAT-PMP 58942 tcp->192.168.1.115:58942 'NAT-PMP 58942 tcp'
Wed Oct 13 08:58:23 2021 daemon.err miniupnpd[2717]: Failed to add NAT-PMP 58942 udp->192.168.1.115:58942 'NAT-PMP 58942 udp'
```

## 部分解决
经过查找，我发现了曾经有人针对此问题在 GitHub 上提了个 [Issue](https://github.com/coolsnowwolf/lede/issues/5020)，尽管他是针对某个二次开发的固件提的。在 Issue 中提到了两条可能的原因：1. [IPv6 的问题](https://github.com/coolsnowwolf/lede/issues/5020#issuecomment-656967117)；2. [WAN 口 IP 是内网 IP 的问题](https://github.com/coolsnowwolf/lede/issues/5020#issuecomment-657367240)。很不幸，两条我都中了。

我验证发现，我的问题与 IPv6 没有关系。于是尝试了第二种方法，在 `/etc/config/upnpd` 配置文件中添加这么几行：

```
	option use_stun '1'
	option stun_host 'stun.qq.com'
```

添加后，却继续遇到错误：

```
Wed Oct 13 12:37:15 2021 daemon.err miniupnpd[1942]: resolve_stun_host: getaddrinfo(stun.qq.com, 3478, ...) failed : Try again
Wed Oct 13 12:37:15 2021 daemon.err miniupnpd[1942]: STUN: Performing STUN failed: Host is unreachable
Wed Oct 13 12:37:15 2021 daemon.err miniupnpd[1942]: Performing STUN failed. EXITING
```

看起来是 STUN 过程中出现了什么错误。我尝试了很久，都无法使 STUN 成功。好在，开启了此选项后，NAT-PMP 正常工作了。同时[官方文档](https://openwrt.org/docs/guide-user/firewall/upnp/upnp_setup)也表明 UPnP 可能有安全风险，示例只开启了 NAT-PMP。我就先只启用 NAT-PMP，慢慢查找是哪里出了问题吧。