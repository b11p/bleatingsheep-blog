---
title: 使用 DisplayCAL 和 Spyder 红蓝蜘蛛校色仪进行屏幕校色的注意事项
lang: zh-CN
TimeZone: Asia/Shanghai
date: 2023-02-11 02:11:12
updated: 2023-02-11 02:11:12
tags:
---

最近[药药](https://github.com/AkiraXie)买了蓝蜘蛛 Spyder X，我告诉他不要用配套软件，直接用 DisplayCAL。DisplayCAL 已经三年多没有更新了，软件不更新也会变质，有些东西直接按当年的步骤，就会出现奇奇怪怪的问题。因此我在此总结一下当前使用 DisplayCAL 和 Spyder X 的完整流程及注意事项。

<!--more-->

## 软硬件准备
**校色仪。**可以说是最重要的部分。本文重点使用 Spyder5 和 Spyder X。其他校色仪按说是大同小异，只是驱动安装方式可能会不同。

**显示器。**把显示器的设置恢复为出厂默认，并且需要保证在校色正式开始前亮屏 30 分钟。

**操作系统。**本文使用 Windows。MacOS 由于系统安全规则，会难以执行外挂的校色程序。博主没有在 Linux 上校色的经验。

**软件。**需要准备下列软件：

- DisplayCAL。建议在官网 <https://displaycal.net/> 下载。点击“Get DisplayCAL”按钮后选择自己的系统下载安装。
- Argyll 2.1.1。[点此链接下载](https://akibanzu-my.sharepoint.com/:u:/g/personal/bleatingsheep_akibanzu_onmicrosoft_com/EVyJDzqmeztHk_2CwnMWOrABkfTE0PRrKNOqNAPIG8S_hg?e=OHCA3G)，必须使用特定版本。下载后解压到某个目录。
- （推荐，但不必需）Argyll 最新版。Windows 版的下载地址为 <https://www.argyllcms.com/downloadwin.html>，其他系统在 <https://www.argyllcms.com/> 向下拉找到“Downloads”。下载后解压到某个目录永久保存。

解压后内容应如图所示。

{% asset_img 1.extract-1.5x.png %}

## 安装配置 DisplayCAL
首先下载安装 DisplayCAL。

### 准备驱动
由于本文以 Spyder 系列校色仪为例，所以需要安装驱动。打开 DisplayCAL，在弹出的窗口点击“浏览”，然后选择“Argyll_V2.1.1”文件夹。

{% asset_img 2.firstlaunch-1.5x.png %}

选择 Tools -> Instrument -> Install ArgyllCMS instrument drivers，然后在弹出的窗口中选择“Download and install”，按提示操作。

{% asset_img 3.drivers1-1.5x.png %}

### 配置 Argyll（推荐）
如果你还下载了最新版本的 Argyll，那么选择 File -> Locate ArgyllCMS executables 来配置 DisplayCAL 使用最新版本。

{% asset_img 4.reload-1.5x.png %}

选择“Argyll_V2.3.1”或者最新版本所在的文件夹。

### 开启高级选项
Options -> Show advanced options

{% asset_img 5.advanced-1.5x.png %}

## 开始校色
在进行校色前，需要打开显示器预热三十分钟以上。或者当前已连续使用显示器超过三十分钟即可。

### 把校色仪贴到屏幕上
连接校色仪并打开 DisplayCAL。把 Settings 选为“Office & Web”，在“Profiling”标签下把“Profile type”选为“Single Curve + matrix”。然后点击“Calibrate & Profile”。

{% asset_img 6.profiling2-2.25x.png %}

然后把弹出的窗口拖到要校色的显示器，用“+、-”调整大小，尽量把窗口放在屏幕中心，并把校色仪贴紧到窗口中心。调整好后点击“Start measurement”。

**注意：**校色仪必须贴紧屏幕。放置校色仪前可以把屏幕向后倾斜，把盖子卡在屏幕顶部后方使其不要下滑，依靠重力使校色仪贴紧。

### 调整显示器白点色温
稍后会出现一个新窗口，点击“Start measurement”后，仪器就会开始测量色温。使用显示器的设置调整红、绿、蓝的颜色数值，直到三色平衡。同时，把亮度调整到合适的水平（不用管亮度条是否在中间）。

{% asset_img 7.interactive-2.25x.png %}

**注意：**如果你的显示器红、绿、蓝的数值默认都是 100，那调低偏高的数值即可。但是，如果默认是 50 或者其他的值，则需要尽量先调低偏高的那项数值，并且尽量让三色不要大于默认值。

调整完毕后，点击“Stop measurement”，然后点“Continue on to calibration”。

*提示：*如果 Spyder X 出现和“self-calibration offsets”有关的错误，如下图所示，可能是因为室温偏低。解决方法是用手把校色仪捂热，捂热后再校准即可。

{% asset_img 7.5.error-2x.png %}

### 安装配置文件
然后等待校色完成。Spyder5 这步需要大约一小时。完成后会出现如下窗口，显示了显示器的色域等信息，点击“Install profile”即可。

{% asset_img 8.complete-2.25x.png %}

如果要查看校色的效果，可以点击“Show profile information”，弹出的窗口包含彩色配置文件的详细信息。

## 参考资料
本文主要参考[简明屏幕校色及色彩管理](https://bbs.saraba1st.com/2b/thread-1157782-1-1.html)，根据当前实际情况，及指导[药药](https://github.com/AkiraXie)校色时出现的状况有所补充。

关于捂热校色仪的资料来自视频 <https://youtu.be/0KYiU1apa8M>。

<script src="/scripts/image-scale.js"></script>