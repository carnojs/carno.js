import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['intro', 'installation'],
    },
    {
      type: 'category',
      label: 'Core',
      items: [
        'core/overview',
        'core/controllers',
        'core/validation',
        'core/dependency-injection',
        'core/middleware',
        'core/logging',
        'core/caching',
        'core/lifecycle',
      ],
    },
    {
      type: 'category',
      label: 'ORM',
      items: [
        'orm/overview',
        'orm/entities',
        'orm/relations',
        'orm/repository',
        'orm/transactions',
        'orm/identity-map',
        'orm/ref',
        'orm/value-objects',
        'orm/migrations',
      ],
    },
    {
      type: 'category',
      label: 'Queue',
      items: ['queue/overview'],
    },
    {
      type: 'category',
      label: 'Schedule',
      items: ['schedule/overview'],
    },
    {
      type: 'category',
      label: 'Testing',
      items: ['testing/overview'],
    },
  ],
};

export default sidebars;
