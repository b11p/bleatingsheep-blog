---
title: C#中编译期可以检测到的类型转换失败
tags:
  - "C#"
lang: zh-CN
TimeZone: Asia/Tokyo
date: 2021-05-21 21:32:00
updated: 2021-05-21 21:32:00
---
严格来说，这算是 C# 基础知识的一部分。不知是太久远我记不清了，还是这部分本来就没注意，最近发现了，不算坑，在这里写一下。

<!--more-->

## 描述
请看下面这段代码：

```cs
var s = "s";
var d = new Dictionary<string, string>();
var disposable1 = (IDisposable)s;
var disposable2 = (IDisposable)d;
```

我们知道，不管是 `String`，还是 `Dictionary<TKey, TValue>`，都没实现 `IDisposable`，所以这两个地方都是没法转换的。可是奇怪的是，编译时，`disposable1` 那一行会报 Error，而第二个转换则是运行时才会抛出异常。

我一开始以为是编译器特殊处理了一些内置类型，准备过会儿查查文档。

## 原因
然后我又去翻了 EF Core 和 System.Linq.Async 一起使用出现冲突的问题，找到了在 EF Core 6.0 中修复这个问题的 [Pull Request](https://github.com/dotnet/efcore/pull/24145/files#diff-88b4b541856db15aa272d41dfa05e1226323f89154cdc4089bb357e4b3e6c037R57)。其中的讨论提醒了我。

上面说，虽然 `DbSet<TEntity>` 不再实现 `IAsyncEnumerable<TEntity>`，但是它的具体类一定会实现，这就是可以转换的原因。

我猛地想起刚才那个现象，像 `String`、`Int32` 这样的类型，要么是 `sealed class`，要么是 `struct`，都不可能有派生类了。这样，编译器完全可以在编译期就发现，这个转换没法进行，因为没有派生类可以再去实现接口了。

要验证也非常简单，手写下面代码。

```cs
public class MyClass { }

var myClass = new MyClass();
var disposable = (IDisposable)myClass;
```

这段代码可以通过编译。然后把类加上 `sealed`。

```cs
public sealed class MyClass { }
```

此时就无法通过编译了。

## 文档
在我查找的范围内，[文档](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/operators/type-testing-and-cast#cast-expression)中对此现象的描述比较模糊，仅说显示转换可能失败，并在运行时抛出异常。