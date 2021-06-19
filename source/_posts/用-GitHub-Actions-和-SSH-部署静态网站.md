---
title: 用 GitHub Actions 和 SSH 部署静态网站
tags:
  - GitHub
  - Git
lang: zh-CN
TimeZone: Asia/Tokyo
date: 2021-06-20 06:23:02
---

## 前言
一直以来，我都用 Caddy 1 的 git 插件，配合 GitHub 上的 Webhook 部署静态网站。简单说就是，把 Hexo 或者 VuePress 生成的网页推到另一个分支上，用 Webhook 通知插件，然后插件拉取变更。由于 Caddy 1 已经停止维护，我想升级到 Caddy 2，但是 Caddy 2 没有官方 git 插件，第三方那个还要自己编译，我还想用 Docker 跑，也挺麻烦的。

本文的重点是，在你已经用 GitHub Actions 生成静态网站的情况下，如何用 SSH 部署到你的服务器上，并避免不必要的数据传输。

## 为什么不用现有的免费静态网站托管服务
现在有很多免费托管静态网站的服务，但它们都或多或少都存在一些我不满意的地方。当然也有我就是想 self-host 的因素在。

### GitHub Pages
不支持 IPv6，网络经常受到干扰，而且只能用于公开仓库，私有的要钱。

### Azure Static Web App
东亚地区的机房在香港，速度很快。除了不支持 IPv6 都挺好的。如果你能接受不支持 IPv6 访问，那推荐使用。

### Cloudflare + GH Pages/Azure
Cloudflare 外号 Slowflare，曾经非常 slow，现在稍好了点，也支持 IPv6。我不用的原因是，挂上 CDN 可能会影响后面的托管的服务申请 SSL 证书。另一个原因是，中国大陆会连到 Cloudflare 美国节点（至少我家的电信是），如果用 Azure 香港托管网站，相当于绕路了。

### Netlify
Netlify 支持 IPv6，而且自己有全球 CDN，各方面都非常好，除了两点。

第一，Netlify 在中国大陆会解析到新加坡节点。据我观察，解析结果包含 Amazon 和 DigitalOcean 双栈共 4 个 IP 地址。Amazon 的机房延迟不错，但 DigitalOcean 会绕美国。也就是说，速度很大程度上取决于浏览器有没有“刚好”选对地址。

第二，Netlify 的 TTFB (Time to first byte) 很长，不管什么时候都高达三百毫秒，我怀疑是故意加上去的。

## 产生想法
一开始我是用 Hexo 内置的 [Deploy](https://hexo.io/docs/one-command-deployment#Git) 指令把生成的网站推送到 git 上，后来就用 GitHub Actions 自动生成了。推送操作也从 Hexo 命令换成了 [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)。

为了解决 Caddy 2 没有支持度较好的 git 插件的问题，我一开始想自己写一个服务器处理 Webhook，但是这样太麻烦了，配置、维护都麻烦。

我也考虑过用像 [easingthemes/ssh-deploy](https://github.com/easingthemes/ssh-deploy) 这样的 Action 部署，但是由于要部署的内容都是实时生成的，哪怕没有变更，修改日期也会变，这类 Action 常用的 SFTP 和 rsync 很难很好地处理这种情况。虽然每次都完整地重传一遍问题也不大，但我还是希望每次只传输要更新的部分。

有一天我突然想到，为什么不直接让 CI 用 SSH 连到我服务器上运行 git 呢？这样不就什么都解决了吗？于是我找到了 [appleboy/ssh-action](https://github.com/appleboy/ssh-action)，简单浏览后意识到，这就是我心目中的完美方案。不如说，以前一直没想到这一点，真的很奇怪。

## 准备 git 命令
在真正开始编写 CI 流程之前，先写一个能在服务器上跑的脚本，用来拉取更改。我希望这个脚本不会传输不必要的文件，能正确处理远程分支被强制覆盖的情况，并且尽可能地节约本地空间。

假定要把网站放在服务器的 `DEPLOY_DIR` 变量所代表的目录，远程仓库是 `REPO_URL`，分支是 `BRANCH`。

### 初始化仓库
```sh
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR
git init
```

之所以不用 `git clone`，是因为在仓库已经建立的情况下不能再次 `git clone`，但是可以再次 `git init`。

### 添加远程仓库
```sh
if git remote | grep -q -P '^b11p-git-pages$'; then
    echo "Cleaning old remote"
    git remote remove b11p-git-pages
fi
git remote add -t $BRANCH b11p-git-pages $REPO_URL
```

其中 `b11p-git-pages` 是要设置的 remote 名，可以任意设置。由于这个值不必随仓库而变化，就不用环境变量了。

这一步是为了 remote 能有正确的分支和地址。由于 `git remote add` 没法覆盖之前的，我只能先检测是否已经存在这个 remote，如果存在就删掉。之后就可以保证顺利添加了。

### 拉取网站内容
```sh
git fetch -v --set-upstream b11p-git-pages --depth 1 --auto-gc
git reset --hard remotes/b11p-git-pages/$BRANCH --
```

这一步算是我调试了最长时间的，因为它涉及了我三个目标中的两个：“不会传输不必要的文件，能正确处理远程分支被强制覆盖的情况。”

我一开始用的是 `git pull --depth 1`，但是我特意做了个测试，本地往远程 push 很多提交然后服务器拉取，本地 reset 到很早的一个版本，再交很多提交然后本地 push，服务器 pull，结果就出错了：

```
> git pull --depth 1
remote: Enumerating objects: 7, done.
remote: Counting objects: 100% (7/7), done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 4 (delta 2), reused 0 (delta 0), pack-reused 0
Unpacking objects: 100% (4/4), 742 bytes | 371.00 KiB/s, done.
From https://github.com/b11p/*Hidden Repository Name*
 + *hash1*...*hash2* *Branch*        -> origin/*Branch*  (forced update)
fatal: refusing to merge unrelated histories
```

### 清理
```sh
git reflog expire --expire-unreachable=all --all --verbose
git gc --prune=all
git remote remove b11p-git-pages
```

拉取完成后，进行清理。清理主要有两部分：第一是，fetch 以后原来的提交还在本地保留着，而这些都不必要了。第二是，如果仓库是私有的，那 URL 里可能会包含 Token，清理掉更安全。

本来清理旧内容的语句只有 `git gc --prune=all`，但我发现这个命令并不能真正地把已经不需要的文件从服务器上删除，加上前一句才可以：

```
> git gc --prune=all
Enumerating objects: 10, done.
Counting objects: 100% (10/10), done.
Compressing objects: 100% (10/10), done.
Writing objects: 100% (10/10), done.
Total 10 (delta 2), reused 0 (delta 0)
> git count-objects -H -v
count: 0
size: 0 bytes
in-pack: 10
packs: 1
size-pack: 26.81 MiB
prune-packable: 0
garbage: 0
size-garbage: 0 bytes
```

这个例子说明，尽管几十 MB 的大文件在最新的提交上已经不存在了，却依然占了服务器的空间。

## 准备服务器
由于 SSH 连上之后可以任意执行命令，为了安全，需要创建一个低权限的账户，为其设置不同的 SSH 密钥。此处不再赘述。

## 配置 GitHub Actions
### Secrets
首先在 repo 设置里添加相关的 Secrets。我添加了“SSH_HOST、SSH_PORT、SSH_USERNAME、SSH_PRIVATE_KEY”四个。

### Yaml 流程
```yaml
    - name: Deploy using SSH
      uses: appleboy/ssh-action@master
      env:
        DEPLOY_DIR: /home/${{ secrets.SSH_USERNAME }}/www/*Folder*
        BRANCH: *Branch*
        TOKEN: ${{ secrets.GITHUB_TOKEN }}
        # REPO_URL: https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${GITHUB_REPOSITORY}.git
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USERNAME }}
        port: ${{ secrets.SSH_PORT }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        envs: DEPLOY_DIR,BRANCH,GITHUB_REPOSITORY,TOKEN
        script_stop: true
        script: |
          REPO_URL=https://x-access-token:${TOKEN}@github.com/${GITHUB_REPOSITORY}.git
          mkdir -p $DEPLOY_DIR
          cd $DEPLOY_DIR
          git init
          if git remote | grep -q -P '^b11p-git-pages$'; then
              echo "Cleaning old remote"
              git remote remove b11p-git-pages
          fi
          git remote add -t $BRANCH b11p-git-pages $REPO_URL
          git fetch -v --set-upstream b11p-git-pages --depth 1 --auto-gc
          git reset --hard remotes/b11p-git-pages/$BRANCH --
          git reflog expire --expire-unreachable=all --all --verbose
          git gc --prune=all
          git remote remove b11p-git-pages
```

上面是有关部署的部分，假定生成的网站已经被推送到了另一个分支。

被注释掉的一句是我踩的一个坑。在这种情况下，`${GITHUB_REPOSITORY}` 会被**原样**传入，也就是说会克隆 `https://github.com/${GITHUB_REPOSITORY}.git`，这样当然会失败。关于这个坑，可以参考 GitHub 文档中的[环境变量](https://docs.github.com/cn/actions/reference/environment-variables)和[上下文](https://docs.github.com/cn/actions/reference/context-and-expression-syntax-for-github-actions#contexts)。

## 总结
相比用 SFTP 或者 rsync 传输，SSH 执行 git 命令的主要好处就是没有改变的文件不会被传输。同时，git 仓库中可能会出现覆盖掉提交历史的情况，这时 Caddy 1 的 git 插件会工作不正常，因为它只是简单地 pull。为了这两点，我进行了反复测试。同时我也反复测试了文件更新或删除的情况，确保服务器不会保留旧文件。

由于 SSH 可以执行任意命令，这就使得此方式可以不局限于静态网站，更好地发挥 CI/CD 的威力。~~对我来说主要是省钱，毕竟我想要的效果，Azure 或者 AWS 都有相应的服务能做到，就是太贵了，用不起罢了。~~