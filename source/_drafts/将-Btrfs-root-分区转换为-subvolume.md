---
title: 将 Btrfs root 分区转换为 subvolume
lang: zh-CN
TimeZone: Asia/Shanghai
tags:
  - Btrfs
  - Linux
  - Ubuntu
---
(Shift)
cd /
btrfs subvolume create @home
cp -a --reflink home/. @home/.

rm -r home/*

vi etc/fstab

yy p

btrfs subvolume snapshot . @

-- Snapshot 1 --

(Shift)
rootflags=subvol=@

(After boot)

cat /proc/mounts

sudo update-grub
sudo grub-install --no-nvram /dev/sda

(if you want to delete old root files)
sudo mount /dev/sda2 /mnt

cd /mnt
ls
sudo rm -r ...
ll
cd /
sudo umount /mnt
