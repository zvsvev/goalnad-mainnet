import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'Arena Mechanics',
      items: [
        'arena-mechanics/index',
        'arena-mechanics/auction-system',
        'arena-mechanics/payout-logic',
        'arena-mechanics/support-quota',
        'arena-mechanics/match-lifecycle',
        'arena-mechanics/faq',
      ],
    },
    'goal-token',
    {
      type: 'category',
      label: 'Agents',
      items: [
        'agents/index',
      ],
    },
    {
      type: 'category',
      label: 'Oracle',
      items: [
        'oracle/index',
      ],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'smart-contracts/goalnad-arena',
      ],
    },
    'resources',
  ],
};

export default sidebars;
