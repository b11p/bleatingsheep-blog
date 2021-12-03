---
title: 关于树莓派上 Ubuntu Server 20.04 安装 HWE 的问题
tags:
  - Ubuntu
  - Raspberry Pi
lang: zh-CN
TimeZone: Asia/Shanghai
date: 2021-12-04 03:12:30
updated: 2021-12-04 03:12:30
---

**结论：**目前无法给树莓派上的 Ubuntu Server 20.04 系统安装 Hardware Enablement (HWE)。

<!--more-->

## 什么是 Hardware Enablement (HWE)
Hardware Enablement (HWE) 帮助在 Ubuntu LTS 上安装更新的内核。下面两个链接介绍了 HWE。

> [What is hardware enablement (HWE)?](https://askubuntu.com/a/248936)
>
> [LTS Enablement Stacks](https://wiki.ubuntu.com/Kernel/LTSEnablementStack)

## 症状
我按照上面第二个链接的说法，执行 `sudo apt install --install-recommends linux-generic-hwe-20.04`，却以错误告终。

```
dpkg: error processing package linux-image-5.11.0-41-generic (--configure):
 installed linux-image-5.11.0-41-generic package post-installation script subprocess returned error exit status 1
Errors were encountered while processing:
 linux-image-5.11.0-41-generic
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

## 讨论
我在网上搜索，发现有人讨论过这个问题。要在树莓派上的 Ubuntu 20.04 系统安装 HWE 需要一点手段。然而，这个手段现在会导致无法启动，只能作罢。

[How to install the HWE kernel on Ubuntu Server 20.04 on a Raspberry Pi](https://askubuntu.com/questions/1320381/how-to-install-the-hwe-kernel-on-ubuntu-server-20-04-on-a-raspberry-pi)

## 总结：如何检查是否可以在树莓派上安装 HWE
执行以下命令来检查：

```sh
apt list linux-raspi-hwe-*
```

你会看到如下输出：

```
linux-raspi-hwe-18.04-edge/focal-updates,focal-security 5.4.0.1047.82 arm64
linux-raspi-hwe-18.04/focal-updates,focal-security 5.4.0.1047.82 arm64
```

可以看到，目前只有 18.04 可以安装 HWE，版本为 5.4，和 Ubuntu 20.04 的内核版本一致。根据此处的输出，20.04 目前不能安装 HWE。

## 清理
直接放结论好了，执行以下命令清理安装失败的残留。

```sh
sudo apt remove linux-*generic-hwe-20.04 linux-*-5.11.0-41*
```

其中 `5.11.0-41` 是安装失败的内核版本，需要根据安装日志替换成实际尝试安装的版本。