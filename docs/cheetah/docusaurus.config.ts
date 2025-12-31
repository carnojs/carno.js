import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Cheetah.js',
  tagline: 'Performance-first framework and ORM for Bun + TypeScript.',
  favicon: 'img/cheetah.png',

  future: {
    v4: true,
  },

  url: 'https://mlusca.github.io',
  baseUrl: '/cheetah.js/',

  organizationName: 'mlusca',
  projectName: 'cheetah.js',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ["en"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      }),
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/mlusca/cheetah.js/tree/main/docs/cheetah/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/cheetah.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Cheetah.js',
      logo: {
        alt: 'Cheetah.js Logo',
        src: 'img/cheetah.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/mlusca/cheetah.js',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/mlusca/cheetah.js',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Cheetah.js. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
