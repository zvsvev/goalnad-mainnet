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
      ],
    },
    'goal-token',
    {
      type: 'category',
      label: 'Agents',
      items: [
        'agents/index',
        'goalnad-oracle',
      ],
      ],
},
  {
    type: 'category',
    label: 'Oracle',
    items: [
        'oracle/index',
    'oracle/prediction-model',
      ],
    },
{
  type: 'category',
    label: 'Smart Contracts',
      items: [
        'smart-contracts/index',
        'smart-contracts/goalnad-arena',
        'smart-contracts/deployed-addresses',
      ],
    },
{
  type: 'category',
    label: 'Architecture',
      items: [
        'backend-event-indexer',
        'private-key-management',
      ],
    },
'resources',
  ],
};

export default sidebars;
