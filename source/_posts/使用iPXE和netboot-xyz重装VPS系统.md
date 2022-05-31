---
title: 使用 iPXE 和 netboot.xyz 重装 VPS 系统
lang: zh-CN
TimeZone: Asia/Shanghai
date: 2021-09-24 22:51:18
updated: 2021-09-24 23:04:00
tags: ['Linux']
---

如果你购买一些小厂商的 VPS，你可能会觉得这些厂商自带系统不好用。哪怕是国内大厂，也经常有瞎 JB 改系统，影响功能的情况。有些厂商允许你挂载 ISO 自己安装系统，而有些厂商则不行。下面我将介绍使用 [iPXE](https://ipxe.org/) 和 [netboot.xyz](https://netboot.xyz/) 引导 Linux 安装程序（本文以 Ubuntu Server 为例），自行安装系统。

## 前提条件
要使用此方法重装系统，VPS 需要满足以下几个条件：

- 不能是 OpenVZ 等虚拟化技术
- 有 VNC
- 使用 GRUB2 引导系统
- 包管理有 iPXE（如果没有，则需要手动安装）

如果 VPS 使用的是 OpenVZ 技术，或者不提供 VNC 功能，则无法进行安装；不满足其他两项的，理论上也可以实现，但不在本文讨论范围之内。

此外，由于各种 VPS 小厂商千奇百怪，不保证你安装过程中不会遇到奇奇怪怪的问题。安装前请备份数据。

## 重装步骤
### 1. 修改 grub 配置文件，延长默认等待时间
默认情况下引导菜单可能太快消失，或者根本不出现。这一步的目的是使稍后选择 iPXE 引导选项更容易。

编辑 grub 配置文件 `/etc/default/grub`。

```sh
sudo nano /etc/default/grub
```

修改前的配置文件：

```
GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=hidden
GRUB_TIMEOUT=0
GRUB_DISTRIBUTOR=`lsb_release -i -s 2> /dev/null || echo Debian`
GRUB_CMDLINE_LINUX_DEFAULT="maybe-ubiquity"
GRUB_CMDLINE_LINUX=""
```

修改后的配置文件：

```
GRUB_DEFAULT=0
#GRUB_TIMEOUT_STYLE=hidden
GRUB_TIMEOUT=300
GRUB_DISTRIBUTOR=`lsb_release -i -s 2> /dev/null || echo Debian`
#GRUB_CMDLINE_LINUX_DEFAULT="maybe-ubiquity"
GRUB_CMDLINE_LINUX=""
```

这一步的要点是，让引导菜单显示足够长的时间以便选择引导选项。

修改完成后，运行更新命令：

```sh
sudo update-grub
```

### 2. 记录机器 IP 地址（如有必要）
如果你的 VPS 是用 DHCP 获取地址的，那就不需要进行这一步操作；否则需要记录下接口名、IP 地址、掩码、网关等信息。

运行命令:

```
> ifconfig
ens3: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 104.*.*.*  netmask 255.255.255.0  broadcast 104.*.*.255
        inet6 fe80::*  prefixlen 64  scopeid 0x20<link>
        ether 00:*  txqueuelen 1000  (Ethernet)
        RX packets 9779  bytes 707184 (707.1 KB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 109  bytes 14479 (14.4 KB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

此处接口名是 `ens3`，IP 地址是 `104.*.*.*`，掩码是 `255.255.255.0`。

网关：

```
> ip route
default via 104.*.*.1 dev ens3 proto static
104.*.*.0/24 dev ens3 proto kernel scope link src 104.*.*.*
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1
```

这里显示网关是 `104.*.*.1`。

### 3. 安装 iPXE 并重启
Ubuntu 或 Debian 可以用以下命令安装 iPXE：

```sh
sudo apt install ipxe
sudo reboot
```

如果你用的是 CentOS，可以参考[《CentOS7配置GRUB2+iPXE进行网络重装》](https://lala.im/4524.html)。

完成之后重启并进入 VNC。你将看到以下画面：

{% asset_img 1.png %}

选择“Network boot (iPXE)”选项，进入 iPXE。

### 4. 在 iPXE 中引导 netboot.xyz
#### 进入 iPXE 命令行
进入 iPXE 时，你将看到以下画面：

{% asset_img 2.png %}

当你看到“Press Ctrl-B for the iPXE command line...”时，请立即按下 Ctrl + B 快捷键，进入 iPXE 命令行。**此消息转瞬即逝，可以在进入之前就保持狂按，以免错过。**

#### 配置网络
接下来，我们需要配置网络。根据 VPS 是否有 DHCP，配置方式有所不同。

- 有 DHCP 时，只需执行一条命令
  ```
  dhcp
  ```
- 无 DHCP 时，需要执行下列命令，并把其中的“\<ip>、\<netmask>、\<gateway>、\<nameserver>”换成之前记下的 IP 地址、掩码、网关及 `1.1.1.1` 或其他可用的 DNS 服务器
  ```
  set net0/ip <ip>
  set net0/netmask <netmask>
  set net0/gateway <gateway>
  set dns <nameserver>
  ifopen net0
  ```

#### 引导 netboot.xyz
配置好网络后，就可以用以下命令引导进入 netboot.xyz 了：

```
chain --autofree https://boot.netboot.xyz
```

{% asset_img s-3.png %}

#### 无 DHCP 时的额外步骤
如果你的 VPS 没有 DHCP，那么 netboot.xyz 还会再问你一遍网络信息。此处默认已填好，直接回车即可。

{% asset_img s-4.png %}

### 5. 引导 Linux 安装程度
进入 netboot.xyz 后，你将看到以下画面：

{% asset_img 3.png %}

选择“Linux Network Installs (64-bit)”，进入以下界面，我们选择“Ubuntu”：

{% asset_img 4.png %}

之后我们选择 Ubuntu 20.04，一般选“Subiquity”即可，因为这个引导的是 Ubuntu Server 的镜像，而“Legacy”引导的安装程序不是专门供服务器用的。

{% asset_img 5.png %}

当然，你也可以在此选择你想用的其他系统。

#### 无 DHCP 时的额外步骤
如果你的 VPS 没有 DHCP，你将看到以下画面。

{% asset_img s-5.png %}

不过，不必担心，稍后将提示你配置网络。出现提示时，请按提示填写网络信息，**注意请手动输入 `static`，而不要回车使用默认的“dhcp”**：

{% asset_img s-8.png %}

需要注意的是，**当你填写 url 时，请勿直接回车默认**，因为默认映像是原始版本，已被删除。**请前往[发布页面](https://releases.ubuntu.com/20.04/)查找最新的映像地址。**当然，你也可以自己托管安装镜像，或者使用其他的镜像源。

### 6. 进入安装程序
以上操作完成后，你将看到镜像下载进度，下载好之后将会自动引导安装镜像。

{% asset_img s-9.png %}

{% asset_img 6.png %}

当你看到此界面时，就成功引导了安装程序。下面就按照提示一步步安装吧！

> 1. [ubuntu16.10 设置grub菜单的默认等待时间，开机时显示详细的引导信息](https://www.cnblogs.com/re1n/p/6009946.html)
> 2. [CentOS7配置GRUB2+iPXE进行网络重装](https://lala.im/4524.html)
> 3. [Boot using iPXE](https://netboot.xyz/docs/booting/ipxe/)