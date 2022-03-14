---
title: 用 Ubuntu Cloud Images 制作自己的云镜像（配置 cloud-init 的 NoCloud 数据源）
tags:
  - Ubuntu
  - 腾讯云
  - Linux
lang: zh-CN
TimeZone: Asia/Shanghai
date: 2022-03-14 12:32:46
updated: 2022-03-14 12:32:46
---

还是之前写过的，云厂商提供的系统镜像不好使的问题。之前写过{% post_link "使用iPXE和netboot-xyz重装VPS系统" "《使用 iPXE 和 netboot.xyz 重装 VPS 系统》" %}，但是，由于各种原因（如系统内存不足、国内网络不稳定等），其适用性受到了限制。这次改用了 Ubuntu Cloud Images，可以直接用 dd 命令覆盖系统盘，然后重装系统。

<!-- more -->

## 介绍 cloud-init 和 Ubuntu Cloud Images
[cloud-init](https://cloud-init.io/) 是一个初始化云镜像的工具，同时也是一个自动化的配置工具。

[Ubuntu Cloud Images](https://cloud-images.ubuntu.com/) 是由 Ubuntu 官方提供的用于在公有云上运行的系统镜像。它在首次启动时会运行 [cloud-init](https://cloud-init.io/) 初始化系统。

<!-- 此博客选用 Ubuntu Cloud Images 是因为：1. 博主最熟悉 Ubuntu 2. Ubuntu Cloud Images 与 cloud-init 集成较好。我也试过用 [Fedora Cloud](https://alt.fedoraproject.org/cloud/) 镜像，尽管该镜像好像有 cloud-init 相关的配置文件，但是 cloud-init 似乎没有被执行，我仍在调查。 -->

## 如何制作自己的云镜像
### 系统准备
要制作自己的云镜像，需要准备相应的环境。本文假设你使用最新的 Ubuntu 20.04 LTS 系统，已包含“kpartx”和“losetup”工具。

此外，你还需要“qemu-img”，可以通过 `sudo apt install qemu-utils` 安装需要的软件包。

为了将镜像传输到要安装的云服务器，你还需要配置 web 服务器。配置方法不再赘述。

要安装的机器需要可以启动救援模式，并且救援模式需要可以联网（至少需要可以连接到镜像所在机器）。

### 下载 Ubuntu Cloud Images
打开 <https://cloud-images.ubuntu.com/>，选择要安装的 Ubuntu 版本（如“focal”），点击“current”选择最新构建，然后根据架构选择要下载的文件。例如，最常见的 amd64 架构请下载“focal-server-cloudimg-amd64.img”。

### 转换为 raw 文件
下载到的镜像是 qcow2 格式的，需要转换为 raw 格式，才能被挂载、修改和使用。运行下面的命令转换为 raw 格式。

```
qemu-img convert -f qcow2 -O raw focal-server-cloudimg-amd64.img focal-server-cloudimg-amd64.raw
```

### 挂载 raw 文件
需要把 raw 文件映射为 loop 设备，然后挂载到系统上。

请参阅[《如何挂载.img格式的镜像》](https://www.jianshu.com/p/0c8a471622df)，完成挂载。

需要注意的是，文中的“.img格式的镜像”，是指我们转换出来的 raw 文件，而**不是**下载到的后缀为“.img”的 qcow2 文件。

*另外，Ubuntu Cloud Images 的系统分区是分区 1，其他系统可能略有不同。*

举例来说，如果 `sudo losetup -f` 查到的空闲 loop 设备为 /dev/loop9，那么就执行以下命令：

```sh
sudo losetup /dev/loop9 focal-server-cloudimg-amd64.raw
sudo kpartx -av /dev/loop9
sudo mount /dev/mapper/loop9p1 /mnt
```

*如果你想安装其他系统镜像，可以用 `sudo fdisk -l /dev/loop9` 查看分区信息。*

### 修改 cloud-init 配置
用 `cd /mnt/etc/cloud/cloud.cfg.d` 切换到 cloud.cfg.d 目录，`sudo nano 99-fake_cloud.cfg` 创建文件 99-fake_cloud.cfg，内容如下：

```yml
# CLOUD_IMG: This file was created/modified by the Cloud Image build process
system_info:
   package_mirrors:
     - arches: [i386, amd64]
       failsafe:
         primary: http://archive.ubuntu.com/ubuntu
         security: http://security.ubuntu.com/ubuntu
       search:
         primary:
           - http://azure.archive.ubuntu.com/ubuntu # 修改为你想使用的软件包源
         security: []
     - arches: [armhf, armel, default]
       failsafe:
         primary: http://ports.ubuntu.com/ubuntu-ports
         security: http://ports.ubuntu.com/ubuntu-ports

# configure cloud-init for NoCloud
hostname: myhost # 修改为你的主机名

users:
  - name: foobar # 修改为你的用户名
    gecos: Foo B. Bar # 修改为你的全名
    groups: [adm, audio, cdrom, dialout, dip, floppy, lxd, netdev, plugdev, sudo, video]
    ssh_authorized_keys:
      - '<paste your public key here>' # 修改为你的 SSH 公钥
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    shell: /bin/bash

chpasswd:
  expire: true
  list:
    - foobar:foobar # 修改为你的用户名和密码
datasource_list: [ NoCloud, None ]
```

修改完成后保存，用以下命令取消挂载：

```sh
sudo umount /mnt
sudo kpartx -dv /dev/loop9
sudo losetup -d /dev/loop9
```

其中把“/mnt”修改为你的实际挂载目录，把“/dev/loop9”修改为你的实际 loop 设备。

### 安装 Ubuntu
首先假定你已经把修改过的系统镜像放到 web 服务器上，镜像 url 为“http\://web/image.raw”。在要安装的机器上进入救援模式，找到系统启动盘（如 /dev/sda，也可能为 /dev/vda、/dev/nvme0n1 等），然后执行以下命令：

```sh
wget http://web/image.raw | sudo dd of=/dev/sda
```

请注意硬盘需要有足够空间。Ubuntu Cloud Images 所需空间大约是 2.2G。完成后重启机器，等待初始化完成即可。

示例配置默认禁用密码登录，需要使用 ssh 密钥。首次登录会要求修改密码。

完成后，你就可以享受未经云厂商加料的原汁原味的系统了。

### 定制镜像
如果你想定制镜像（如安装某些软件、配置网络等），可以参考 cloud-init 的[文档](https://cloudinit.readthedocs.io/en/latest/)，包括[配置示例](https://cloudinit.readthedocs.io/en/latest/topics/examples.html)、[模块](https://cloudinit.readthedocs.io/en/latest/topics/modules.html)等，修改配置文件。这样，系统初始化时会进行对应配置，减少重复配置环境的工作量。
