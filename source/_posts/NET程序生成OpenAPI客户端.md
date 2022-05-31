---
title: .NET程序生成OpenAPI客户端
lang: zh-CN
TimeZone: Asia/Tokyo
date: 2021-04-26 18:27:42
updated: 2021-04-26 18:27:42
tags: ".NET"
---

当使用 ASP.NET Core 实现 Web API 服务时，可以用 Swagger 生成 `openapi.json` 文件及对应文档。

<!--more-->

## 在 Visual Studio 2019 中操作
### 添加服务
首先新建一个 C# 项目，右键点击项目，点“添加”、“已连接的服务”，然后按步骤添加 OpenAPI 服务即可。

### 使用
传入新建的 `HttpClient` 及 `baseUrl` 即可使用。

```
var httpClient = new HttpClient();
var api = new MyApi("https://example.com/", httpClient);
var result = await api.GetBindingAsync(parameters);
```

## 不使用 IDE
Visual Studio 实际调用了 `Microsoft.dotnet-openapi` 来生成客户端代码。[文档](https://docs.microsoft.com/en-us/aspnet/core/web-api/microsoft.dotnet-openapi?view=aspnetcore-5.0)中也提了一部分使用方法，但是十分含糊。

### 准备工作
首先确保已安装 .NET SDK。然后执行命令安装工具。

```sh
dotnet tool install --global Microsoft.dotnet-openapi
```

若要升级工具，执行下列代码。

```sh
dotnet tool update --global Microsoft.dotnet-openapi
```

### 查看帮助
```
dotnet openapi --help
```

执行此命令会显示帮助
```
OpenApi reference management tool 5.0.5+b7a2ec8c7ed6b48857af0a69688a73e8c14fe6cb

Usage: openapi [options] [command]

Options:
  -?|-h|--help  Show help information

Commands:
  add
  refresh
  remove

Use "openapi [command] --help" for more information about a command.
```

可以看到总共有三条命令，先看看 `add`。
```
dotnet openapi add --help
```

```
Usage: openapi add [options] [command]

Options:
  -p|--updateProject  The project file update.
  -?|-h|--help        Show help information

Commands:
  file
  url
```
显示出了用法，注意这时 `file` 和 `url` 都是命令，不是参数。继续想看帮助
```
dotnet openapi add url --help
```

```
Usage: openapi add url [arguments] [options]

Arguments:
  source-URL  The OpenAPI file to add. This must be a URL to a remote OpenAPI file.

Options:
  -p|--updateProject   The project file update.
  -c|--code-generator  The code generator to use. Defaults to 'NSwagCSharp'.
  --output-file        The destination to download the remote OpenAPI file to.
  -?|-h|--help         Show help information
```

这就是完整用法了。

### 添加 API 引用并调用 API
按照上面的命令，在项目目录执行以下代码。

```
dotnet openapi add url "https://api.bleatingsheep.org/swagger/v1/swagger.json" --output-file "HydrantApi.json"
```

然后项目目录中就会出现 `HydrantApi.json` 文件。运行 `dotnet build`，然后就可以使用 API 了，默认的类名是文件名+`Client`，在这个例子里，也就是 `HydrantApiClient`，使用方法同上。

### 更新
可以用 `dotnet openapi refresh` 命令更新 `json`，然后用 `dotnet build` 更新生成的代码。