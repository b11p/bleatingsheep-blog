---
title: .NET一处奇怪的测试未运行
tags:
  - .NET
  - Visual Studio
lang: zh-CN
TimeZone: Asia/Tokyo
date: 2021-03-22 20:11:20
---

## 问题描述
最近写 [RCNB](https://github.com/rcnbapp/RCNB.csharp) 的时候遇到了奇怪的测试未运行的问题。Visual Studio 可以列出测试，但是所有测试都显示未运行。

<!--more-->

{% asset_img test-1.5x.png %}

## 解决过程
我一开始以为是被测项目 TargetFrameworks 的问题，就把别的删了，只留 netcoreapp2.1，结果还是不行。

于是我想试试命令行能不能运行测试，执行 `dotnet test` 以后产生如下输出：

{% asset_img dotnet-test-1.5x.png %}

这里显示所有的测试都 pass 了，遗憾的是，一开始我眼花了，看成“skipped: 2”，走了很多弯路。

我又给 GitHub 仓库加上 CI，结果却运行失败了，原因是没有安装对应版本的框架及 SDK。

{% asset_img github-1.5x.png %}

起初我想把 CI 的 dotnet 版本改为 2.1，但 .NET Core 2.1 无法编译 .NET Standard 2.1 的程序，于是就把测试项目和 CI 都设置到 3.1。通过 CI 以后，我发现 VS 也可以运行测试了。

{% asset_img vsok-1.5x.png %}

## 进一步调查
### 本机环境
很明显，如果没有安装对应环境，那么测试是无法运行的。在我的机器上运行 `dotnet --list-sdks` 会输出以下内容。

```
3.1.407 [C:\Program Files\dotnet\sdk]
5.0.104 [C:\Program Files\dotnet\sdk]
5.0.201 [C:\Program Files\dotnet\sdk]
```

没有安装 2.1 可能是 VS 里测试没有运行的原因。那么为什么使用命令行却可以测试呢？运行 `dotnet --list-runtimes` 看一下。

```
... 省略 ASP .NET Core runtimes
Microsoft.NETCore.App 2.1.13 [C:\Program Files\dotnet\shared\Microsoft.NETCore.App]
Microsoft.NETCore.App 2.1.26 [C:\Program Files\dotnet\shared\Microsoft.NETCore.App]
Microsoft.NETCore.App 3.1.13 [C:\Program Files\dotnet\shared\Microsoft.NETCore.App]
Microsoft.NETCore.App 5.0.4 [C:\Program Files\dotnet\shared\Microsoft.NETCore.App]
... 省略 Windows Desktop runtimes
```

可以看到我的机器上装了 2.1 的 runtime，这可能是通过命令行可以顺利运行测试的原因。

### .NET Core 的向后兼容性
3.1 的 SDK/Runtime 跑不了 2.1 的程序，这是由 .NET 的 roll forward 策略决定的。微软在 [Select the .NET version to use](https://docs.microsoft.com/en-us/dotnet/core/versions/selection#framework-dependent-apps-roll-forward) 中介绍了这个策略。

实际上，我们也可以通过配置使用较高 Major 版本的 runtime 运行较低版本的程序，例如通过创建 `global.json` 文件。[global.json overview](https://docs.microsoft.com/en-us/dotnet/core/tools/global-json?tabs=netcore3x#rollforward) 中介绍了所有的可选项。我们还可以通过 [Runtime options](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet#runtime-options) 或者 [环境变量](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet#environment-variables) 来修改此行为。

## 结论
我们可以得到这么几点结论：

- .NET SDK 可以为低版本编译
- 但主版本号不同的情况下，默认无法运行低版本测试
- 安装了正确版本的 .NET Runtime 就可以用命令行测试，但要在 Visual Studio 里测试，可能还是需要正确版本的 SDK 才行

<script src="/scripts/image-scale.js"></script>