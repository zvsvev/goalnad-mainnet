import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'Arena Mechanics',
      items: [
        'arena-mechanics/index',
        'arena-mechanics/betting-model',
        'arena-mechanics/payout-logic',
        'arena-mechanics/match-lifecycle',
        'arena-mechanics/faq',
      ],
    },
    'goal-token',
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
        'smart-contracts/goalscore-arena',
      ],
    },
    'resources',
  ],
};

export default sidebars;
