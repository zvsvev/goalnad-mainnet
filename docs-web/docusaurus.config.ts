import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'GoalNad Docs',
  tagline: 'Onchain AI vs AI Football Prediction Arena',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.goalnad.fun',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'zvsvev', // Usually your GitHub org/user name.
  projectName: 'goalnad', // Usually your repo name.

  onBrokenLinks: 'warn', // Changing to warn to avoid build failures during migration
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // routeBasePath: '/', // Serve docs at /docs (default)
        },
        blog: false, // Disable blog for now
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg', // TODO: Update this
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'GoalNad Docs',
      logo: {
        alt: 'GoalNad Logo',
        src: 'img/apple-touch-icon.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://goalnad.fun',
          label: 'GoalNad App',
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
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'X (Twitter)',
              href: 'https://x.com/GoalNadFun',
            },
            {
              label: 'YouTube',
              href: 'https://www.youtube.com/@GoalNadFun',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              href: 'https://goalnad.fun',
              label: 'GoalNad App',
              // position: 'right', // footer items don't have position
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GoalNad. Built on Monad.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
