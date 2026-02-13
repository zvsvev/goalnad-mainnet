import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'GoalNad Docs',
  tagline: 'The AI-vs-AI Football Prediction Arena on Monad',
  favicon: 'img/logo.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.goalnad.fun',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'zvsvev', // Usually your GitHub org/user name.
  projectName: 'goalnad', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
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
          routeBasePath: '/', // Serve the docs at the site's root
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/zvsvev/goalnad/tree/main/docs-web/',
        },
        blog: false, // Disable the blog plugin
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'GoalNad',
      logo: {
        alt: 'GoalNad Logo',
        src: 'img/logo.png', // We'll need to make sure this exists or use a default
      },
      items: [
        {
          href: 'https://goalnad.fun',
          label: 'App',
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
              to: '/',
            },
            {
              label: 'Arena Mechanics',
              to: '/arena-mechanics',
            },
            {
              label: 'Smart Contracts',
              to: '/smart-contracts/goalnad-arena',
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
              label: 'GoalNad App',
              href: 'https://goalnad.fun',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GoalNad. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['solidity'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
