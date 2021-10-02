---
title: String.Create的局限性
tags:
  - .NET
  - C#
lang: zh-CN
TimeZone: Asia/Tokyo
date: 2021-03-22 23:16:33
updated: 2021-03-22 23:16:33
---

## `String.Create` 介绍
.NET Core 2.1 和 .NET Standard 2.1 新增了 `Span<T>`、`Memory<T>` 等非常方便的操作内存的方式，同时增加了如 `String.Create()` 这种高效的创建字符串的方法。最近在写 [RCNB](https://github.com/rcnbapp/RCNB.csharp) 终于得以一试，结果发现了这个方法的许多局限之处。

<!--more-->

我们先看一个这个方法的定义。

```C#
public static String Create<TState>(int length, TState state, SpanAction<char, TState> action);
```

首先这是一个泛型方法，接受一个 `TState` 实例并直接传给 `action`。我们看一下 `SpanAction<char, TState>` 的定义。

```C#
public delegate void SpanAction<T, in TArg>(Span<T> span, TArg arg);
```

为什么不直接用 `Action<in T1, in T2>` 呢？因为 `Span<T>` 是 `readonly ref struct`，不能用于泛型参数。问题就出在这一点，由于它不能用在泛型参数上，给 `String.Create` 也带来了一些局限，只能用很麻烦的方式绕过。

## `String.Create` 的局限性
我给 RCNB 编码设计了这么一个 API 方法：

```C#
public static string ToRcnbString(ReadOnlySpan<byte> inArray);
```

这个方法接收一个 `ReadOnlySpan<byte>`，将基用 RCNB 编码，并返回结果字符串。在底层，我已经实现了编码方法：

```C#
private static void EncodeRcnb(Span<char> resultArray, ReadOnlySpan<byte> inArray)
{
    // implementation
}
```

我底层的方法从 `ReadOnlySpan<byte> inArray` 中读取数据，并把编码好的字符串存入 `Span<char> resultArray` 中。我本以为，.NET Core 2.1 新增的 `Span<T>` 等结构足够强大，可以让我把任何传入参数转换成这两个东西，并进行 RCNB 编码。于是我就先这么写：

```C#
public static string ToRcnbString(ReadOnlySpan<byte> inArray)
{
    int length = CalculateLength(inArray);
    return string.Create(length, inArray, (span, a) => EncodeRcnb(span, a.Span));
}
```

思路是，先计算出结果字符串的长度，再把 `inArray` 传给 `String.Create` 方法，调用 `EncodeRcnb` 方法进行编码。

但我得到一个错误。

{% asset_img cs0306-1.5x.png %}

意思是 `ReadOnlySpan<byte>` 不能被用作类型参数。还记得 `String.Create` 的定义吗？传入参数的类型是用泛型参数 `TState` 确定的，自然会受到这个限制。

## .NET 内部的解决方式
如果你用 .NET 编码或解码过 base64，你应该会发现 `System.Convert` 类有这样一个方法：

```C#
public static string ToBase64String(ReadOnlySpan<byte> bytes, Base64FormattingOptions options = Base64FormattingOptions.None);
```

这个方法也接收 `ReadOnlySpan<byte>`，返回 `String`，它是怎么实现的呢？我们来看一看 [.NET 实现源码](https://github.com/dotnet/runtime/blob/11868166a541b2746eb86b8812302bd65ecfd2f7/src/libraries/System.Private.CoreLib/src/System/Convert.cs#L2349)。

```C#
public static string ToBase64String(ReadOnlySpan<byte> bytes, Base64FormattingOptions options = Base64FormattingOptions.None)
{
    if (options < Base64FormattingOptions.None || options > Base64FormattingOptions.InsertLineBreaks)
    {
        throw new ArgumentException(SR.Format(SR.Arg_EnumIllegalVal, (int)options), nameof(options));
    }

    if (bytes.Length == 0)
    {
        return string.Empty;
    }

    bool insertLineBreaks = (options == Base64FormattingOptions.InsertLineBreaks);
    string result = string.FastAllocateString(ToBase64_CalculateAndValidateOutputLength(bytes.Length, insertLineBreaks));

    unsafe
    {
        fixed (byte* bytesPtr = &MemoryMarshal.GetReference(bytes))
        fixed (char* charsPtr = result)
        {
            int charsWritten = ConvertToBase64Array(charsPtr, bytesPtr, 0, bytes.Length, insertLineBreaks);
            Debug.Assert(result.Length == charsWritten, $"Expected {result.Length} == {charsWritten}");
        }
    }

    return result;
}
```

我们看到，.NET 实现上首先用了 `string.FastAllocateString` 快速分配字符串所需的内存，然后用 `fixed (byte* bytesPtr = &MemoryMarshal.GetReference(bytes))` 获取 `bytes` 的指针。最早实现 `ConvertToBase64Array` 时还没有 `Span<T>`，我认为转换成指针是为了复用以前的代码。问题是 `string.FastAllocateString` 是个内部方法，我无法调用。尽管有人问了 [如何调用这个方法](https://stackoverflow.com/questions/19992144/how-can-i-implement-stringbuilder-and-or-call-string-fastallocatestring)，但是是用反射强行调用的，无法保证所有版本 .NET 都是这么实现的，不太好。

## 尝试解决问题
### 转换成 `ReadOnlyMemory<T>`
我首先想到的是转换成 `ReadOnlyMemory<T>`。我知道 `Memory<T>` 及 `ReadOnlyMemory<T>` 可以转换成 `Span<T>` 和 `ReadOnlySpan<T>`，也知道反过来会出现问题。

#### `ReadOnlyMemory<T>`、`Memory<T>`、`ReadOnlySpan<T>`、`Span<T>` 的关系
首先，`ReadOnlySpan<T>`、`Span<T>` 是用 `readonly` 修饰的 [`ref struct`](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct#ref-struct)。`ref struct` 有诸多限制，而这些限制可以提升性能和代码安全性。例如，我们可以安全地编写下面的代码：

```C#
Span<byte> bytes = stackalloc byte[2000];
```

这段代码从栈上分配 2000 字节，存储在 `bytes` 中。在 C 或 C++ 中，你可能不小心把栈上指针赋值到别处，或者当成返回值返回，导致稍后可能非法访问。而在 C# 中，如果你用了 `Span<T>`，由于本身的限制，你无法轻易把它传到别处，这样就可以在不牺牲安全性的前提下提升性能。

再看 `ReadOnlyMemory<T>` 和 `Memory<T>`。它们只是普通的结构体，只是用了 `readonly` 修饰。你完全可以把它随便赋值或者返回到别处。

如果 `Span<T>` 可以随随便便转换成 `Memory<T>`，你再把它传到别处，万一那个 `Span<T>` 是栈上分配的，不就带来不安全访问了吗？所以 `Span<T>` 是不能随随便便转换成 `Memory<T>` 的，只读版本亦然。

#### .NET 中其他操作内存的方法
与上面四个 `struct` 一起到来的，还有操作这些结构体的方法，比如 [`System.Runtime.InteropServices.MemoryMarshal`](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.memorymarshal?view=net-5.0) 类。`MemoryMarshal` 类包含一些操作内存的方法，而这些方法看上去并不是那么安全。

例如 [`AsBytes`](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.memorymarshal.asbytes?view=net-5.0) 方法，可以把任意类型 `T` 的 `Span<T>` 转换成 `Span<byte>`。例如要生成随机 `uint` 时，就[可以把 `Span<uint>` 转换成 `Span<bytes>` 放置生成的随机字节](https://github.com/dotnet/runtime/blob/90010d055393074123c7e3198a6eda150624f30c/src/libraries/System.Security.Cryptography.Algorithms/src/System/Security/Cryptography/RandomNumberGenerator.cs#L135)。


此外还有 [`AsMemory`](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.interopservices.memorymarshal.asmemory?view=net-5.0) 可以把只读的 `ReadOnlyMemory<T>` 变成可写的 `Memory<T>`，同样可能带来潜在的安全问题。

除了 `MemoryMarshal`，[`System.Runtime.CompilerServices.Unsafe`](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.compilerservices.unsafe?view=net-5.0) 类也包含一些操作内存的方法。

遗憾的是，这两个类都没有把 `ReadOnlySpan<T>` 转换成 `ReadOnlyMemory<T>` 的方法。

### 借助指针
但问题还是要解决的，我不希望无意义地复制内存。

我首先想到的是把指针传入 `String.Create` 方法。我先开启了 unsafe 编译，再把方法定义前面加上 `unsafe`。

上面的 base64 编码的源码解释了如何从 `ReadOnlySpan<T>` 中提取 `T` 的指针 `T*`。[此外还有别的方法提取](https://stackoverflow.com/a/54257716)，只要保证正确地 `fixed` 了就行。由于我们需要指针和长度两个参数，我们把它形成一个元组，传入匿名方法，并在匿名方法里构造出 `ReadOnlySpan<byte>`。

```C#
public static unsafe string ToRcnbString(ReadOnlySpan<byte> inArray)
{
    int length = CalculateLength(inArray);
    fixed (byte* data = inArray)
    {
        return string.Create(length,
            (data, inArray.Length),
            (span, a) => EncodeRcnb(span, new ReadOnlySpan<byte>(a.data, a.Length)));
    }
}
```

结果我们在 `(data, inArray.Length),` 这一行的 `data` 处遇到一个错误，说：

{% asset_img pointer-1.5x.png %}

也就是说，除了 `ref struct`，指针类型也不能用作泛型参数。

然后我想到，指针也不行，那 `ReadOnlyMemory<T>` 可以传入吗，它就是普通的 `struct`。遗憾的是，尽管可以用指定的指针和长度创建 `Span<T>`，`Memory<T>` 及只读版本却没有用指针创建的构造方法。

然后我想，`ReadOnlyMemory<T>` 没有合适的构造方法，那我自己定义一个 `struct` 总可以了吧。于是就[写成了这样](https://github.com/rcnbapp/RCNB.csharp/blob/a5190d31f220e02df0aa76b0c22cde6024b8441d/RCNB/RcnbConvert.cs#L120)：

```C#
public static unsafe string ToRcnbString(ReadOnlySpan<byte> inArray)
{
    int length = CalculateLength(inArray);
    fixed (byte* data = inArray)
    {
        return string.Create(length,
            new ByteMemoryMedium(data, inArray.Length),
            (span, a) => EncodeRcnb(span, new ReadOnlySpan<byte>(a.Pointer, a.Length)));
    }
}

private unsafe readonly struct ByteMemoryMedium
{
    public ByteMemoryMedium(byte* pointer, int length)
    {
        Pointer = pointer;
        Length = length;
    }

    public byte* Pointer { get; }
    public int Length { get; }
}
```

我自己定义了一个 `unsafe struct`，接受指针和长度，并把这个结构的实例传入 `String.Create`，终于达成目标。

## 总结
.NET Core 2.1 引入的 `ref struct` 和 `Span<T>` 等类型为操作内存提供了相当程度的便利。上面没细说的 `EncodeRcnb` 方法就充分利用了这些类型。同时引入的 `String.Create` 方法可以减少创建字符串时的内存分配，尽管它用起来有很多局限。我希望 C# 未来的版本可以放宽 `ref struct` 的条件，以便 `Span<T>` 可以传入 `String.Create` 方法。~~希望 .NET 基金会不要不识抬举。~~

<script src="/scripts/image-scale.js"></script>