---
title: 用 C# 与 .NET 中的内插字符串组装消息
tags:
  - C#
  - .NET
  - OneBot
lang: zh-CN
TimeZone: Asia/Tokyo
date: 2021-04-03 22:21:38
---

## 背景
### OneBot 及其消息格式
[OneBot](https://github.com/howmanybots/onebot) 标准是从原酷 Q 平台的 CQHTTP 插件接口修改而来的通用聊天机器人应用接口标准。

OneBot 规定了[消息类型](https://github.com/howmanybots/onebot/blob/master/v11/specs/message/README.md)的格式。

简而言之，例如我想发送一个图文混合消息，有[字符串](https://github.com/howmanybots/onebot/blob/master/v11/specs/message/string.md)和[数组](https://github.com/howmanybots/onebot/blob/master/v11/specs/message/array.md)两种方式。

#### 字符串方式
```
看看我刚拍的照片[CQ:image,file=123.jpg]
```

#### 数组方式
```json
[
    {
        "type": "text",
        "data": {
            "text": "[第一部分]"
        }
    },
    {
        "type": "image",
        "data": {
            "file": "123.jpg"
        }
    },
    {
        "type": "text",
        "data": {
            "text": "图片之后的部分，表情："
        }
    },
    {
        "type": "face",
        "data": {
            "id": "123"
        }
    }
]
```

### 如何在 SDK 中设计发送消息的接口
毫无疑问，如果直接接收字符串并按原样传送，开发者（SDK 的用户）就必须自己处理转义等复杂问题。
```C#
public async Task<MessageResponse> SendMessage(Endpoint sendTo, string message);
```

可是，如果直接接收一个数组，会给开发者构建消息带来麻烦。

一个好方法是把消息封装成一个类，这就牵扯出如何拼接或组装消息的问题。

## 组装消息的方式
### 重载 `+` 运算符
最直接的想法就是，消息应该像字符串那样可以直接用 `+` 连接。C# 中的运算符重载可以做到这一点，效果类似下面这样。

```C#
var message = Message.FromText("看看我刚拍的照片") + Message.FromImage("123.jpg");
```

效果还不错，但是屏幕上充斥着大量类名和方法名，容易眼花。

### Fluent API
还有一种设计方式是，类似 `StringBuilder`，用连续的方法调用拼接消息。

```C#
var message = new MessageBuilder().AppendText("看看我刚拍的照片").AppendImage("123.jpg").ToMessage();
```

这种方式依旧有同样的缺点。此外，直接构造消息的方法依然是必要的，这样会加重 SDK 开发者的负担。

### 内插字符串
可以利用 C# 的内插字符串实现消息组装。

```C#
using static MessageSegmentBuilder;
var message = Message.FromInterpolated($"看看我刚拍的照片{Image("123.jpg")}");
```

这种方式把一条消息中文字和图片的部分紧密地结合在一起，没有 SDK 的方法隔开，视觉上更紧密。对排版较复杂的消息效果更明显。

有人可能会问，这样不还是要用户自己处理转义吗。利用 C# 中内插字符串的特性，可以实现自动转义。

## C# 的内插字符串
内插字符串最常见的用法是直接当字符串用，例如当你用 `var` 接收时，默认的类型就是 `System.String`。

```C#
var s = $"hello{123}"; // s is System.String
```

但是，当它作为参数传入时，却可以被接收者特殊处理。例如 EF Core 查询就有 `FromSqlInterpolated` 方法，[利用插值字符串传入参数](https://docs.microsoft.com/en-us/ef/core/querying/raw-sql#passing-parameters)，由 EF Core 进行处理，可以避免 SQL 注入的问题。

查看文档，[`FromSqlInterpolated`](https://docs.microsoft.com/en-us/ef/core/querying/raw-sql#passing-parameters) 接收的是 `FormattableString` 类型的参数。那么这个 `FormattableString` 怎么用呢？

我们先看一下 `FormattableString` 的定义。

{% asset_img formattablestring-3x.png %}

可以看到，这个方法有两个属性，还有一些方法，看起来是与参数有关的。我们写个代码测试一下。

```C#
static void FormatInterpolated(FormattableString message)
{
    Console.WriteLine(message.ArgumentCount);
    Console.WriteLine(message.Format);
    Console.WriteLine(message.GetArguments().Length);
    Console.WriteLine(message.GetArgument(0).GetType());
    Console.WriteLine(message);
}

static void Main(string[] args)
{
    var a = 123.45;
    FormatInterpolated($"hell{{o{a:#.#}w}}{a}ow");
}
```

输出结果

```
2
hell{{o{0:#.#}w}}{1}ow
2
System.Double
hell{o123.5w}123.45ow
```

从这个结果可以得出这样的结论：

- `Format` 属性返回的字符串是类似于在 `String.Format` 方法中传入的格式字符串。
- `{` 和 `}` 本身在插值字符串中需要双写转义，这种双写也会出现在 `Format` 属性中。
- `ArgumentCount` 属性指示此插值字符串包含几个参数。
- `GetArguments` 方法可以获取包含参数的数组，其长度与 `ArgumentCount` 属性的值相同。
- 即使同一个变量多次出现在插值字符串中，也会作为多个参数传入，而非一个参数出现多次。

这样，在 `Message.FromInterpolated` 方法中，就可以通过接收 `FormattableString` 实例，并利用相关的属性和方法获取哪里是文本，哪里是 CQ 码。此外，还可以对其切割，以获取数组格式的消息。

## 实现内插字符串组装消息需要注意的地方
### 转义问题
内插字符串的 `Format` 属性会转义 `{` 和 `}`，当读到这两个字符时，并不一定就是属性所在的位置。例如 `{{0}}` 实际就没有用到任何属性，而是 `"{0}"` 这个字符串。

如果内部用数组格式实现消息，那只需注意上面的转义问题。如果用字符串格式实现消息，则还需要注意消息和 CQ 码中的转义。文本部分应该转义 `[`、`]` 和 `&`，CQ 码部分应该转义 `[`、`]`、`,` 和 `&`。

### 参数的类型
传入的参数类型不一定是 CQ 码，例如下面的例子。

```C#
var message = Message.FromIntropolated($"{At(10000)} Hello, 现在时间是 {DateTime.Now:HH:mm}");
```

其中第一个参数是 `At` 方法返回的值。这个 `At` 方法是 SDK 开发者定义的，应返回表示 CQ 码的一个实例。第二个参数是 .NET 自带的，用户只希望按照字符串处理。这样，在 `Message.FromIntropolated` 方法内部就应该判断每个参数是否是 CQ 码，然后分别进行不同的处理。

<script src="/scripts/image-scale.js"></script>