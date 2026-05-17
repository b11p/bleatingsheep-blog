import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { plumeTheme } from 'vuepress-theme-plume'
import { feedPlugin } from '@vuepress/plugin-feed'
import { imageScalePlugin } from './plugins/image-scale.js'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'bleatingsheep 的博客',
  description: '',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    [
      'script',
      {},
      `var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?76da56ea60f52fccc65157687c2ff51a";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s)})();`,
    ],
  ],

  bundler: viteBundler(),

  plugins: [
    {
      name: 'home-title',
      extendsPage(page) {
        if (page.path === '/') {
          page.data['title'] = ''
        } else {
          page.data['title'] = (page.data['title'] || '').replace(/ \| posts$/, '')
        }
      },
    },
    imageScalePlugin(),
    feedPlugin({
      hostname: 'https://bleatingsheep.org',
      atom: true,
      rss: false,
      json: false,
      atomOutputFilename: 'atom.xml',
      channel: {
        author: {
          name: 'bleatingsheep',
        },
      },
    }),
  ],

  theme: plumeTheme({
    hostname: 'https://bleatingsheep.org',

    profile: {
      name: 'bleatingsheep',
      avatar: "钻石头像.png",
    },

    navbar: [
      { text: '首页', link: '/' },
      { text: '归档', link: '/archives/' },
      { text: 'Wiki', link: '/wiki/' },
      { text: '关于', link: '/about/' },
      { text: '订阅', link: '/atom.xml' },
    ],

    collections: [
      {
        type: 'post',
        dir: 'posts',
        title: '',
        link: '/',
        linkPrefix: '/',
        pagination: { perPage: 10 },
        categories: false,
        tags: true,
        tagsLink: '/tags/',
        archives: true,
        archivesLink: '/archives/',
        autoFrontmatter: false,
      },
    ],

    comment: {
      provider: 'Waline',
      serverURL: 'https://comments.bleatingsheep.org/',
      pageview: false,
      login: 'disable',
      requiredMeta: ['nick', 'mail'],
      imageUploader: false,
      noRss: true,
    },
  }),
})
