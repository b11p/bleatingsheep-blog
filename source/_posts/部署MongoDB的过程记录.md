---
title: 部署MongoDB的过程记录
tags:
  - MongoDB
lang: zh-CN
TimeZone: Asia/Tokyo
date: 2021-06-01 02:39:27
---

此篇文章记录我部署 MongoDB 的过程，以及我遇到的一些问题，方便以后查阅，但是仅涉及最基础的内容，价值不高，我建议你不要浪费时间阅读。

## 背景
最近开始和别的实验室合作研究，由对方提供数据。对方说传输数据最简单的方法就是，我建一个 MongoDB 实例，然后他用 `db.copyDatabase()` 把数据复制过来。

部署服务器的任务当然是交给我做了。

## 建立服务器
嗯，建立过程很简单，在 AWS 上建 EC2 实例。助理教授让我不要选东京，而是选美国东部，我刚想问是不是因为离对方近，结果他说，因为东京太贵了。

然后是选实例类型，我们商量了半天，最后选了个 ARM 类型的机器，配置很高。助教还想用 200G 系统盘，真是奢侈，我觉得 20G 都够了。最后改成了 50G。其实我觉得配置都不用那么高，刚省的钱就又扔进去了！

由于数据比较大，用 HDD 比较合适，就也挂载了一个 2TB 的 HDD，估计都挺贵的。助教说他比较熟悉 CentOS，但我比较熟悉 Ubuntu，最后选了 Ubuntu，他说如果出了问题，那他帮不了我。

装好系统以后先 `apt upgrade`，然后给 HDD 分区，格式化，挂载。本想一起配一下 swapfile，但是一看物理内存的量，得，拿来当内存盘还差不多，做锤子 swapfile。

## 安装 MongoDB
### 在 Ubuntu 服务器安装
安装过程也没什么难的，按照[文档](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)一步一步装就是了。由于我们选的是 ARM 实例，我还特意确认了一下支不支持 ARM64，是支持的。

装完了应该是最新的 4.4 版。

### 在 Mac 上安装
Mac 也有[文档](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/)。由于我已经有开发者工具和 Homebrew 了，就主要是运行了这两个命令：

```zsh
brew tap mongodb/brew
brew install mongodb-community@4.4
```

由于我不在 Mac 上跑这个服务，只用来连接，所以无需启动服务。安装完成后，运行 `mongo`，提示：

```
zsh: command not found: mongo
```

嗯……只能自己找找安装在哪儿了。

问了群友，然后在 `/usr/local/Cellar/mongodb-community@4.4/4.4.5/bin` 找到了可执行文件，就在这里执行 `./mongo` 好了。

我也考虑过手动添加到 PATH，但是看到这个带着版本号的路径，想到一升级就得重新添加，就以后再说吧。

## 测试连接
在服务器上执行 `mongo`，然后就可以操作了。但是如何直接连到数据库上呢？毕竟直接给别人 SSH 密钥可能不太好，而且他要执行的那个命令也不一定可以通过 SSH。

然后我找到了[这篇文章](https://medium.com/@Hardy2151/how-to-connect-to-your-remote-mongodb-server-68725a8e53f)。它是好用的，但是第一个指令两行粘在一起了，这导致我一开始进错了数据库，老是连接失败。都是他的错。

远程连接数据库似乎有两种命令，一种是用参数的，还有一种是用连接字符串。以前面那篇文章建立的数据库和用户为例，两种命令分别是

```
./mongo -u hardeep -p yourSecretPassword hostname/animals
./mongo "mongodb://hardeep@hostname:27017/animals"
```

## 远程管理数据库
现在可以连接数据库了，但是只能连接一个低权限的账号。为了方便我自己管理，似乎最好有办法远程连入管理账号。

按经验，在 Ubuntu 上执行 `mongo` 命令之后应该是用的类似 admin 用户之类的东西，但我不知道默认用户名是什么，于是搜索，找到 [MongoDB what are the default user and password?](https://stackoverflow.com/questions/38921414/mongodb-what-are-the-default-user-and-password)。

按照最高票回答的说法，默认是没有访问控制的，也没有什么默认用户名和密码。但那篇回答给出了创建管理员的步骤。

由于在前面，为了远程访问，我开启了访问控制，所以创建管理员之前需要先临时关闭一下。

## 添加用户并配置权限
接下来应该就是给合作者提供一个可以访问数据库的账号了。

我想参考前面的[这篇文章](https://medium.com/@Hardy2151/how-to-connect-to-your-remote-mongodb-server-68725a8e53f)，改一改用户名和数据库名就好，但是我不确定 `readWrite` 角色的权限是否足够。由于不了解 MongoDB 的具体实现，我不知道什么角色的权限高，就继续搜索。

我搜索了“mongodb grant all permissions to user”，然后在第四五个结果中找到了 [Built-In Roles](https://docs.mongodb.com/manual/reference/built-in-roles/)，但是这一堆乱七八糟的谁看得懂啊！我灵机一动，干脆直接搜索“userAdminAnyDatabase”，又找到了同一个页面的一个警告。

{% asset_img admin-warning-1.5x.png %}

大意是，如果给用户授予“admin”表的 `userAdmin` 角色，实际上是间接提供了超级用户的访问权限，因为用户可以给自己授予 `userAdminAnyDatabase`。

看到这，我就想到，诶？是不是可以在我想提供的数据库上创建一个有 `userAdmin` 角色的用户？点开看看 `userAdmin` 好了。

随便上下滚动两下，我又看到了 `dbOwner`，相当于 `readWrite`、`dbAdmin` 和 `userAdmin` 的结合。这不就是我要的权限吗！

然后我就创建了一个数据库，并且在那个数据库上创建了一个 `dbOwner` 的用户。

## 移动数据存储位置
刚想把创建好的用户和数据库发给对方，突然想起来数据还存在默认位置，在那个 50G 的 SSD 上，大概空间不够用。

于是我查了“mongodb where to store data”，发现配置文件写了，默认是 `/usr/local/var/mongodb`。我停止服务，把数据移到 HDD，修改配置文件，再启动。

启动之后，我突然想到，我应该只移数据，然后用个软链接链过去，免得改错了配置。不过既然已经改了，就那样吧，简单连了一下，似乎没有问题。

然后就把地址端口账号密码数据库发过去了。

## 总结
唔……感觉没什么好总结的。硬要说的话，就是 MongoDB 的用户和权限系统吧。默认是不需要，也没有什么用户名和密码的，连上去就是完全的权限。这时候可以建好需要的用户，授予对应权限，然后就可以用配置文件或者其他什么方式开启认证，这时候就可以给别人访问啦！比起 MySQL 等关系型数据库可以针对不同用户允许不同的 IP，MongoDB 的方式似乎更简单一点。

另外我在部署的时候也没遇到什么创建数据库的操作，不知道 `use` 的时候会不会自动创建，还是 MongoDB 是否有其他的机制。不过给他的用户应该授予过必要的权限，让他导入数据吧w。

然后就是加密，不知道 MongoDB 默认会不会给连接加密。简单搜了一下好像有[相应的配置](https://docs.mongodb.com/manual/tutorial/configure-ssl/)，但还是以后再说吧，这种东西细究起来要做的太多啦，先让对方把数据传过来要紧。

再然后，对方提到他要用 `db.copyDatabase()` 这个命令，可是[官方文档](https://docs.mongodb.com/manual/reference/method/db.copyDatabase/)说 4.0 开始已经不推荐使用这个命令了，而是要参考[mongodump](https://docs.mongodb.com/database-tools/mongodump/#std-label-mongodump-example-copy-clone-database)。不知道他用的什么版本，算了，他复制不了再说吧。

这些只是我目前的理解，不一定对。

## 补充：`resotre` 权限
发给对方后，对方说没有 `restore` 权限，要求授予。emmmm，我觉得 `dbOwner` 应该就包含所有权限了啊，为什么会恢复不了呢？不过先在他的数据库上授予一下这个权限吧。用高权限的用户登录，执行了下面的命令：

```
use database_name
db.grantRolesToUser("user_name", "restore")
```

结果提示“No role named restore@database_name”。

emmmm，难不成 [`restore`](https://docs.mongodb.com/manual/reference/built-in-roles/#mongodb-authrole-restore) 要授予在“admin”上？我在“admin”上执行相同命令，却又提示没有这个用户。

按经验判断，我在“admin”上创建同名用户的话，那应该会和之前的是两个用户，甚至密码也可以设置成不一样的。这样应该解决不了问题。那么怎么办呢？

我搜索“mongodb grant restore”，没有找到有用的结果，想了想，直接搜错误提示，“No role named restore@”，第一条 [mongodb no role named restore](https://stackoverflow.com/questions/51452733/mongodb-no-role-named-restore) 就是有用的结果。

于是我执行了 `db.grantRolesToUser("user_name",[{role: "restore", db: "admin"}])`，问题解决。

### 关于当前我的理解的总结
似乎用户必须是创建在某个数据库上，然后也可以授予关于别的数据库的权限。在“admin”上创建的用户似乎一般有一定的管理权限。某些角色，比如 `restore`，是只有“admin”才有的，其他数据库没有，也没法授予。

我怀疑这个授予在“admin”数据库的角色会有其他的权限，[官方文档](https://docs.mongodb.com/manual/reference/built-in-roles/#mongodb-authrole-restore)我也没看懂（好吧，我没仔细看，现阶段又无所谓w）。

另外，即使开启了认证，也可以直接连，然后用 [`db.auth()`](https://docs.mongodb.com/manual/reference/method/db.auth/) 进行认证，而不是必须在连接时指定数据库、用户名和密码。

P.S: 传输数据的时候我 SSH 上去看了一下，内存竟然吃了一半，CPU 也吃了一小半。助教真是英明，选的配置刚刚好x。

{% asset_img memory-1.5x.png %}

想了想，其实是我自己的服务器太丐了，内存只有 1GB 到 2GB，毕竟我没钱嘛。

## 参考资料
上文没提到，但我查到的并且可能有用的参考资料。

> [How To Configure Remote Access for MongoDB on Ubuntu 20.04](https://www.digitalocean.com/community/tutorials/how-to-configure-remote-access-for-mongodb-on-ubuntu-20-04)
>
> [Create a web API with ASP.NET Core and MongoDB](https://docs.microsoft.com/en-us/aspnet/core/tutorials/first-mongo-app?view=aspnetcore-5.0&tabs=visual-studio)
>
> [Enable Access Control](https://docs.mongodb.com/manual/tutorial/enable-authentication/)
>
> [db.grantRolesToUser()](https://docs.mongodb.com/manual/reference/method/db.grantRolesToUser/)

<script src="/scripts/image-scale.js"></script>