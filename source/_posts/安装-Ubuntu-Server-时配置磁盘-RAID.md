---
title: 安装 Ubuntu Server 时配置磁盘 RAID
tags:
  - Linux
  - Ubuntu
lang: zh-CN
TimeZone: Asia/Shanghai
date: 2021-10-02 21:00:12
updated: 2021-10-02 21:00:12
---

有很多 IDC 提供的 VPS 分系统盘和数据盘。这种方式可以使重装系统时不影响一部分数据。但是，这么做也会造成可利用的空间减少。如果你不需要经常在保留数据的前提下重装系统，可以采用 RAID 方式将硬盘空间组合起来，还能提高速度。

需要注意的是，操作时要在系统盘和数据盘上创建 RAID，然后安装 Ubuntu Server。此操作会毁掉所有已有数据。如有重要数据，请提前备份。

## 引导安装映像并进入存储配置
首先需要引导 Ubuntu Server 20.04 的安装映像。如果你的 VPS 不支持挂载此 ISO，请参见{% post_link 使用iPXE和netboot-xyz重装VPS系统 "《使用 iPXE 和 netboot.xyz 重装 VPS 系统》" %}。

前几步就略过了，在存储配置的页面，请选择自定义。

{% asset_img st-0.png %}

然后进入到此界面。

{% asset_img st-1.png %}

## 清除已有分区
可以看到，此 VPS 上有两块虚拟硬盘，大小均为 20GB，其中“/dev/vda”已经设置了几个分区，而“/dev/vdb”还未使用。

选中“/dev/vda”并按回车，然后进入“Reformat”选项。此时会提示你，此操作会清除所有数据，确认即可。如果你的数据盘也有数据，也按此方式清除掉所有分区。

清除完成后，你会看到此界面。

{% asset_img st-2.png %}

## 在硬盘上创建分区
此时不要急着创建 RAID。再次选中“/dev/vda”，选择“Use As Boot Device”并确认。此操作是为了在系统盘上创建引导分区。

创建完成后，剩余空间是没法直接使用的，需要创建分区。选择可用空间，然后进入“Add GPT Partition”创建分区，空间留空（默认使用全部剩余空间），“Format”选择“Leave unformatted”。

然后，在数据盘上也创建一个分区，空间留空，“Format”同样选择“Leave unformatted”。

{% asset_img st-3.png %}

## 创建 RAID 并分区
在两个硬盘上创建好分区以后，回到分区界面，选择“Create software RAID (md)”，然后在弹出的界面中选中刚才在两块硬盘上创建的分区，类型选择 RAID 0，名称默认是“md0”，并确认。

此时你会在“AVAILABLE DEVICES”中看到刚才创建的 RAID 磁盘。选中并进入“Add GPT Partition”创建分区，“Format”选择“ext4”，“Mount”设置为“/”，即根目录。

{% asset_img st-4.png %}

完成后，可以看到如下界面。

{% asset_img st-5.png %}

选择“Done”，按回车就完成啦！此后系统会安装在由两块硬盘组成的 RAID 磁盘上。

## 总结
Linux 中的 RAID 磁盘可以创建在硬盘或者分区上。当硬盘上已有分区，但未占用全部空间时，必须先用剩余空间创建分区，然后使用该分区组成 RAID，而不能直接使用该分区的一部分。

Linux 的软 RAID 和 LVM 可以套娃，也就是说拿 RAID 或者 LVM 创建出来的磁盘（或者在上面创建的分区）继续创建 RAID 或者 LVM。

对于本文中的“/dev/vdb”，不分区直接用整块硬盘和“/dev/vda”中的分区组成 RAID 也是可行的。考虑到避免扩展硬盘大小时可能出现的错误，本文选择在该硬盘上也创建分区。

Linux 并不强制要求给硬盘（无论是否是 RAID 创建的磁盘）分区。直接把 RAID 出来的磁盘格式化成“ext4”并挂载也是可行的。也是为了避免扩展时出问题，本文在 RAID 磁盘上也创建了分区。

一般来讲，RAID0 比较危险，因为任何一块硬盘挂掉都会导致所有数据丢失。但是，由于我们用的是 IDC 的虚拟硬盘，安全性比直接用物理硬盘高，所以，因为 RAID0 而丢失数据的概率会小一些。当然，按时备份是非常重要的。
