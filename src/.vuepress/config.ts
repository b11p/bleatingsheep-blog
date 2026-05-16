import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { plumeTheme } from 'vuepress-theme-plume'
import { imageScalePlugin } from './plugins/image-scale.js'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'bleatingsheep 的博客',
  description: '',

  bundler: viteBundler(),

  plugins: [
    imageScalePlugin(),
  ],

  theme: plumeTheme({
    hostname: 'https://bleatingsheep.org',

    profile: {
      name: 'bleatingsheep',
    },

    navbar: [
      { text: '首页', link: '/' },
      { text: '归档', link: '/archives/' },
      { text: 'Wiki', link: '/wiki/' },
      { text: '关于', link: '/about/' },
    ],

    collections: [
      {
        type: 'post',
        dir: 'posts',
        title: '博客',
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
  }),
})
