---
title: PVE 非特权容器 (CT) 无法使用 Docker 的临时解决方案
lang: zh-CN
TimeZone: Asia/Shanghai
date: 2026-01-03 10:29:34
updated: 2026-01-03 10:29:34
tags:
---


我之前在自己的几台机器上装了 Proxmox VE (PVE)，并给日日开了个容器 (CT)，让他跑一些自己的东西。日日在容器中装了 Docker，之前一直跑得好好的。2024 年 11 月，日日告诉我，他的几个服务 down 了，并且 Docker 容器打不开。

<!--more-->

日日提供的错误信息如下：

```
Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: open sysctl net.ipv4.ip_unprivileged_port_start file: reopen fd 8: permission denied: unknown
```

经过检索，发现是 AppArmor profiles 的问题，可以通过 Workaround 缓解。

## Workaround: 绕过 AppArmor

首先在 PVE host 编辑容器配置：打开 `/etc/pve/lxc/<容器ID>.conf`，并添加以下内容：

```
lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
lxc.apparmor.profile: unconfined
```

完成后（可能需要重启 CT 容器来应用配置），在容器中执行以下命令：

```sh
mount --bind /dev/null /sys/module/apparmor/parameters/enabled
systemctl restart docker
```

注意，CT 容器重启后，需要重新执行此命令，应该可以通过编写 systemd unit，并将 docker 服务设置为“WantedBy”来自动挂载，但我未测试。

## 解决：更新 Proxmox VE

有报告称 Proxmox VE 9.1 已解决此问题，我当前使用的是 Proxmox VE 8，无法验证。

## 参考：

<https://forum.proxmox.com/threads/docker-inside-lxc-net-ipv4-ip_unprivileged_port_start-error.175437/>

<https://github.com/opencontainers/runc/issues/4968#issuecomment-3500775431>

<https://github.com/lxc/lxc/issues/4606>

<https://bugzilla.proxmox.com/show_bug.cgi?id=7006>