---
title: Fedora 系统部署 LXD
lang: zh-CN
TimeZone: America/Toronto
date: 2023-04-23 04:35:23
updated: 2023-04-23 04:35:23
tags:
---

近来一直想着买台迷你主机，把家里的树莓派换掉，毕竟树莓派性能太低了，连测速都跑不满。要换的话，我可能会选准系统的迷你主机，然后开启一些虚拟机，这样能满足我折腾的需求。我看到比较合适的是 [PVE](https://www.proxmox.com/en/proxmox-ve)，但我暂时没有可以安装的机器。另一个看起来比较有趣的技术是 [LXD](https://linuxcontainers.org/lxd/introduction/)，看起来可以更充分地利用资源。虽然不知道什么时候能回国（毕竟装系统什么的都很麻烦，恐怕没法远程进行），但是就是想现在看看怎么折腾，就开了一台 Fedora 37 的云服务器，安装了一下试试。

<!-- more -->

除此之外，最近由于要在实验室的服务器上跑一些东西，就让人给我开了个用户。我发现，原来这个服务器是所有人一起跑在一台机器上，各自都没有 root 权限。这对我使用造成了不便，因为我是用 Tailscale 把我各台机器连接起来的，没有 root 权限就没法安装 Tailscale，把运行结果储存到另一台服务器上就很困难。如果是用的虚拟机，那我就可以安装 Tailscale。但是，虚拟机比较耗资源，那台机器内存不是很大，同时每台虚拟机需要一直占用它峰值所需的内存，利用率低。我想到了 LXD 这样的系统容器技术。不过，我并不是那台服务器的管理员，所以只能所以玩儿玩儿。

我也是头一次实践这个 LXD，如果有什么写得不对的地方，恳请各位斧正。

## 什么是 LXD
LXD 是一个系统容器管理器，关于它的详细介绍可以在 [What is LXD?](https://linuxcontainers.org/lxd/introduction/) 中查看。

## 安装
如果你用的是 Ubuntu，安装过程可以参考 <https://linuxcontainers.org/lxd/getting-started-cli/>。尽管该页面也有 Fedora 的安装步骤，但是并不完整。关于 Fedora 完整的安装步骤请前往 [Installation Guide](https://github.com/ganto/copr-lxc4/wiki) 查看。

本文就以 Fedora 37 为例。要安装 LXD，请执行下面的命令：

```sh
sudo dnf copr enable ganto/lxc4
sudo dnf install lxd
```

当询问是否继续时，输入 `y`，回车继续。

安装完成后，需要添加必要的信息并启动服务，执行以下命令：

```sh
sudo usermod -a -G lxd ${USER}
echo "root:1000000:65536" | sudo tee -a /etc/subuid > /dev/null
echo "root:1000000:65536" | sudo tee -a /etc/subgid > /dev/null

sudo systemctl enable lxd && sudo systemctl start lxd
source /etc/profile
```

执行完毕后，可能需要退出登陆并重新登录。

### 初始化
接下来我们初始化配置。执行以下命令：

```sh
lxd init
```

接下来会交互式地询问你一些问题，大部分问题回车使用默认选项即可，少部分可根据需要自行配置。在此过程中，我修改了存储池的大小、开启 API 端口，并要求在初始化完成后打印配置。

```
[fedora@vultr ~]$ lxd init
Would you like to use LXD clustering? (yes/no) [default=no]: 
Do you want to configure a new storage pool? (yes/no) [default=yes]: 
Name of the new storage pool [default=default]: 
Name of the storage backend to use (btrfs, dir, lvm) [default=btrfs]:    
Create a new BTRFS pool? (yes/no) [default=yes]: 
Would you like to use an existing empty block device (e.g. a disk or partition)? (yes/no) [default=no]: 
Size in GiB of the new loop device (1GiB minimum) [default=11GiB]: 25GiB
Would you like to connect to a MAAS server? (yes/no) [default=no]: 
Would you like to create a new local network bridge? (yes/no) [default=yes]: 
What should the new bridge be called? [default=lxdbr0]: 
What IPv4 address should be used? (CIDR subnet notation, “auto” or “none”) [default=auto]: 
What IPv6 address should be used? (CIDR subnet notation, “auto” or “none”) [default=auto]: 
Would you like the LXD server to be available over the network? (yes/no) [default=no]: yes
Address to bind LXD to (not including port) [default=all]: 
Port to bind LXD to [default=8443]: 
Would you like stale cached images to be updated automatically? (yes/no) [default=yes]: 
Would you like a YAML "lxd init" preseed to be printed? (yes/no) [default=no]: yes
```

初始化只是自动帮你创建一些配置、存储、网络等，这个过程完全可以手动完成。熟悉本文提到的内容后，你可以自行查阅文档，在需要的时候手动更改相关配置。

<!-- **注意：**`lxc` 命令中每个用户都有独立的配置、存储、实例等，只要该用户在 `lxd` 用户组中，即可使用，无需 root 权限。

x: 不确定，似乎只能单用户？
 -->

## 创建容器
可以使用以下命令创建一个容器实例：

```sh
lxc launch ubuntu:22.04 ubuntu-2204
```

然后使用以下命令查看所有实例：

```sh
lxc list
```

你会看到如下输出：

```
+-------------+---------+------+-----------------------------------------------+-----------+-----------+
|    NAME     |  STATE  | IPV4 |                     IPV6                      |   TYPE    | SNAPSHOTS |
+-------------+---------+------+-----------------------------------------------+-----------+-----------+
| ubuntu-2204 | RUNNING |      | fd42:d4d2:bdbd:b0f9:216:3eff:fe1b:9410 (eth0) | CONTAINER | 0         |
+-------------+---------+------+-----------------------------------------------+-----------+-----------+
```

## 修复防火墙问题
如果你的容器分到了 IPv4 和 IPv6 地址，恭喜，你可能没有遇到防火墙的问题。如果你在上一步发现没有分配到 IPv4 地址，那么可能是防火墙阻拦了 DHCP 请求。Fedora 默认用的是 firewalld，用下面的命令信任该网络：

```sh
sudo firewall-cmd --zone=trusted --change-interface=lxdbr0
sudo firewall-cmd --zone=trusted --change-interface=lxdbr0 --permanent
```

完成后重启容器：

```sh
lxc restart ubuntu-2204
```

之后再执行 `lxc list`，可以看到容器已经分配到 IPv4 地址。

## 体验
使用下面的命令进入容器中的 shell：

```sh
lxc exec ubuntu-2204 bash
```

在其中安装 Docker 进行测试，安装一切正常，安装后也可以正常运行。

```sh
# 在容器中执行
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

安装 Tailscale，创建虚拟网络也一切正常，可以与其他机器互联互通，没有发现任何问题。

## 限制容器的可用资源
### 内存和 CPU
可以使用以下命令限制容器的可用内存和 CPU：

```sh
lxc config set ubuntu-2204 limits.memory 1024MiB
lxc config set ubuntu-2204 limits.cpu.allowance 50%
```

此命令会把容器限制在 1G 内存和 50% CPU。

### 硬盘
限制硬盘空间需要用以下命令：

```sh
lxc config device add ubuntu-2204 root disk pool=default path=/
lxc config device set ubuntu-2204 root size 4GiB
```

下面测试硬盘限制是否生效：

```
root@ubuntu-2204:/# dd if=/dev/urandom of=swapfile bs=2M count=3k
dd: error writing 'swapfile': Disk quota exceeded
1118+0 records in
1117+0 records out
2343370752 bytes (2.3 GB, 2.2 GiB) copied, 5.92697 s, 395 MB/s
root@ubuntu-2204:/# df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop0       25G  4.2G   21G  17% /
```

可以看到，我们把磁盘限制到 4GB 后，写入大于 4GB 的文件时就会出错。用 `df` 命令会看到已用空间为 4.2G。

LXD 的磁盘大小是基于文件系统的配额功能实现的。在这里我们用的是 Btrfs，而 Btrfs 不提供用户空间获取配额大小的功能，所以看到的依然是整个存储池的大小。不过，限制是确实实施了的。如果要想让容器内也可以看到限制后的磁盘大小，可以用 ZFS 等。

_提示：_`lxc config device add` 按说应该是向容器添加设备的命令。在添加前，我们创建容器时指定的“default”profile 应该已经包含了 `root` 设备，可以用 `lxc profile show default` 查看。我不清楚这条命令会不会覆盖设备，导致什么问题。但是，如果直接使用 `lxc config device set` 命令设置大小，会提示“Error: Device from profile(s) cannot be modified for individual instance. Override device or modify profile instead”。我简单测试过，用“default”profile 创建容器，向其中写入一些文件，再使用 `add` 命令添加设备后，写入的文件还在。所以，我不确定这两个命令究竟会不会出问题。一种规避的方法可能是，使用 `lxc init` 命令创建容器但不启动，用上面的命令设置好磁盘限额再启动。也许，我需要使用上面的命令添加一个来自不同存储池的 `root` 设备，观察发生什么。

## cloud-init
LXD 支持 cloud-init，其中“ubuntu”和“ubuntu-daily”映像服务器中的映像都支持，[images](https://images.linuxcontainers.org/) 源中带有“cloud”标记的也支持 cloud-init。这样我们就可以在创建映像时指定一些初始配置。

*提示：*回忆我们创建容器的命令 `lxc launch ubuntu:22.04 ubuntu-2204`，其中 `ubuntu:22.04` 就是映像，前面的 `ubuntu` 就表示该映像来自“ubuntu”映像服务器。若要通过“images”源中的 Fedora 云映像创建实例，可以执行 `lxc launch images:fedora/38/cloud fedora-38`。

接下来，我们复制默认的 profile，然后编辑：

```sh
lxc profile copy default cloud-init
export EDITOR=nano
lxc profile edit cloud-init
```

在打开的文件中将 `config: {}` 修改成：

```yaml
config: 
  cloud-init.user-data: |
    #cloud-config
    package_update: true
    package_upgrade: true
    packages:
      - neofetch
```

然后运行：

```sh
lxc launch images:fedora/38/cloud fedora-cloud -p cloud-init
```

然后执行 `lxc exec fedora-cloud bash` 进入容器 shell，执行：

```sh
# 容器内执行
cloud-init status --wait
```

一切正常的话，我们可以看到如下输出：

```
.....................................
status: done
```

接着运行 `neofetch`，可以看到指定的包已经安装好了。

## 端口映射
### 使用 device 进行映射
```sh
lxc config device add ubuntu-2204 ssh proxy listen="tcp:[::]:8022" connect="tcp:[::1]:22"
```

为了验证端口映射是否成功，可以执行 `ssh -p 8022 root@localhost` 尝试连接，出现指纹提示则说明成功。由于未配置相关密钥，ssh 无法登录，但端口确实是映射上了的。

需要注意的是，使用此方法映射后会丢失源地址信息。若要保留，可以在命令末尾添加 `nat=true` 以启用 NAT 模式，但需要满足以下条件：

1. 源地址不能是通配符地址，也就是不能使用 `[::]`。
2. 目的地址必须是容器的某个静态地址，也就是不能使用回环地址 `[::1]`。

### 使用 `network forward` 命令进行映射
另一种端口映射的方式是使用 `netowrk forward` 命令。

运行 `lxc network forward create` 和 `lxc network forward port add` 查看帮助。

要把宿主机的 [2001:19f0:1000:2562:5400:4ff:fe68:addf]:8022 端口映射到容器“ubuntu-2204”的 22 端口，执行：

```sh
lxc network forward create lxdbr0 "`2001:19f0:1000:2562:5400:4ff:fe68:addf`" # 创建网络转发
lxc network forward port add lxdbr0 "2001:19f0:1000:2562:5400:4ff:fe68:addf" tcp 8022 "fd42:d4d2:bdbd:b0f9:216:3eff:fed9:7958" 22 # 添加端口转发
```

其中 `2001:19f0:1000:2562:5400:4ff:fe68:addf` 为本机的 IP 地址，`fd42:d4d2:bdbd:b0f9:216:3eff:fed9:7958` 为容器 IP 地址。

虽然本命令并不要求容器必须有静态 IP，但文档中并未保证容器的 IP 不会变化，因此依然建议给容器配置静态 IP 并将端口转发到静态 IP 上。

此命令只能将主机上某个 IP 上的端口转发到容器中，像“[::]”这样的地址将无法转发（尽管可以添加相关规则，但无效）。

### 端口映射总结
LXD 的端口映射没有 Docker 等技术来得方便，要么会丢失源地址，要么无法同时映射主机的所有地址。在实际使用中，请根据自己的需求，合理选择端口映射的方式。

## 图解

{% asset_img overview.svg %}

上图展示了前文中创建的存储、网络、profile 和容器实例，分别使用命令 `lxc storage show default`、`lxc network show lxdbr0`、`lxc profile show default` 和 `lxc config show ubuntu-2204` 获取到相关信息。箭头表示使用关系，实线箭头表示直接使用，虚线箭头表示间接使用。可以看到，默认 profile 使用了我们使用向导创建的存储和网络（即“default”和“lxdbr0”），容器实例使用了默认 profile，因此也间接使用了相关的存储和网络。所以它们各自的“used_by”字段既包含了 profile，也包含了实例。另外值得注意的是，相关映像也使用了存储。这样做的好处是，创建容器实例时，可以直接利用 Btrfs、ZFS、LVM 等文件系统的写时复制特性，加快容器创建的速度，并节约磁盘空间。

我把本图放在最后，是希望本图可以成功串起本文中提到的概念，起总结作用，而非放在开头，让读者难以理解具体每一部分是如何起作用的。

最后，再次强调，我接触 LXD 到现在为止也只有一天半的时间，本文只是记录一下我自己踩的坑，同时填补没有中文的相对全面的上手资料的空白。文中难免有所疏漏，恳请各位读者斧正。

## 参考资料
### LXD 介绍
[What is LXD?](https://linuxcontainers.org/lxd/introduction/)

[Linux 容器和虚拟化——第一部分，LXD入门](https://www.bilibili.com/video/av685457764)

[Image server for LXC and LXD](https://images.linuxcontainers.org/)

### Fedora 系统安装 LXD
[Installation Guide](https://github.com/ganto/copr-lxc4/wiki)

[Getting Started with LXD on Fedora](https://github.com/ganto/copr-lxc4/wiki/Getting-Started-with-LXD-on-Fedora)

### 限制实例可用资源
[Resource limits](https://linuxcontainers.org/lxd/docs/master/reference/instance_options/#resource-limits)

[Example for set storage limit](https://discuss.linuxcontainers.org/t/example-for-set-storage-limit/11510)

### 配置 LXD 实例
[Instance options](https://linuxcontainers.org/lxd/docs/master/howto/instances_configure/)

[How to use `cloud-init`](https://linuxcontainers.org/lxd/docs/latest/cloud-init/)

[How to use profiles](https://linuxcontainers.org/lxd/docs/master/profiles/)

### LXD 网络
[How to configure network forwards](https://linuxcontainers.org/lxd/docs/latest/howto/network_forwards/)

[Forward port 80 and 443 from WAN to container](https://discuss.linuxcontainers.org/t/forward-port-80-and-443-from-wan-to-container/2042)
